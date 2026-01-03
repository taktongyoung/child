import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authCookie = request.cookies.get('auth')
    
    if (authCookie && authCookie.value === 'authenticated') {
      return NextResponse.json({ authenticated: true })
    } else {
      return NextResponse.json({ authenticated: false })
    }
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 