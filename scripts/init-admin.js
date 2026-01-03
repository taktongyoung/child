const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function initAdmin() {
  try {
    console.log('관리자 계정 초기화 시작...');

    // 기존 관리자 계정 확인
    const existingAdmin = await prisma.admin.findFirst();

    if (existingAdmin) {
      console.log('관리자 계정이 이미 존재합니다.');
      console.log(`아이디: ${existingAdmin.username}`);
      return;
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash('admin1234', 10);

    // 관리자 계정 생성
    const admin = await prisma.admin.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: '관리자',
      },
    });

    console.log('관리자 계정이 성공적으로 생성되었습니다!');
    console.log(`아이디: ${admin.username}`);
    console.log('비밀번호: admin1234');
    console.log('\n⚠️  보안을 위해 로그인 후 비밀번호를 변경해주세요!');
  } catch (error) {
    console.error('관리자 계정 생성 오류:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initAdmin();
