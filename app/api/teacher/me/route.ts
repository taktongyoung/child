import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('teacher-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: decoded.teacherId },
      select: {
        id: true,
        name: true,
        username: true,
        className: true,
        phone: true,
        email: true,
        talents: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: '선생님 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      teacher,
    });
  } catch (error) {
    console.error('선생님 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
