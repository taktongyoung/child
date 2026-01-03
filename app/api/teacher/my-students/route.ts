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
    });

    if (!teacher) {
      return NextResponse.json(
        { error: '선생님 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 담당 학생 목록 조회 (선생님 이름 기준)
    const students = await prisma.student.findMany({
      where: {
        teacher: teacher.name,
      },
      select: {
        id: true,
        name: true,
        username: true,
        birthDate: true,
        birthYear: true,
        className: true,
        teacher: true,
        phone: true,
        address: true,
        photoUrl: true,
        notes: true,
        talents: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      students,
      className: teacher.className,
    });
  } catch (error) {
    console.error('학생 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '학생 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
