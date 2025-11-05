import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { JwtClaims } from '../../../../src/utils/jwt';
import { decodeJwt } from '../../../../src/utils/jwt';
import { buildOrdersServiceUrl } from '../service-config';

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

type OrderRouteContext = { params: Promise<{ orderId: string }> };

export async function GET(
  request: NextRequest,
  context: OrderRouteContext
): Promise<NextResponse> {
  try {
    const { orderId } = await context.params;
    if (!orderId || orderId.trim().length === 0) {
      return NextResponse.json({ message: '유효한 주문 ID가 필요합니다.' }, { status: 400 });
    }

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

    const upstreamResponse = await fetch(buildOrdersServiceUrl(`/${orderId}`), {
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
      .catch(() => ({ message: '주문 상세를 불러오지 못했습니다.' }));

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { message: upstreamBody?.message ?? '주문을 조회할 수 없습니다.' },
        { status: upstreamResponse.status }
      );
    }

    return NextResponse.json(upstreamBody, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '주문을 조회할 수 없습니다.';
    const status =
      message === '로그인이 필요합니다.' ? 401 : message.includes('주문 ID') ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
