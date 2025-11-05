import { NextResponse } from 'next/server';

const ORDERS_BASE_URL = process.env.ORDERS_SERVICE_BASE_URL ?? 'http://localhost:3000/v1/orders';

export async function GET(): Promise<NextResponse> {
  try {
    const response = await fetch(`${ORDERS_BASE_URL}/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
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
