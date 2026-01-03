import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 출석 기록 조회
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

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: new Date(date),
      },
      include: {
        student: true,
      },
    });

    return NextResponse.json(attendanceRecords);
  } catch (error) {
    console.error('출석 기록 조회 오류:', error);
    return NextResponse.json(
      { error: '출석 기록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 출석 기록 생성/수정
export async function POST(request: NextRequest) {
  try {
    const { studentId, date, status } = await request.json();

    if (!studentId || !date || !status) {
      return NextResponse.json(
        { error: '학생 ID, 날짜, 출석 상태는 필수입니다.' },
        { status: 400 }
      );
    }

    // 일요일 검증 추가
    const targetDate = new Date(date);
    if (targetDate.getDay() !== 0) { // 0: 일요일
      return NextResponse.json(
        { error: '출석체크는 일요일에만 가능합니다.' },
        { status: 400 }
      );
    }

    // 유효한 출석 상태인지 확인
    const validStatuses = ['present', 'absent', 'late'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '유효하지 않은 출석 상태입니다.' },
        { status: 400 }
      );
    }

    // 기존 출석 기록이 있는지 확인
    const existingRecord = await prisma.attendance.findFirst({
      where: {
        studentId: parseInt(studentId),
        date: new Date(date),
      },
    });

    let attendanceRecord;

    if (existingRecord) {
      // 기존 기록 업데이트
      attendanceRecord = await prisma.attendance.update({
        where: {
          id: existingRecord.id,
        },
        data: {
          status: status,
        },
        include: {
          student: true,
        },
      });
    } else {
      // 새 기록 생성
      attendanceRecord = await prisma.attendance.create({
        data: {
          studentId: parseInt(studentId),
          date: new Date(date),
          status: status,
        },
        include: {
          student: true,
        },
      });
    }

    return NextResponse.json(attendanceRecord);
  } catch (error) {
    console.error('출석 기록 저장 오류:', error);
    return NextResponse.json(
      { error: '출석 기록 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 출석 기록 코멘트 수정
export async function PATCH(request: NextRequest) {
  try {
    const { id, comment } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: '출석 기록 ID가 필요합니다.' },
        { status: 400 }
      );
    }
    const updated = await prisma.attendance.update({
      where: { id: parseInt(id) },
      data: { comment },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('출석 코멘트 수정 오류:', error);
    return NextResponse.json(
      { error: '출석 코멘트 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 출석 기록 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: '출석 기록 ID가 필요합니다.' },
        { status: 400 }
      );
    }
    
    // 출석 기록 삭제
    await prisma.attendance.delete({
      where: { id: parseInt(id) },
    });
    
    return NextResponse.json({ message: '출석 기록이 삭제되었습니다.' });
  } catch (error) {
    console.error('출석 기록 삭제 오류:', error);
    return NextResponse.json(
      { error: '출석 기록 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 