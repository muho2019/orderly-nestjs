import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { buildGatewayUrl } from '../../../gateway';

function ensureAuthorization(request: NextRequest): string {
  const header = request.headers.get('authorization');
  if (!header || header.trim().length === 0) {
    throw new Error('AUTH_REQUIRED');
  }
  return header;
}

type RouteParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>
  | undefined;

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
  const value = resolved.productId;
  const id = Array.isArray(value) ? value[0] : value;

  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('존재하지 않는 상품입니다.');
  }

  return id.trim();
}

function normalizeUpdatePayload(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('잘못된 요청입니다.');
  }

  const { name, description, price, sku, thumbnailUrl } = raw as Record<string, unknown>;
  const payload: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('상품 이름을 입력해주세요.');
    }
    payload.name = name.trim();
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      throw new Error('설명은 문자열이어야 합니다.');
    }
    payload.description = description.trim().length > 0 ? description.trim() : '';
  }

  if (price !== undefined) {
    if (typeof price !== 'object' || price === null) {
      throw new Error('가격 정보가 올바르지 않습니다.');
    }
    const { amount, currency } = price as Record<string, unknown>;
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      throw new Error('가격 금액이 올바르지 않습니다.');
    }
    if (typeof currency !== 'string' || currency.trim().length === 0) {
      throw new Error('통화 코드를 입력해주세요.');
    }
    payload.price = {
      amount,
      currency: currency.trim().toUpperCase()
    };
  }

  if (sku !== undefined) {
    if (typeof sku !== 'string') {
      throw new Error('SKU는 문자열이어야 합니다.');
    }
    payload.sku = sku.trim().length > 0 ? sku.trim() : '';
  }

  if (thumbnailUrl !== undefined) {
    if (typeof thumbnailUrl !== 'string') {
      throw new Error('썸네일 URL은 문자열이어야 합니다.');
    }
    payload.thumbnailUrl = thumbnailUrl.trim().length > 0 ? thumbnailUrl.trim() : '';
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('변경할 항목을 입력해주세요.');
  }

  return payload;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Record<string, string | string[] | undefined>> }
): Promise<NextResponse> {
  try {
    const authorization = ensureAuthorization(request);
    const productId = await normalizeProductId(context.params);
    const payload = normalizeUpdatePayload(await request.json());
    const correlationId = randomUUID();

    const response = await fetch(buildGatewayUrl(`/catalog/products/${productId}`), {
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
      .catch(() => ({ message: '상품을 수정하지 못했습니다.' }));

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? '상품 수정 중 오류가 발생했습니다.' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ message: '관리자 로그인이 필요합니다.' }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : '상품을 수정할 수 없습니다.';
    const status =
      message === '존재하지 않는 상품입니다.' || message === '변경할 항목을 입력해주세요.' ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
