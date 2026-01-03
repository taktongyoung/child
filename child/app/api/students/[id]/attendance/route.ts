import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = parseInt(params.id);
    
    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: '유효하지 않은 학생 ID입니다.' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    // 기본값: 최근 30일
    const defaultFromDate = new Date();
    defaultFromDate.setDate(defaultFromDate.getDate() - 30);
    
    const whereClause: any = {
      studentId: studentId,
    };

    if (fromDate || toDate) {
      whereClause.date = {};
      if (fromDate) {
        whereClause.date.gte = new Date(fromDate);
      }
      if (toDate) {
        whereClause.date.lte = new Date(toDate);
      }
    } else {
      whereClause.date = {
        gte: defaultFromDate,
      };
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: whereClause,
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(attendanceRecords);
  } catch (error) {
    console.error('학생 출석 기록 조회 오류:', error);
    return NextResponse.json(
      { error: '출석 기록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 