import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAllTalents() {
  try {
    console.log('달란트 초기화를 시작합니다...');

    // 현재 학생들의 달란트 상태 조회
    const students = await prisma.student.findMany({
      select: { id: true, name: true, talents: true }
    });

    console.log(`총 ${students.length}명의 학생이 있습니다.`);

    // 0이 아닌 달란트를 가진 학생 수
    const nonZeroStudents = students.filter(s => s.talents !== 0);
    console.log(`달란트가 0이 아닌 학생: ${nonZeroStudents.length}명`);

    if (nonZeroStudents.length === 0) {
      console.log('이미 모든 학생의 달란트가 0입니다.');
      return;
    }

    // 모든 학생의 달란트를 0으로 초기화 (히스토리는 유지)
    const result = await prisma.student.updateMany({
      data: {
        talents: 0
      }
    });

    console.log(`${result.count}명의 학생 달란트가 0으로 초기화되었습니다.`);

    // 선생님 달란트도 초기화
    const teacherResult = await prisma.teacher.updateMany({
      data: {
        talents: 0
      }
    });

    console.log(`${teacherResult.count}명의 선생님 달란트도 0으로 초기화되었습니다.`);

    // 히스토리 개수 확인 (유지되었는지)
    const historyCount = await prisma.talentHistory.count();
    console.log(`달란트 히스토리: ${historyCount}건 (유지됨)`);

    console.log('달란트 초기화가 완료되었습니다!');

  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAllTalents();
