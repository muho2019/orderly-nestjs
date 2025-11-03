import { NextResponse } from 'next/server';

export async function POST(): Promise<NextResponse> {
  // 서버 상태 없이 JWT를 사용하므로 백엔드 호출 없이 클라이언트 측에서 토큰 제거.
  return NextResponse.json({ message: '로그아웃 되었습니다.' }, { status: 200 });
}
