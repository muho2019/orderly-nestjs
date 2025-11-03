import { NextRequest, NextResponse } from 'next/server';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3000/v1/auth/register';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const payload = await request.json();

  try {
    const response = await fetch(AUTH_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const problem = await response
        .json()
        .catch(() => ({ message: '등록에 실패했습니다.' }));
      return NextResponse.json(problem, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Failed to register user', error);
    return NextResponse.json(
      { message: '인증 서비스에 연결할 수 없습니다. 서버 상태를 확인해주세요.' },
      { status: 502 }
    );
  }
}
