import { NextRequest, NextResponse } from 'next/server';
import { buildGatewayUrl } from '../gateway';

const AUTH_LOGIN_URL = buildGatewayUrl('/auth/login');

type LoginPayload = {
  email: string;
  password: string;
};

function normalizePayload(raw: unknown): LoginPayload {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('잘못된 요청입니다.');
  }

  const { email, password } = raw as Record<string, unknown>;

  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new Error('잘못된 요청입니다.');
  }

  return {
    email: email.trim(),
    password: password.trim()
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = normalizePayload(await request.json());

    if (!payload.email || !payload.password) {
      return NextResponse.json(
        { message: '이메일과 비밀번호를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    const response = await fetch(AUTH_LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response
      .json()
      .catch(() => ({ message: '로그인 요청 처리 중 오류가 발생했습니다.' }));

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? '로그인에 실패했습니다.' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '요청을 처리할 수 없습니다.';
    return NextResponse.json(
      { message },
      { status: message === '잘못된 요청입니다.' ? 400 : 500 }
    );
  }
}
