import { NextRequest, NextResponse } from 'next/server';

const AUTH_PROFILE_URL = process.env.AUTH_PROFILE_URL ?? 'http://localhost:3000/v1/auth/me';

function ensureAuthorization(request: NextRequest): string {
  const header = request.headers.get('authorization');
  if (!header) {
    throw new Error('인증 정보가 없습니다. 다시 로그인해주세요.');
  }
  return header;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authorization = ensureAuthorization(request);
    const response = await fetch(AUTH_PROFILE_URL, {
      headers: {
        Authorization: authorization
      }
    });

    const data = await response
      .json()
      .catch(() => ({ message: '프로필 정보를 불러오지 못했습니다.' }));

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? '프로필 조회에 실패했습니다.' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '요청을 처리할 수 없습니다.';
    return NextResponse.json({ message }, { status: message.includes('인증') ? 401 : 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const authorization = ensureAuthorization(request);
    const payload = await request.json();

    const response = await fetch(AUTH_PROFILE_URL, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization
      },
      body: JSON.stringify(payload)
    });

    const data = await response
      .json()
      .catch(() => ({ message: '프로필 수정 요청 처리 중 오류가 발생했습니다.' }));

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? '프로필 수정에 실패했습니다.' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '요청을 처리할 수 없습니다.';
    return NextResponse.json({ message }, { status: message.includes('인증') ? 401 : 500 });
  }
}
