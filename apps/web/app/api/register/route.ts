import { NextRequest, NextResponse } from 'next/server';
import { buildGatewayUrl } from '../gateway';

const AUTH_SERVICE_URL = buildGatewayUrl('/auth/register');

type RegisterPayload = {
  email: string;
  password: string;
  name?: string | null;
};

function normalizePayload(raw: unknown): RegisterPayload {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('잘못된 요청입니다.');
  }

  const { email, password, name } = raw as Record<string, unknown>;

  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new Error('잘못된 요청입니다.');
  }

  return {
    email: email.trim(),
    password: password.trim(),
    name: typeof name === 'string' ? name.trim() : undefined
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

    if (payload.password.length < 8) {
      return NextResponse.json(
        { message: '비밀번호는 8자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    const response = await fetch(AUTH_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response
      .json()
      .catch(() => ({ message: '등록 요청 처리 중 오류가 발생했습니다.' }));

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? '등록에 실패했습니다.' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '요청을 처리할 수 없습니다.';
    return NextResponse.json(
      { message },
      { status: message === '잘못된 요청입니다.' ? 400 : 502 }
    );
  }
}
