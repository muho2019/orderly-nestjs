import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { buildGatewayUrl } from '../../../../gateway';

const ALLOWED_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'DISCONTINUED'] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

type RouteParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>
  | undefined;

function ensureAuthorization(request: NextRequest): string {
  const header = request.headers.get('authorization');
  if (!header || header.trim().length === 0) {
    throw new Error('AUTH_REQUIRED');
  }
  return header;
}

async function resolveParams(params: RouteParams): Promise<Record<string, string | string[] | undefined>> {
  if (!params) {
    return {};
  }

  if (typeof (params as Promise<unknown>).then === 'function') {
    return ((await params) ?? {}) as Record<string, string | string[] | undefined>;
  }

  return params;
}

async function normalizeProductId(params: RouteParams): Promise<string> {
  const resolved = await resolveParams(params);
  const raw = resolved.productId;
  const productId = Array.isArray(raw) ? raw[0] : raw;

  if (!productId || typeof productId !== 'string' || productId.trim().length === 0) {
    throw new Error('존재하지 않는 상품입니다.');
  }

  return productId.trim();
}

function normalizeStatusPayload(raw: unknown): { status: AllowedStatus; reason?: string } {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('잘못된 요청입니다.');
  }

  const { status, reason } = raw as Record<string, unknown>;

  if (typeof status !== 'string' || !ALLOWED_STATUSES.includes(status as AllowedStatus)) {
    throw new Error('지원하지 않는 상태 값입니다.');
  }

  return {
    status: status as AllowedStatus,
    reason: typeof reason === 'string' && reason.trim().length > 0 ? reason.trim() : undefined
  };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Record<string, string | string[] | undefined>> }
): Promise<NextResponse> {
  try {
    const authorization = ensureAuthorization(request);
    const productId = await normalizeProductId(context.params);
    const payload = normalizeStatusPayload(await request.json());
    const correlationId = randomUUID();

    const response = await fetch(buildGatewayUrl(`/catalog/products/${productId}/status`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
        'X-Correlation-Id': correlationId
      },
      body: JSON.stringify(payload)
    });

    const data = await response
      .json()
      .catch(() => ({ message: '상품 상태를 변경하지 못했습니다.' }));

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? '상품 상태 변경 중 오류가 발생했습니다.' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ message: '관리자 로그인이 필요합니다.' }, { status: 401 });
    }

    const message =
      error instanceof Error ? error.message : '상품 상태를 변경할 수 없습니다.';
    const status = message === '지원하지 않는 상태 값입니다.' ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
