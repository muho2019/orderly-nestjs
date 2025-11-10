import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { buildGatewayUrl } from '../../gateway';

const CATALOG_GATEWAY_URL = buildGatewayUrl('/catalog/products');

function getOptionalAuthorization(request: NextRequest): string | undefined {
  const header = request.headers.get('authorization');
  if (!header || header.trim().length === 0) {
    return undefined;
  }

  return header;
}

function getRequiredAuthorization(request: NextRequest): string {
  const header = request.headers.get('authorization');
  if (!header || header.trim().length === 0) {
    throw new Error('AUTH_REQUIRED');
  }

  return header;
}

function normalizePrice(raw: unknown): { amount: number; currency: string } {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('가격 정보가 올바르지 않습니다.');
  }

  const { amount, currency } = raw as Record<string, unknown>;
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new Error('가격 금액이 올바르지 않습니다.');
  }

  if (typeof currency !== 'string' || currency.trim().length === 0) {
    throw new Error('통화 코드를 입력해주세요.');
  }

  return {
    amount,
    currency: currency.trim().toUpperCase()
  };
}

function normalizeCreatePayload(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('잘못된 요청입니다.');
  }

  const { name, description, price, sku, thumbnailUrl } = raw as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('상품 이름을 입력해주세요.');
  }

  return {
    name: name.trim(),
    description: typeof description === 'string' && description.trim().length > 0 ? description.trim() : undefined,
    price: normalizePrice(price),
    sku: typeof sku === 'string' && sku.trim().length > 0 ? sku.trim() : undefined,
    thumbnailUrl:
      typeof thumbnailUrl === 'string' && thumbnailUrl.trim().length > 0 ? thumbnailUrl.trim() : undefined
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authorization = getOptionalAuthorization(request);
    const response = await fetch(CATALOG_GATEWAY_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(authorization ? { Authorization: authorization } : {})
      },
      cache: 'no-store'
    });

    const data = await response
      .json()
      .catch(() => ({ message: '상품 목록을 가져오지 못했습니다.' }));

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? '상품 목록을 가져오지 못했습니다.' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '상품 목록을 가져오는 중 오류가 발생했습니다.';
    return NextResponse.json({ message }, { status: 502 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authorization = getRequiredAuthorization(request);
    const payload = normalizeCreatePayload(await request.json());
    const correlationId = randomUUID();

    const response = await fetch(CATALOG_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
        'X-Correlation-Id': correlationId
      },
      body: JSON.stringify(payload)
    });

    const data = await response
      .json()
      .catch(() => ({ message: '상품을 등록하지 못했습니다.' }));

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? '상품 등록 중 오류가 발생했습니다.' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ message: '관리자 로그인이 필요합니다.' }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : '상품을 등록할 수 없습니다.';
    const status = message === '잘못된 요청입니다.' ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
