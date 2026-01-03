import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// 선생님 목록 조회
export async function GET() {
  try {
    const teachers = await prisma.teacher.findMany({
      orderBy: { className: 'asc' },
      select: {
        id: true,
        name: true,
        username: true,
        className: true,
        phone: true,
        email: true,
        talents: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(teachers);
  } catch (error) {
    console.error('선생님 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '선생님 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 선생님 추가
export async function POST(request: NextRequest) {
  try {
    const { name, username, password, className, phone, email } = await request.json();

    if (!name || !username || !password || !className) {
      return NextResponse.json(
        { error: '이름, 아이디, 비밀번호, 담당 반은 필수입니다.' },
        { status: 400 }
      );
    }

    // 아이디 중복 확인
    const existingTeacher = await prisma.teacher.findUnique({
      where: { username },
    });

    if (existingTeacher) {
      return NextResponse.json(
        { error: '이미 존재하는 아이디입니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 선생님 생성
    const teacher = await prisma.teacher.create({
      data: {
        name,
        username,
        password: hashedPassword,
        className,
        phone: phone || null,
        email: email || null,
        talents: 0,
      },
    });

    return NextResponse.json({
      success: true,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        username: teacher.username,
        className: teacher.className,
        phone: teacher.phone,
        email: teacher.email,
        talents: teacher.talents,
      },
    });
  } catch (error) {
    console.error('선생님 추가 오류:', error);
    return NextResponse.json(
      { error: '선생님 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 선생님 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '선생님 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    await prisma.teacher.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true, message: '선생님이 삭제되었습니다.' });
  } catch (error) {
    console.error('선생님 삭제 오류:', error);
    return NextResponse.json(
      { error: '선생님 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
