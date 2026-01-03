import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 달란트 조정 (지급/차감)
export async function POST(request: NextRequest) {
  try {
    const { studentId, amount, reason } = await request.json();

    if (!studentId || amount === undefined) {
      return NextResponse.json(
        { error: '학생 ID와 달란트 금액은 필수입니다.' },
        { status: 400 }
      );
    }

    const parsedAmount = parseInt(amount);
    if (isNaN(parsedAmount)) {
      return NextResponse.json(
        { error: '유효하지 않은 달란트 금액입니다.' },
        { status: 400 }
      );
    }

    // 학생 조회
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
    });

    if (!student) {
      return NextResponse.json(
        { error: '학생을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 트랜잭션으로 달란트 업데이트 및 히스토리 기록
    const updatedStudent = await prisma.$transaction(async (tx) => {
      const beforeBalance = student.talents || 0;
      const afterBalance = beforeBalance + parsedAmount;

      // 달란트 업데이트
      const updated = await tx.student.update({
        where: { id: parseInt(studentId) },
        data: {
          talents: afterBalance,
        },
      });

      // 달란트 히스토리 기록
      await tx.talentHistory.create({
        data: {
          studentId: parseInt(studentId),
          amount: parsedAmount,
          beforeBalance: beforeBalance,
          afterBalance: afterBalance,
          reason: reason || '수동 조정',
          type: 'manual',
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      student: updatedStudent,
      message: `${student.name} 학생에게 ${parsedAmount > 0 ? '+' : ''}${parsedAmount} 달란트가 ${parsedAmount > 0 ? '지급' : '차감'}되었습니다.`,
    });
  } catch (error) {
    console.error('달란트 조정 오류:', error);
    return NextResponse.json(
      { error: '달란트 조정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 일괄 달란트 조정
export async function PUT(request: NextRequest) {
  try {
    const { studentIds, amount, reason } = await request.json();

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: '학생 ID 목록은 필수입니다.' },
        { status: 400 }
      );
    }

    if (amount === undefined) {
      return NextResponse.json(
        { error: '달란트 금액은 필수입니다.' },
        { status: 400 }
      );
    }

    const parsedAmount = parseInt(amount);
    if (isNaN(parsedAmount)) {
      return NextResponse.json(
        { error: '유효하지 않은 달란트 금액입니다.' },
        { status: 400 }
      );
    }

    // 트랜잭션으로 일괄 업데이트 및 히스토리 기록
    const result = await prisma.$transaction(async (tx) => {
      const parsedIds = studentIds.map((id: string) => parseInt(id));

      // 모든 학생 정보 조회
      const students = await tx.student.findMany({
        where: {
          id: {
            in: parsedIds,
          },
        },
      });

      // 각 학생에 대해 달란트 업데이트 및 히스토리 기록
      for (const student of students) {
        const beforeBalance = student.talents || 0;
        const afterBalance = beforeBalance + parsedAmount;

        // 달란트 업데이트
        await tx.student.update({
          where: { id: student.id },
          data: {
            talents: afterBalance,
          },
        });

        // 달란트 히스토리 기록
        await tx.talentHistory.create({
          data: {
            studentId: student.id,
            amount: parsedAmount,
            beforeBalance: beforeBalance,
            afterBalance: afterBalance,
            reason: reason || '일괄 수동 조정',
            type: 'manual',
          },
        });
      }

      return { count: students.length };
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count}명의 학생에게 ${parsedAmount > 0 ? '+' : ''}${parsedAmount} 달란트가 ${parsedAmount > 0 ? '지급' : '차감'}되었습니다.`,
    });
  } catch (error) {
    console.error('일괄 달란트 조정 오류:', error);
    return NextResponse.json(
      { error: '일괄 달란트 조정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
