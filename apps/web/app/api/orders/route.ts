import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { buildGatewayUrl } from '../gateway';

const ORDERS_GATEWAY_URL = buildGatewayUrl('/orders');

interface OrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: {
    amount: number;
    currency: string;
  };
}

interface OrderPayload {
  items: OrderItemInput[];
  note?: string;
}

function normalizeOrderInput(raw: unknown): OrderPayload {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('잘못된 요청입니다.');
  }

  const { items, note } = raw as Record<string, unknown>;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('상품을 한 개 이상 선택해주세요.');
  }

  const normalizedItems = items.map((item) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error('잘못된 상품 정보입니다.');
    }

    const { productId, quantity, unitPrice } = item as Record<string, unknown>;

    if (typeof productId !== 'string' || productId.trim().length === 0) {
      throw new Error('상품 ID가 올바르지 않습니다.');
    }

    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('수량은 1 이상의 정수여야 합니다.');
    }

    if (
      typeof unitPrice !== 'object' ||
      unitPrice === null ||
      typeof (unitPrice as { amount?: unknown }).amount !== 'number' ||
      typeof (unitPrice as { currency?: unknown }).currency !== 'string'
    ) {
      throw new Error('가격 정보가 올바르지 않습니다.');
    }

    return {
      productId: productId.trim(),
      quantity,
      unitPrice: {
        amount: (unitPrice as { amount: number }).amount,
        currency: (unitPrice as { currency: string }).currency
      }
    };
  });

  return {
    items: normalizedItems,
    note: typeof note === 'string' && note.trim().length > 0 ? note.trim() : undefined
  };
}

function getAuthorization(request: NextRequest): string {
  const header = request.headers.get('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    throw new Error('AUTH_REQUIRED');
  }

  return header;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authorization = getAuthorization(request);
    const correlationId = randomUUID();

    const upstreamResponse = await fetch(ORDERS_GATEWAY_URL, {
      headers: {
        Authorization: authorization,
        'X-Correlation-Id': correlationId
      },
      cache: 'no-store'
    });

    const upstreamBody = await upstreamResponse
      .json()
      .catch(() => ({ message: '주문 목록을 불러오지 못했습니다.' }));

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { message: upstreamBody?.message ?? '주문 목록을 가져올 수 없습니다.' },
        { status: upstreamResponse.status }
      );
    }

    return NextResponse.json(upstreamBody, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    }

    const message =
      error instanceof Error ? error.message : '주문 목록을 가져올 수 없습니다.';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authorization = getAuthorization(request);
    const payload = normalizeOrderInput(await request.json());

    const clientReference = `web-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const correlationId = randomUUID();

    const upstreamResponse = await fetch(ORDERS_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
        'X-Correlation-Id': correlationId
      },
      body: JSON.stringify({
        items: payload.items,
        note: payload.note,
        clientReference
      })
    });

    const upstreamBody = await upstreamResponse
      .json()
      .catch(() => ({ message: '주문 생성에 실패했습니다.' }));

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { message: upstreamBody?.message ?? '주문 생성 중 오류가 발생했습니다.' },
        { status: upstreamResponse.status }
      );
    }

    return NextResponse.json(upstreamBody, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    }

    const message =
      error instanceof Error ? error.message : '주문을 생성할 수 없습니다.';
    const status = message === '잘못된 요청입니다.' ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
