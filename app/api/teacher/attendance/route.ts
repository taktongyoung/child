import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// 특정 날짜의 담당 학생 출석 정보 조회
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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: '날짜 매개변수가 필요합니다.' },
        { status: 400 }
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

    // 담당 학생들의 출석 정보 조회
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: new Date(date),
        student: {
          teacher: teacher.name,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // studentId를 키로 하는 객체로 변환
    const attendanceMap: { [key: number]: string } = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.studentId] = record.status;
    });

    return NextResponse.json({
      success: true,
      attendanceMap,
    });
  } catch (error) {
    console.error('출석 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '출석 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
