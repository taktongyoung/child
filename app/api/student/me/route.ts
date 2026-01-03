import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function GET(request: NextRequest) {
  try {
    // 쿠키에서 토큰 가져오기
    const token = request.cookies.get('student-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 토큰 검증
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    // 학생 정보 조회
    const student = await prisma.student.findUnique({
      where: { id: decoded.studentId },
      select: {
        id: true,
        name: true,
        username: true,
        className: true,
        teacher: true,
        phone: true,
        address: true,
        photoUrl: true,
        talents: true,
        birthDate: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: '학생 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      student,
    });
  } catch (error) {
    console.error('학생 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '학생 정보를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
