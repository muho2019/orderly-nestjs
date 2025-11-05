import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { buildOrdersServiceUrl } from '../orders/service-config';

function buildAnonymousHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Correlation-Id': randomUUID()
  };

  const anonymousUserId =
    process.env.ORDERS_SERVICE_ANONYMOUS_USER_ID && process.env.ORDERS_SERVICE_ANONYMOUS_USER_ID.trim().length > 0
      ? process.env.ORDERS_SERVICE_ANONYMOUS_USER_ID.trim()
      : 'anonymous-web-user';

  headers['X-User-Id'] = anonymousUserId;

  const anonymousEmail =
    process.env.ORDERS_SERVICE_ANONYMOUS_USER_EMAIL && process.env.ORDERS_SERVICE_ANONYMOUS_USER_EMAIL.trim().length > 0
      ? process.env.ORDERS_SERVICE_ANONYMOUS_USER_EMAIL.trim()
      : undefined;

  if (anonymousEmail) {
    headers['X-User-Email'] = anonymousEmail;
  }

  return headers;
}

export async function GET(): Promise<NextResponse> {
  try {
    const response = await fetch(buildOrdersServiceUrl('/products'), {
      method: 'GET',
      headers: buildAnonymousHeaders(),
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
