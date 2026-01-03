import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backupAndReset() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups');

  // 백업 디렉토리 생성
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('=== 2026년 새해 데이터 백업 및 초기화 ===\n');

  try {
    // 1. 현재 데이터 조회 및 백업
    console.log('1. 현재 데이터 백업 중...\n');

    // 학생 데이터 (달란트 포함)
    const students = await prisma.student.findMany({
      orderBy: { className: 'asc' },
    });
    console.log(`   - 학생: ${students.length}명`);

    // 선생님 데이터 (달란트 포함)
    const teachers = await prisma.teacher.findMany({
      orderBy: { className: 'asc' },
    });
    console.log(`   - 선생님: ${teachers.length}명`);

    // 출석 데이터
    const attendance = await prisma.attendance.findMany({
      include: { student: { select: { name: true, className: true } } },
      orderBy: { date: 'desc' },
    });
    console.log(`   - 출석 기록: ${attendance.length}건`);

    // 학생 달란트 히스토리
    const talentHistory = await prisma.talentHistory.findMany({
      include: { student: { select: { name: true, className: true } } },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`   - 학생 달란트 히스토리: ${talentHistory.length}건`);

    // 선생님 달란트 히스토리
    const teacherTalentHistory = await prisma.teacherTalentHistory.findMany({
      include: { teacher: { select: { name: true, className: true } } },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`   - 선생님 달란트 히스토리: ${teacherTalentHistory.length}건`);

    // 구매 내역
    const purchases = await prisma.purchase.findMany({
      include: {
        student: { select: { name: true, className: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`   - 구매 내역: ${purchases.length}건`);

    // 주간 활동
    const weeklyActivities = await prisma.weeklyActivity.findMany({
      include: { student: { select: { name: true, className: true } } },
      orderBy: { date: 'desc' },
    });
    console.log(`   - 주간 활동: ${weeklyActivities.length}건`);

    // SMS 히스토리
    const smsHistory = await prisma.smsHistory.findMany({
      orderBy: { sentAt: 'desc' },
    });
    console.log(`   - SMS 히스토리: ${smsHistory.length}건`);

    // 백업 데이터 구성
    const backupData = {
      backupDate: new Date().toISOString(),
      description: '2025년 데이터 백업 - 2026년 새해 초기화 전',
      summary: {
        students: students.length,
        teachers: teachers.length,
        attendance: attendance.length,
        talentHistory: talentHistory.length,
        teacherTalentHistory: teacherTalentHistory.length,
        purchases: purchases.length,
        weeklyActivities: weeklyActivities.length,
        smsHistory: smsHistory.length,
        totalStudentTalents: students.reduce((sum, s) => sum + s.talents, 0),
        totalTeacherTalents: teachers.reduce((sum, t) => sum + t.talents, 0),
      },
      data: {
        students,
        teachers,
        attendance,
        talentHistory,
        teacherTalentHistory,
        purchases,
        weeklyActivities,
        smsHistory,
      },
    };

    // 백업 파일 저장
    const backupFilePath = path.join(backupDir, `backup-2025-${timestamp}.json`);
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`\n   백업 파일 저장 완료: ${backupFilePath}\n`);

    // 2. 데이터 초기화
    console.log('2. 데이터 초기화 중...\n');

    // 주간 활동 삭제
    const deletedWeeklyActivities = await prisma.weeklyActivity.deleteMany({});
    console.log(`   - 주간 활동 삭제: ${deletedWeeklyActivities.count}건`);

    // 구매 내역 삭제
    const deletedPurchases = await prisma.purchase.deleteMany({});
    console.log(`   - 구매 내역 삭제: ${deletedPurchases.count}건`);

    // 학생 달란트 히스토리 삭제
    const deletedTalentHistory = await prisma.talentHistory.deleteMany({});
    console.log(`   - 학생 달란트 히스토리 삭제: ${deletedTalentHistory.count}건`);

    // 선생님 달란트 히스토리 삭제
    const deletedTeacherTalentHistory = await prisma.teacherTalentHistory.deleteMany({});
    console.log(`   - 선생님 달란트 히스토리 삭제: ${deletedTeacherTalentHistory.count}건`);

    // 출석 기록 삭제
    const deletedAttendance = await prisma.attendance.deleteMany({});
    console.log(`   - 출석 기록 삭제: ${deletedAttendance.count}건`);

    // SMS 히스토리 삭제
    const deletedSmsHistory = await prisma.smsHistory.deleteMany({});
    console.log(`   - SMS 히스토리 삭제: ${deletedSmsHistory.count}건`);

    // 3. 달란트 잔액 초기화
    console.log('\n3. 달란트 잔액 초기화 중...\n');

    // 학생 달란트 초기화
    const updatedStudents = await prisma.student.updateMany({
      data: { talents: 0 },
    });
    console.log(`   - 학생 달란트 초기화: ${updatedStudents.count}명`);

    // 선생님 달란트 초기화
    const updatedTeachers = await prisma.teacher.updateMany({
      data: { talents: 0 },
    });
    console.log(`   - 선생님 달란트 초기화: ${updatedTeachers.count}명`);

    console.log('\n=== 초기화 완료 ===\n');
    console.log('요약:');
    console.log(`  - 백업 파일: ${backupFilePath}`);
    console.log(`  - 보존된 데이터: 학생 ${students.length}명, 선생님 ${teachers.length}명`);
    console.log(`  - 초기화된 데이터: 출석, 달란트 히스토리, 구매 내역, 주간 활동, SMS 히스토리`);
    console.log(`  - 달란트 잔액: 모두 0으로 초기화됨\n`);

  } catch (error) {
    console.error('오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backupAndReset();
