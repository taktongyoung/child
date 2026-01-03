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

    // 이번 주 일요일 00:00 계산
    const now = new Date();
    const dayOfWeek = now.getDay();
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
      include: {
        student: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const weeklyTotal = weeklyGrants.reduce((sum, grant) => sum + grant.amount, 0);

    return NextResponse.json({
      success: true,
      weeklyTotal,
      limit: 5,
      remaining: 5 - weeklyTotal,
      grants: weeklyGrants,
    });
  } catch (error) {
    console.error('주간 부여 내역 조회 오류:', error);
    return NextResponse.json(
      { error: '주간 부여 내역 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
