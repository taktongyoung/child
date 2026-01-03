import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 출석 통계 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const className = searchParams.get('className');
    const studentId = searchParams.get('studentId');

    // 기본값: 최근 30일
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const fromDate = startDate ? new Date(startDate) : defaultStartDate;
    const toDate = endDate ? new Date(endDate) : defaultEndDate;

    // 기본 쿼리 조건
    const whereCondition: any = {
      date: {
        gte: fromDate,
        lte: toDate,
      },
    };

    // 특정 학생 통계인 경우
    if (studentId) {
      whereCondition.studentId = parseInt(studentId);
    }

    // 특정 반 통계인 경우
    if (className) {
      whereCondition.student = {
        className: className,
      };
    }

    // 출석 데이터 조회
    const attendanceRecords = await prisma.attendance.findMany({
      where: whereCondition,
      include: {
        student: true,
      },
    });

    // 전체 통계 계산
    const totalStats = {
      present: 0,
      absent: 0,
      late: 0,
      total: attendanceRecords.length,
    };

    attendanceRecords.forEach(record => {
      if (record.status === 'present') totalStats.present++;
      else if (record.status === 'absent') totalStats.absent++;
      else if (record.status === 'late') totalStats.late++;
    });

    // 출석률 계산
    const attendanceRate = totalStats.total > 0 
      ? Math.round((totalStats.present / totalStats.total) * 100) 
      : 0;

    // 반별 통계 계산 (세분화된 반을 큰 카테고리로 통합)
    const classStat: { [key: string]: any } = {};
    const classOrder = ['믿음', '소망', '사랑', '희락'];
    
    // 반 이름을 큰 카테고리로 매핑하는 함수
    const getMainClass = (className: string): string => {
      if (className.includes('믿음')) return '믿음';
      if (className.includes('소망')) return '소망';
      if (className.includes('사랑')) return '사랑';
      if (className.includes('희락')) return '희락';
      return className; // 기본값
    };
    
    classOrder.forEach(cls => {
      classStat[cls] = {
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
        attendanceRate: 0,
      };
    });

    attendanceRecords.forEach(record => {
      const mainClass = getMainClass(record.student.className);
      if (classStat[mainClass]) {
        classStat[mainClass].total++;
        if (record.status === 'present') classStat[mainClass].present++;
        else if (record.status === 'absent') classStat[mainClass].absent++;
        else if (record.status === 'late') classStat[mainClass].late++;
      }
    });

    // 반별 출석률 계산
    Object.keys(classStat).forEach(cls => {
      const stats = classStat[cls];
      stats.attendanceRate = stats.total > 0 
        ? Math.round((stats.present / stats.total) * 100) 
        : 0;
    });

    // 개별 학생 통계 계산 (반별 통계가 아닌 경우)
    const studentStats: { [key: number]: any } = {};
    if (!className && !studentId) {
      const students = await prisma.student.findMany();
      
      students.forEach(student => {
        studentStats[student.id] = {
          id: student.id,
          name: student.name,
          className: getMainClass(student.className), // 큰 카테고리로 표시
          present: 0,
          absent: 0,
          late: 0,
          total: 0,
          attendanceRate: 0,
        };
      });

      attendanceRecords.forEach(record => {
        const studentId = record.studentId;
        if (studentStats[studentId]) {
          studentStats[studentId].total++;
          if (record.status === 'present') studentStats[studentId].present++;
          else if (record.status === 'absent') studentStats[studentId].absent++;
          else if (record.status === 'late') studentStats[studentId].late++;
        }
      });

      // 개별 학생 출석률 계산
      Object.keys(studentStats).forEach(id => {
        const stats = studentStats[parseInt(id)];
        stats.attendanceRate = stats.total > 0 
          ? Math.round((stats.present / stats.total) * 100) 
          : 0;
      });
    }

    // 날짜별 통계 (전체 기간의 모든 일요일)
    const weeklyStats: { [key: string]: any } = {};
    
    // 출석 기록이 있는 모든 날짜에서 일요일만 추출
    const allSundays = new Set<string>();
    attendanceRecords.forEach(record => {
      const recordDate = new Date(record.date);
      // 일요일인 경우만 추가 (0 = 일요일)
      if (recordDate.getDay() === 0) {
        const dateKey = recordDate.toISOString().split('T')[0];
        allSundays.add(dateKey);
      }
    });
    
    // 모든 일요일에 대해 초기 통계 객체 생성
    allSundays.forEach(dateKey => {
      weeklyStats[dateKey] = {
        date: dateKey,
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
        attendanceRate: 0,
      };
    });

    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      if (weeklyStats[dateKey]) {
        weeklyStats[dateKey].total++;
        if (record.status === 'present') weeklyStats[dateKey].present++;
        else if (record.status === 'absent') weeklyStats[dateKey].absent++;
        else if (record.status === 'late') weeklyStats[dateKey].late++;
      }
    });

    // 주별 출석률 계산
    Object.keys(weeklyStats).forEach(dateKey => {
      const stats = weeklyStats[dateKey];
      stats.attendanceRate = stats.total > 0 
        ? Math.round((stats.present / stats.total) * 100) 
        : 0;
    });

    return NextResponse.json({
      totalStats: {
        ...totalStats,
        attendanceRate,
      },
      classStats: classStat,
      studentStats: Object.values(studentStats),
      weeklyStats: Object.values(weeklyStats).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      period: {
        startDate: fromDate.toISOString().split('T')[0],
        endDate: toDate.toISOString().split('T')[0],
      },
    });

  } catch (error) {
    console.error('출석 통계 조회 오류:', error);
    return NextResponse.json(
      { error: '출석 통계를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}