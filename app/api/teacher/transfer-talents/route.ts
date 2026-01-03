import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function POST(request: NextRequest) {
  try {
    // 토큰 확인
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

    // 입력값 검증
    if (!studentId || !amount || !reason) {
      return NextResponse.json(
        { error: '학생 ID, 달란트, 사유는 필수입니다.' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: '전송할 달란트는 0보다 커야 합니다.' },
        { status: 400 }
      );
    }

    // 선생님 정보 조회
    const teacher = await prisma.teacher.findUnique({
      where: { id: decoded.teacherId },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: '선생님 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 선생님의 달란트가 충분한지 확인
    if (teacher.talents < amount) {
      return NextResponse.json(
        { error: `보유 달란트가 부족합니다. (보유: ${teacher.talents}T, 필요: ${amount}T)` },
        { status: 400 }
      );
    }

    // 학생 정보 조회
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
    });

    if (!student) {
      return NextResponse.json(
        { error: '학생을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 자신이 담당하는 학생인지 확인
    if (student.teacher !== teacher.name) {
      return NextResponse.json(
        { error: '자신이 담당하는 학생에게만 달란트를 전송할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 트랜잭션으로 달란트 전송 처리
    const result = await prisma.$transaction(async (tx) => {
      // 선생님 달란트 차감
      const teacherBeforeBalance = teacher.talents;
      const teacherAfterBalance = teacherBeforeBalance - amount;

      await tx.teacher.update({
        where: { id: teacher.id },
        data: { talents: teacherAfterBalance },
      });

      // 선생님 달란트 히스토리 기록
      await tx.teacherTalentHistory.create({
        data: {
          teacherId: teacher.id,
          amount: -amount,
          beforeBalance: teacherBeforeBalance,
          afterBalance: teacherAfterBalance,
          reason: `${student.name} 학생에게 달란트 전송 (${reason})`,
          type: 'transfer',
        },
      });

      // 학생 달란트 증가
      const studentBeforeBalance = student.talents || 0;
      const studentAfterBalance = studentBeforeBalance + amount;

      await tx.student.update({
        where: { id: student.id },
        data: { talents: studentAfterBalance },
      });

      // 학생 달란트 히스토리 기록
      await tx.talentHistory.create({
        data: {
          studentId: student.id,
          amount: amount,
          beforeBalance: studentBeforeBalance,
          afterBalance: studentAfterBalance,
          reason: `${teacher.name} 선생님으로부터 받음 (${reason})`,
          type: 'transfer',
        },
      });

      return {
        teacher: {
          before: teacherBeforeBalance,
          after: teacherAfterBalance,
        },
        student: {
          before: studentBeforeBalance,
          after: studentAfterBalance,
        },
      };
    });

    return NextResponse.json({
      success: true,
      message: '달란트가 전송되었습니다.',
      result,
    });
  } catch (error) {
    console.error('달란트 전송 오류:', error);
    return NextResponse.json(
      { error: '달란트 전송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
