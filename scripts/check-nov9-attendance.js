const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAttendance() {
  try {
    const attendanceDate = new Date('2025-11-09');

    // 11월 9일 출석 기록 조회
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: attendanceDate,
        status: 'present',
      },
      include: {
        student: true,
      },
    });

    console.log(`\n2025년 11월 9일 출석 현황:\n`);
    console.log(`총 출석 인원: ${attendanceRecords.length}명\n`);

    if (attendanceRecords.length === 0) {
      console.log('11월 9일 출석 기록이 없습니다.\n');
      return;
    }

    // 선생님별로 그룹화
    const teacherGroups = {};
    attendanceRecords.forEach(record => {
      const teacherName = record.student.teacher;
      if (!teacherGroups[teacherName]) {
        teacherGroups[teacherName] = [];
      }
      teacherGroups[teacherName].push(record.student.name);
    });

    // 선생님별 출석 현황 출력
    console.log('선생님별 출석 현황:');
    for (const [teacherName, students] of Object.entries(teacherGroups)) {
      console.log(`\n${teacherName} 선생님: ${students.length}명`);
      students.forEach((name, idx) => {
        console.log(`  ${idx + 1}. ${name}`);
      });
    }

  } catch (error) {
    console.error('조회 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAttendance();
