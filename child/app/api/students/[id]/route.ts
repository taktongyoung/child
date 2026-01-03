import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 개별 학생 조회
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = parseInt(params.id);
    
    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: '유효하지 않은 학생 ID입니다.' },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: {
        id: studentId,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: '학생을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error('학생 조회 오류:', error);
    return NextResponse.json(
      { error: '학생 정보를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 학생 정보 수정
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = parseInt(params.id);
    
    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: '유효하지 않은 학생 ID입니다.' },
        { status: 400 }
      );
    }

    const data = await request.json();

    // 기존 학생이 존재하는지 확인
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: '수정할 학생을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const updatedStudent = await prisma.student.update({
      where: {
        id: studentId,
      },
      data: {
        name: data.name,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        className: data.className,
        teacher: data.teacher,
        phone: data.phone,
        address: data.address,
        photoUrl: data.photoUrl || existingStudent.photoUrl,
        notes: data.note || '',
      },
    });

    return NextResponse.json(updatedStudent);
  } catch (error) {
    console.error('학생 수정 오류:', error);
    return NextResponse.json(
      { error: '학생 정보 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 학생 삭제
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = parseInt(params.id);
    
    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: '유효하지 않은 학생 ID입니다.' },
        { status: 400 }
      );
    }

    // 기존 학생이 존재하는지 확인
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: '삭제할 학생을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 관련된 출석 기록도 함께 삭제
    await prisma.attendance.deleteMany({
      where: { studentId: studentId },
    });

    // 학생 삭제
    await prisma.student.delete({
      where: { id: studentId },
    });

    return NextResponse.json({ message: '학생이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('학생 삭제 오류:', error);
    return NextResponse.json(
      { error: '학생 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 