const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateTeacherTalents() {
  try {
    console.log('2025년 11월 9일 출석 기준 선생님 달란트 업데이트 시작...\n');

    const attendanceDate = new Date('2025-11-09');

    // 11월 9일 출석 기록 조회 (출석만)
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: attendanceDate,
        status: 'present',
      },
      include: {
        student: true,
      },
    });

    // 선생님별 출석 인원 집계
    const teacherStats = {};
    attendanceRecords.forEach(record => {
      const teacherName = record.student.teacher;
      if (!teacherStats[teacherName]) {
        teacherStats[teacherName] = 0;
      }
      teacherStats[teacherName]++;
    });

    console.log('선생님별 출석 인원:');
    for (const [teacherName, count] of Object.entries(teacherStats)) {
      console.log(`  ${teacherName}: ${count}명 → ${count * 10} 달란트`);
    }
    console.log('');

    // 각 선생님의 달란트 업데이트
    for (const [teacherName, count] of Object.entries(teacherStats)) {
      const teacher = await prisma.teacher.findFirst({
        where: { name: teacherName },
      });

      if (teacher) {
        await prisma.$transaction(async (tx) => {
          const beforeBalance = teacher.talents || 0;
          const talentAmount = count * 10; // 출석 인원 × 10 달란트
          const afterBalance = beforeBalance + talentAmount;

          // 선생님 달란트 업데이트
          await tx.teacher.update({
            where: { id: teacher.id },
            data: { talents: afterBalance },
          });

          // 선생님 달란트 히스토리 기록
          await tx.teacherTalentHistory.create({
            data: {
              teacherId: teacher.id,
              amount: talentAmount,
              beforeBalance: beforeBalance,
              afterBalance: afterBalance,
              reason: `11/9 출석 체크 (${count}명 출석)`,
              type: 'attendance',
            },
          });
        });

        console.log(`✓ ${teacherName} 선생님: ${teacher.talents}T → ${teacher.talents + (count * 10)}T (+${count * 10}T)`);
      } else {
        console.log(`⚠ ${teacherName} 선생님을 찾을 수 없습니다.`);
      }
    }

    console.log('\n선생님 달란트 업데이트가 완료되었습니다!');
  } catch (error) {
    console.error('업데이트 오류:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateTeacherTalents();
