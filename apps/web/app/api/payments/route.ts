import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { buildGatewayUrl } from '../gateway';

const PAYMENTS_GATEWAY_URL = buildGatewayUrl('/payments');

interface PaymentPayload {
  orderId: string;
  amount: {
    amount: number;
    currency: string;
  };
}

function ensureAuthorization(request: NextRequest): string {
  const header = request.headers.get('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    throw new Error('AUTH_REQUIRED');
  }
  return header;
}

function normalizePayload(raw: unknown): PaymentPayload {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('잘못된 결제 요청입니다.');
  }

  const { orderId, amount } = raw as Record<string, unknown>;

  if (typeof orderId !== 'string' || !orderId.trim()) {
    throw new Error('유효한 주문 ID가 필요합니다.');
  }

  if (
    typeof amount !== 'object' ||
    amount === null ||
    typeof (amount as { amount?: unknown }).amount !== 'number' ||
    typeof (amount as { currency?: unknown }).currency !== 'string'
  ) {
    throw new Error('유효한 결제 금액 정보가 필요합니다.');
  }

  return {
    orderId: orderId.trim(),
    amount: {
      amount: (amount as { amount: number }).amount,
      currency: (amount as { currency: string }).currency
    }
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authorization = ensureAuthorization(request);
    const payload = normalizePayload(await request.json());

    const response = await fetch(PAYMENTS_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
        'X-Correlation-Id': randomUUID()
      },
      body: JSON.stringify(payload)
    });

    const data = await response
      .json()
      .catch(() => ({ message: '결제 요청 처리 중 오류가 발생했습니다.' }));

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? '결제를 진행할 수 없습니다.' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    }

    const message =
      error instanceof Error ? error.message : '결제를 진행할 수 없습니다.';
    const status = message.includes('주문 ID') ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
