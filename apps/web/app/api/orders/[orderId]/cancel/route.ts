import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { buildOrdersServiceUrl, extractUserFromToken } from '../../service-config';

type CancelRouteContext = { params: Promise<{ orderId: string }> };

export async function PATCH(
  request: NextRequest,
  context: CancelRouteContext
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

    let reason: string | undefined;
    try {
      const payload = await request.json();
      if (payload && typeof payload === 'object' && 'reason' in payload) {
        const value = (payload as { reason?: unknown }).reason;
        if (typeof value === 'string' && value.trim().length > 0) {
          reason = value.trim();
        }
      }
    } catch {
      // ignore body parse errors and treat as empty payload
    }

    const correlationId = randomUUID();

    const upstreamResponse = await fetch(buildOrdersServiceUrl(`/${orderId}/cancel`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.sub,
        ...(user.email ? { 'X-User-Email': user.email } : {}),
        'X-Correlation-Id': correlationId,
        Authorization: authHeader
      },
      body: JSON.stringify(reason ? { reason } : {})
    });

    const upstreamBody = await upstreamResponse
      .json()
      .catch(() => ({ message: '주문을 취소할 수 없습니다.' }));

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { message: upstreamBody?.message ?? '주문 취소 중 오류가 발생했습니다.' },
        { status: upstreamResponse.status }
      );
    }

    return NextResponse.json(upstreamBody, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '주문을 취소할 수 없습니다.';
    const status =
      message === '로그인이 필요합니다.' ? 401 : message.includes('주문 ID') ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
