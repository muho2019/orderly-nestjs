import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { buildGatewayUrl } from '../../../gateway';

type CancelRouteContext = { params: Promise<{ orderId: string }> };

function getAuthorization(request: NextRequest): string {
  const header = request.headers.get('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    throw new Error('AUTH_REQUIRED');
  }

  return header;
}

export async function PATCH(
  request: NextRequest,
  context: CancelRouteContext
): Promise<NextResponse> {
  try {
    const { orderId } = await context.params;
    if (!orderId || orderId.trim().length === 0) {
      return NextResponse.json({ message: '유효한 주문 ID가 필요합니다.' }, { status: 400 });
    }

    const authorization = getAuthorization(request);

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

    const upstreamResponse = await fetch(buildGatewayUrl(`/orders/${orderId}/cancel`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
        'X-Correlation-Id': correlationId
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
    if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    }

    const message =
      error instanceof Error ? error.message : '주문을 취소할 수 없습니다.';
    const status = message.includes('주문 ID') ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
