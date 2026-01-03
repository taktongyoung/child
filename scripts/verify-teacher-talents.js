const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyTeacherTalents() {
  try {
    console.log('\n현재 선생님 달란트 현황:\n');

    const teachers = await prisma.teacher.findMany({
      orderBy: { name: 'asc' },
    });

    for (const teacher of teachers) {
      console.log(`${teacher.name} 선생님: ${teacher.talents} 달란트`);
    }

    console.log('\n\n선생님별 달란트 히스토리 (최근 5개):');
    for (const teacher of teachers) {
      const history = await prisma.teacherTalentHistory.findMany({
        where: { teacherId: teacher.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      if (history.length > 0) {
        console.log(`\n${teacher.name} 선생님:`);
        history.forEach((h, idx) => {
          console.log(`  ${idx + 1}. ${h.reason}: ${h.amount > 0 ? '+' : ''}${h.amount}T (${h.beforeBalance}T → ${h.afterBalance}T)`);
        });
      }
    }

  } catch (error) {
    console.error('조회 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTeacherTalents();
