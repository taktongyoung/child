import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 선생님 조회
    const teacher = await prisma.teacher.findUnique({
      where: { username: username },
      select: {
        id: true,
        name: true,
        username: true,
        password: true,
        className: true,
        phone: true,
        email: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, teacher.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        teacherId: teacher.id,
        username: teacher.username,
        name: teacher.name,
        className: teacher.className,
      },
      JWT_SECRET,
      { expiresIn: '7d' } // 7일간 유효
    );

    // 비밀번호 제외한 선생님 정보 반환
    const { password: _, ...teacherData } = teacher;

    const response = NextResponse.json({
      success: true,
      teacher: teacherData,
      token,
    });

    // 쿠키에 토큰 저장
    response.cookies.set('teacher-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('선생님 로그인 오류:', error);
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
