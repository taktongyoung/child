import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// 선생님 상세 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: parseInt(params.id) },
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

    if (!teacher) {
      return NextResponse.json(
        { error: '선생님을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(teacher);
  } catch (error) {
    console.error('선생님 조회 오류:', error);
    return NextResponse.json(
      { error: '선생님 정보를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 선생님 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name, username, password, className, phone, email } = await request.json();

    if (!name || !username || !className) {
      return NextResponse.json(
        { error: '이름, 아이디, 담당 반은 필수입니다.' },
        { status: 400 }
      );
    }

    // 아이디 중복 확인 (자기 자신 제외)
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        username,
        NOT: {
          id: parseInt(params.id),
        },
      },
    });

    if (existingTeacher) {
      return NextResponse.json(
        { error: '이미 존재하는 아이디입니다.' },
        { status: 400 }
      );
    }

    // 업데이트할 데이터 준비
    const updateData: any = {
      name,
      username,
      className,
      phone: phone || null,
      email: email || null,
    };

    // 비밀번호가 제공된 경우에만 업데이트
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // 선생님 정보 업데이트
    const teacher = await prisma.teacher.update({
      where: { id: parseInt(params.id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        className: true,
        phone: true,
        email: true,
        talents: true,
      },
    });

    return NextResponse.json({
      success: true,
      teacher,
    });
  } catch (error) {
    console.error('선생님 수정 오류:', error);
    return NextResponse.json(
      { error: '선생님 정보 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
