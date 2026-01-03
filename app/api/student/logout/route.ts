import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: '로그아웃되었습니다.',
  });

  // 쿠키 삭제
  response.cookies.delete('student-token');

  return response;
}
