import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// 2025년 아카이브 데이터 조회 (관리자 전용)
export async function GET(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const token = request.cookies.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: '관리자 로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    try {
      jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    // 학생 데이터 조회
    const students = await prisma.$queryRaw`
      SELECT * FROM "2005_Student" ORDER BY "className", name
    ` as any[];

    // 선생님 데이터 조회
    const teachers = await prisma.$queryRaw`
      SELECT * FROM "2005_Teacher" ORDER BY "className"
    ` as any[];

    // 출석 데이터 조회
    const attendance = await prisma.$queryRaw`
      SELECT * FROM "2025_Attendance" ORDER BY date DESC
    ` as any[];

    // 달란트 히스토리 조회
    const talentHistory = await prisma.$queryRaw`
      SELECT * FROM "2025_TalentHistory" ORDER BY "createdAt" DESC
    ` as any[];

    // 선생님 달란트 히스토리 조회
    const teacherTalentHistory = await prisma.$queryRaw`
      SELECT * FROM "2025_TeacherTalentHistory" ORDER BY "createdAt" DESC
    ` as any[];

    // 구매 내역 조회
    const purchases = await prisma.$queryRaw`
      SELECT * FROM "2025_Purchase" ORDER BY "createdAt" DESC
    ` as any[];

    // 주간 활동 조회
    const weeklyActivities = await prisma.$queryRaw`
      SELECT * FROM "2025_WeeklyActivity" ORDER BY date DESC
    ` as any[];

    // 통계 계산
    const totalStats = {
      present: 0,
      absent: 0,
      late: 0,
      total: attendance.length,
      attendanceRate: 0,
    };

    attendance.forEach((record: any) => {
      if (record.status === 'present') totalStats.present++;
      else if (record.status === 'absent') totalStats.absent++;
      else if (record.status === 'late') totalStats.late++;
    });

    totalStats.attendanceRate = totalStats.total > 0
      ? Math.round((totalStats.present / totalStats.total) * 100)
      : 0;

    // 반별 통계 계산
    const classOrder = ['믿음1반', '소망1반', '소망2반', '소망3반', '사랑1반', '사랑2반', '사랑3반', '희락1반'];
    const classStats: { [key: string]: any } = {};

    classOrder.forEach(cls => {
      classStats[cls] = {
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
        attendanceRate: 0,
      };
    });

    // 학생 ID와 반 매핑
    const studentClassMap: { [key: number]: string } = {};
    students.forEach((student: any) => {
      studentClassMap[student.id] = student.className;
    });

    attendance.forEach((record: any) => {
      const className = studentClassMap[record.studentId];
      if (className && classStats[className]) {
        classStats[className].total++;
        if (record.status === 'present') classStats[className].present++;
        else if (record.status === 'absent') classStats[className].absent++;
        else if (record.status === 'late') classStats[className].late++;
      }
    });

    // 반별 출석률 계산
    Object.keys(classStats).forEach(cls => {
      const stats = classStats[cls];
      stats.attendanceRate = stats.total > 0
        ? Math.round((stats.present / stats.total) * 100)
        : 0;
    });

    // 개별 학생 통계 계산
    const studentStats: { [key: number]: any } = {};
    students.forEach((student: any) => {
      studentStats[student.id] = {
        id: student.id,
        name: student.name,
        className: student.className,
        teacher: student.teacher,
        talents: student.talents,
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
        attendanceRate: 0,
      };
    });

    attendance.forEach((record: any) => {
      if (studentStats[record.studentId]) {
        studentStats[record.studentId].total++;
        if (record.status === 'present') studentStats[record.studentId].present++;
        else if (record.status === 'absent') studentStats[record.studentId].absent++;
        else if (record.status === 'late') studentStats[record.studentId].late++;
      }
    });

    // 학생별 출석률 계산
    Object.keys(studentStats).forEach(id => {
      const stats = studentStats[parseInt(id)];
      stats.attendanceRate = stats.total > 0
        ? Math.round((stats.present / stats.total) * 100)
        : 0;
    });

    // 주별 통계 계산
    const weeklyStats: { [key: string]: any } = {};
    attendance.forEach((record: any) => {
      const dateKey = new Date(record.date).toISOString().split('T')[0];
      if (!weeklyStats[dateKey]) {
        weeklyStats[dateKey] = {
          date: dateKey,
          present: 0,
          absent: 0,
          late: 0,
          total: 0,
          attendanceRate: 0,
        };
      }
      weeklyStats[dateKey].total++;
      if (record.status === 'present') weeklyStats[dateKey].present++;
      else if (record.status === 'absent') weeklyStats[dateKey].absent++;
      else if (record.status === 'late') weeklyStats[dateKey].late++;
    });

    // 주별 출석률 계산
    Object.keys(weeklyStats).forEach(dateKey => {
      const stats = weeklyStats[dateKey];
      stats.attendanceRate = stats.total > 0
        ? Math.round((stats.present / stats.total) * 100)
        : 0;
    });

    return NextResponse.json({
      students,
      teachers,
      totalStats,
      classStats,
      studentStats: Object.values(studentStats),
      weeklyStats: Object.values(weeklyStats).sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      talentHistory: {
        student: talentHistory.length,
        teacher: teacherTalentHistory.length,
      },
      purchases: purchases.length,
      weeklyActivities: weeklyActivities.length,
      summary: {
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalAttendance: attendance.length,
        totalTalentHistory: talentHistory.length + teacherTalentHistory.length,
        totalPurchases: purchases.length,
      },
    });

  } catch (error) {
    console.error('아카이브 데이터 조회 오류:', error);
    return NextResponse.json(
      { error: '아카이브 데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
