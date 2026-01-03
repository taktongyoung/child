import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 주간 활동 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: '날짜 매개변수가 필요합니다.' },
        { status: 400 }
      );
    }

    // 해당 날짜의 일요일로 변환
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const sundayDate = new Date(targetDate);
    sundayDate.setDate(targetDate.getDate() - dayOfWeek);
    sundayDate.setHours(0, 0, 0, 0);

    const activities = await prisma.weeklyActivity.findMany({
      where: {
        date: sundayDate,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            className: true,
          },
        },
      },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('주간 활동 조회 오류:', error);
    return NextResponse.json(
      { error: '주간 활동을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 주간 활동 업데이트 (체크/해제)
export async function POST(request: NextRequest) {
  try {
    const { studentId, date, activityType, checked } = await request.json();

    if (!studentId || !date || !activityType) {
      return NextResponse.json(
        { error: '학생 ID, 날짜, 활동 유형은 필수입니다.' },
        { status: 400 }
      );
    }

    // 유효한 활동 유형인지 확인
    const validTypes = ['bible', 'recitation', 'qt', 'phone'];
    if (!validTypes.includes(activityType)) {
      return NextResponse.json(
        { error: '유효하지 않은 활동 유형입니다.' },
        { status: 400 }
      );
    }

    // 해당 날짜의 일요일로 변환
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const sundayDate = new Date(targetDate);
    sundayDate.setDate(targetDate.getDate() - dayOfWeek);
    sundayDate.setHours(0, 0, 0, 0);

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

    // 기존 활동 기록 조회
    const existingActivity = await prisma.weeklyActivity.findUnique({
      where: {
        studentId_date: {
          studentId: parseInt(studentId),
          date: sundayDate,
        },
      },
    });

    // 이미 체크된 상태에서 체크하려고 하거나, 이미 해제된 상태에서 해제하려고 하면 무시
    if (existingActivity) {
      const currentValue = existingActivity[activityType as keyof typeof existingActivity];
      if (currentValue === checked) {
        return NextResponse.json({
          success: true,
          message: '이미 해당 상태입니다.',
          activity: existingActivity,
        });
      }
    }

    // 달란트 변경량 계산 (체크 시 +10, 해제 시 -10)
    const talentChange = checked ? 10 : -10;

    // 활동 유형 한글 이름
    const activityNames: { [key: string]: string } = {
      bible: '성경',
      recitation: '암송',
      qt: '큐티',
      phone: '휴대폰',
    };

    // 트랜잭션으로 활동 기록 및 달란트 업데이트
    const result = await prisma.$transaction(async (tx) => {
      // 활동 기록 upsert
      const updateData: any = {};
      updateData[activityType] = checked;

      const activity = await tx.weeklyActivity.upsert({
        where: {
          studentId_date: {
            studentId: parseInt(studentId),
            date: sundayDate,
          },
        },
        update: updateData,
        create: {
          studentId: parseInt(studentId),
          date: sundayDate,
          [activityType]: checked,
        },
      });

      // 학생 달란트 업데이트
      const beforeBalance = student.talents || 0;
      const afterBalance = beforeBalance + talentChange;

      await tx.student.update({
        where: { id: parseInt(studentId) },
        data: { talents: afterBalance },
      });

      // 달란트 히스토리 기록
      await tx.talentHistory.create({
        data: {
          studentId: parseInt(studentId),
          amount: talentChange,
          beforeBalance: beforeBalance,
          afterBalance: afterBalance,
          reason: `${activityNames[activityType]} ${checked ? '체크' : '해제'}`,
          type: 'activity',
        },
      });

      return { activity, afterBalance };
    });

    return NextResponse.json({
      success: true,
      message: `${student.name} 학생의 ${activityNames[activityType]}이(가) ${checked ? '체크' : '해제'}되었습니다. (${talentChange > 0 ? '+' : ''}${talentChange} 달란트)`,
      activity: result.activity,
      newTalentBalance: result.afterBalance,
    });
  } catch (error) {
    console.error('주간 활동 업데이트 오류:', error);
    return NextResponse.json(
      { error: '주간 활동 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
