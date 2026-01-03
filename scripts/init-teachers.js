const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function initTeachers() {
  try {
    // 기존에 등록된 학생들의 teacher와 className을 그룹화하여 조회
    const students = await prisma.student.findMany({
      select: {
        teacher: true,
        className: true,
      },
    });

    // teacher와 className 매핑 생성
    const teacherClassMap = {};
    students.forEach(student => {
      if (student.teacher && student.className) {
        if (!teacherClassMap[student.teacher]) {
          teacherClassMap[student.teacher] = new Set();
        }
        teacherClassMap[student.teacher].add(student.className);
      }
    });

    console.log('발견된 선생님과 담당 반:');
    Object.entries(teacherClassMap).forEach(([teacher, classes]) => {
      console.log(`  ${teacher}: ${Array.from(classes).join(', ')}`);
    });

    // 초기 비밀번호 (1234)
    const defaultPassword = '1234';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // 각 선생님 계정 생성
    const createdTeachers = [];
    for (const [teacherName, classes] of Object.entries(teacherClassMap)) {
      // 이미 존재하는 선생님인지 확인
      const existing = await prisma.teacher.findUnique({
        where: { username: teacherName },
      });

      if (existing) {
        console.log(`⏭️  ${teacherName} - 이미 존재하는 계정입니다.`);
        continue;
      }

      // 첫 번째 반을 주 담당 반으로 설정 (여러 반을 담당할 수 있지만 하나만 저장)
      const primaryClass = Array.from(classes)[0];

      const teacher = await prisma.teacher.create({
        data: {
          name: teacherName,
          username: teacherName, // 이름을 username으로 사용
          password: hashedPassword,
          className: primaryClass,
          phone: '',
          email: '',
        },
      });

      createdTeachers.push(teacher);
      console.log(`✅ ${teacherName} (${primaryClass}) - 계정 생성 완료`);
    }

    console.log('\n===========================================');
    console.log(`총 ${createdTeachers.length}개의 선생님 계정이 생성되었습니다.`);
    console.log('===========================================');
    console.log('\n로그인 정보:');
    console.log('아이디: 선생님 이름');
    console.log('비밀번호: 1234');
    console.log('\n예시:');
    console.log('아이디: 김선생');
    console.log('비밀번호: 1234');
    console.log('===========================================\n');

  } catch (error) {
    console.error('선생님 계정 생성 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initTeachers();
