const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('기존 학생들의 로그인 정보를 초기화합니다...');

  // 비밀번호 없는 모든 학생 조회
  const students = await prisma.student.findMany({
    where: {
      OR: [
        { username: null },
        { password: null },
      ],
    },
  });

  console.log(`${students.length}명의 학생 로그인 정보를 설정합니다.`);

  // 기본 비밀번호 해시
  const defaultPassword = '1234';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  let successCount = 0;
  let errorCount = 0;

  for (const student of students) {
    try {
      // username이 이미 있는지 확인 (이름 중복 처리)
      let username = student.name;
      let counter = 1;

      while (true) {
        const existing = await prisma.student.findUnique({
          where: { username: username },
        });

        if (!existing || existing.id === student.id) {
          break;
        }

        // 중복이면 숫자 추가
        username = `${student.name}${counter}`;
        counter++;
      }

      await prisma.student.update({
        where: { id: student.id },
        data: {
          username: username,
          password: hashedPassword,
        },
      });

      console.log(`✓ ${student.name} -> 아이디: ${username}, 비밀번호: ${defaultPassword}`);
      successCount++;
    } catch (error) {
      console.error(`✗ ${student.name} 설정 실패:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n완료: 성공 ${successCount}명, 실패 ${errorCount}명`);
  console.log('\n모든 학생의 초기 비밀번호는 "1234"입니다.');
}

main()
  .catch((e) => {
    console.error('오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
