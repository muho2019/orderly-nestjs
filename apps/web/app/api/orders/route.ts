import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { JwtClaims } from '../../../src/utils/jwt';
import { decodeJwt } from '../../../src/utils/jwt';
import { buildOrdersServiceUrl } from './service-config';

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

function extractUserFromToken(token: string): { sub: string; email?: string } {
  let claims: JwtClaims;
  try {
    claims = decodeJwt(token);
  } catch {
    throw new Error('JWT 토큰을 해석할 수 없습니다.');
  }

  const sub = claims.sub;
  if (typeof sub !== 'string' || sub.trim().length === 0) {
    throw new Error('JWT에 사용자 ID가 포함되어 있지 않습니다.');
  }

  const email = typeof claims.email === 'string' ? claims.email : undefined;
  return { sub: sub.trim(), email };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    }

    const user = extractUserFromToken(token);
    const correlationId = randomUUID();

    const upstreamResponse = await fetch(buildOrdersServiceUrl('/'), {
      headers: {
        'X-User-Id': user.sub,
        ...(user.email ? { 'X-User-Email': user.email } : {}),
        'X-Correlation-Id': correlationId,
        Authorization: authHeader
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
    const message =
      error instanceof Error ? error.message : '주문 목록을 가져올 수 없습니다.';
    return NextResponse.json(
      { message },
      { status: message === '로그인이 필요합니다.' ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    }

    const user = extractUserFromToken(token);
    const payload = normalizeOrderInput(await request.json());

    const clientReference = `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const correlationId = randomUUID();

    const upstreamResponse = await fetch(buildOrdersServiceUrl('/'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.sub,
        ...(user.email ? { 'X-User-Email': user.email } : {}),
        'X-Correlation-Id': correlationId,
        Authorization: `Bearer ${token}`
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
    const message =
      error instanceof Error ? error.message : '주문을 생성할 수 없습니다.';
    const status = message === '잘못된 요청입니다.' ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
