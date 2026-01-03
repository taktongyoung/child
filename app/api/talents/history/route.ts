import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 달란트 히스토리 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: '학생 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const parsedStudentId = parseInt(studentId);
    if (isNaN(parsedStudentId)) {
      return NextResponse.json(
        { error: '유효하지 않은 학생 ID입니다.' },
        { status: 400 }
      );
    }

    // 학생 조회
    const student = await prisma.student.findUnique({
      where: { id: parsedStudentId },
    });

    if (!student) {
      return NextResponse.json(
        { error: '학생을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 달란트 히스토리 조회
    const history = await prisma.talentHistory.findMany({
      where: {
        studentId: parsedStudentId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        className: student.className,
        talents: student.talents,
      },
      history: history,
    });
  } catch (error) {
    console.error('달란트 히스토리 조회 오류:', error);
    return NextResponse.json(
      { error: '달란트 히스토리를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
