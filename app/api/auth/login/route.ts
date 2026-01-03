import { NextRequest, NextResponse } from 'next/server'

const INITIAL_PASSWORD = 'youth!!'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (password === INITIAL_PASSWORD) {
      // 세션 쿠키 설정 (24시간 유효)
      const response = NextResponse.json({ success: true })
      response.cookies.set('auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 // 24시간
      })
      return response
    } else {
      return NextResponse.json(
        { success: false, message: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 