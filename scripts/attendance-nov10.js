const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function markAttendance() {
  try {
    console.log('2025년 11월 10일(일요일) 출석 체크 시작...\n');

    const attendanceDate = new Date('2025-11-10');

    // 모든 학생 조회
    const students = await prisma.student.findMany({
      orderBy: { className: 'asc' },
    });

    console.log(`총 ${students.length}명의 학생을 출석 처리합니다.\n`);

    let totalProcessed = 0;
    const teacherStats = {};

    // 각 학생을 출석 처리
    for (const student of students) {
      await prisma.$transaction(async (tx) => {
        // 기존 출석 기록 확인
        const existing = await tx.attendance.findFirst({
          where: {
            studentId: student.id,
            date: attendanceDate,
          },
        });

        if (existing) {
          console.log(`${student.name} - 이미 출석 기록이 있습니다. 건너뜁니다.`);
          return;
        }

        // 출석 기록 생성
        await tx.attendance.create({
          data: {
            studentId: student.id,
            date: attendanceDate,
            status: 'present',
          },
        });

        // 학생 달란트 업데이트
        const beforeBalance = student.talents || 0;
        const afterBalance = beforeBalance + 5;

        await tx.student.update({
          where: { id: student.id },
          data: { talents: afterBalance },
        });

        // 학생 달란트 히스토리 기록
        await tx.talentHistory.create({
          data: {
            studentId: student.id,
            amount: 5,
            beforeBalance: beforeBalance,
            afterBalance: afterBalance,
            reason: '출석 체크 (출석)',
            type: 'attendance',
          },
        });

        // 선생님별 통계
        if (!teacherStats[student.teacher]) {
          teacherStats[student.teacher] = 0;
        }
        teacherStats[student.teacher]++;

        totalProcessed++;
        console.log(`✓ ${student.name} (${student.className}) - 출석 처리 완료`);
      });
    }

    console.log(`\n총 ${totalProcessed}명 출석 처리 완료!\n`);
    console.log('선생님별 출석 학생 수:');

    // 선생님별로 달란트 지급
    for (const [teacherName, count] of Object.entries(teacherStats)) {
      const teacher = await prisma.teacher.findFirst({
        where: { name: teacherName },
      });

      if (teacher) {
        await prisma.$transaction(async (tx) => {
          const beforeBalance = teacher.talents || 0;
          const afterBalance = beforeBalance + count;

          await tx.teacher.update({
            where: { id: teacher.id },
            data: { talents: afterBalance },
          });

          await tx.teacherTalentHistory.create({
            data: {
              teacherId: teacher.id,
              amount: count,
              beforeBalance: beforeBalance,
              afterBalance: afterBalance,
              reason: `11/10 출석 체크 (${count}명 출석)`,
              type: 'attendance',
            },
          });
        });

        console.log(`  ${teacherName} 선생님: ${count}명 출석 → ${count} 달란트 지급`);
      }
    }

    console.log('\n출석 체크가 완료되었습니다!');
  } catch (error) {
    console.error('출석 체크 오류:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

markAttendance();
