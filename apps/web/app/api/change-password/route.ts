import { NextRequest, NextResponse } from 'next/server';
import { buildGatewayUrl } from '../gateway';

const AUTH_CHANGE_PASSWORD_URL = buildGatewayUrl('/auth/change-password');

function ensureAuthorization(request: NextRequest): string {
  const header = request.headers.get('authorization');
  if (!header) {
    throw new Error('인증 정보가 없습니다. 다시 로그인해주세요.');
  }
  return header;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authorization = ensureAuthorization(request);
    const payload = await request.json();

    const response = await fetch(AUTH_CHANGE_PASSWORD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = await response
        .json()
        .catch(() => ({ message: '비밀번호 변경에 실패했습니다.' }));
      return NextResponse.json(
        { message: data?.message ?? '비밀번호 변경에 실패했습니다.' },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: '비밀번호가 변경되었습니다.' }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '요청을 처리할 수 없습니다.';
    return NextResponse.json({ message }, { status: message.includes('인증') ? 401 : 500 });
  }
}
