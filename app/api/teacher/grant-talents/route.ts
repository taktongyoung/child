import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function POST(request: NextRequest) {
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

    const { studentId, amount, reason } = await request.json();

    if (!studentId || amount === undefined || !reason) {
      return NextResponse.json(
        { error: '학생 ID, 달란트, 사유는 필수입니다.' },
        { status: 400 }
      );
    }

    if (amount === 0) {
      return NextResponse.json(
        { error: '달란트는 0이 아니어야 합니다.' },
        { status: 400 }
      );
    }

    // 선생님 정보 확인
    const teacher = await prisma.teacher.findUnique({
      where: { id: decoded.teacherId },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: '선생님 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 학생 정보 확인 (담당 반 학생인지 확인)
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
    });

    if (!student) {
      return NextResponse.json(
        { error: '학생 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (student.teacher !== teacher.name) {
      return NextResponse.json(
        { error: '담당 학생만 달란트를 부여할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 일반 부여(양수)인 경우 주간 한도 체크 (5달란트)
    if (parseInt(amount) > 0) {
      // 이번 주 일요일 00:00 계산
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0: 일요일, 1: 월요일, ...
      const thisSunday = new Date(now);
      thisSunday.setDate(now.getDate() - dayOfWeek);
      thisSunday.setHours(0, 0, 0, 0);

      // 이번 주에 해당 선생님이 부여한 달란트 합계 (type='manual', amount > 0만)
      const weeklyGrants = await prisma.talentHistory.findMany({
        where: {
          student: {
            teacher: teacher.name,
          },
          type: 'manual',
          amount: {
            gt: 0,
          },
          createdAt: {
            gte: thisSunday,
          },
        },
      });

      const weeklyTotal = weeklyGrants.reduce((sum, grant) => sum + grant.amount, 0);
      const requestAmount = parseInt(amount);

      if (weeklyTotal + requestAmount > 5) {
        return NextResponse.json(
          {
            error: `주간 일반 부여 한도를 초과했습니다. (이번 주 부여: ${weeklyTotal}T, 요청: ${requestAmount}T, 한도: 5T)`,
            weeklyTotal,
            requestAmount,
            limit: 5,
          },
          { status: 400 }
        );
      }
    }

    // 트랜잭션으로 달란트 변경
    const result = await prisma.$transaction(async (tx) => {
      const beforeBalance = student.talents;
      const afterBalance = beforeBalance + parseInt(amount);

      // 달란트 업데이트
      const updatedStudent = await tx.student.update({
        where: { id: parseInt(studentId) },
        data: { talents: afterBalance },
      });

      // 달란트 히스토리 기록
      await tx.talentHistory.create({
        data: {
          studentId: parseInt(studentId),
          amount: parseInt(amount),
          beforeBalance,
          afterBalance,
          reason: `${reason} (${teacher.name} 선생님)`,
          type: 'manual',
        },
      });

      return { updatedStudent, beforeBalance, afterBalance };
    });

    return NextResponse.json({
      success: true,
      message: '달란트가 성공적으로 부여되었습니다.',
      student: result.updatedStudent,
      beforeBalance: result.beforeBalance,
      afterBalance: result.afterBalance,
    });
  } catch (error) {
    console.error('달란트 부여 오류:', error);
    return NextResponse.json(
      { error: '달란트 부여 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
