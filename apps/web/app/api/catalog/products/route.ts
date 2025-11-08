import { NextRequest, NextResponse } from 'next/server';
import { buildGatewayUrl } from '../../gateway';

const CATALOG_GATEWAY_URL = buildGatewayUrl('/catalog/products');

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const response = await fetch(CATALOG_GATEWAY_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
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
