import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { buildGatewayUrl } from '../gateway';

const PRODUCTS_GATEWAY_URL = buildGatewayUrl('/orders/products');

function getOptionalAuthorization(request: NextRequest): string | undefined {
  const header = request.headers.get('authorization');
  if (!header || header.trim().length === 0) {
    return undefined;
  }

  return header;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authorization = getOptionalAuthorization(request);

    const response = await fetch(PRODUCTS_GATEWAY_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Correlation-Id': randomUUID(),
        ...(authorization ? { Authorization: authorization } : {})
      },
      cache: 'no-store'
    });

    const data = await response
      .json()
      .catch(() => ({ message: '상품 정보를 불러올 수 없습니다.' }));

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
