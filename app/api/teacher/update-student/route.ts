import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('teacher-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    const teacherId = decoded.teacherId;
    const body = await request.json();
    const { studentId, name, birthDate, phone, address, photoUrl } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: '학생 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 선생님 정보 조회
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { className: true }
    });

    if (!teacher) {
      return NextResponse.json(
        { error: '선생님 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 학생 정보 조회 및 권한 확인
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, className: true, teacher: true }
    });

    if (!student) {
      return NextResponse.json(
        { error: '학생 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 선생님이 담당하는 학생인지 확인 (className이 같은지 또는 teacher 필드가 일치하는지)
    if (student.className !== teacher.className) {
      return NextResponse.json(
        { error: '담당 학생만 수정할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 전화번호가 변경되었을 경우, 중복 체크
    if (phone) {
      const existingStudent = await prisma.student.findFirst({
        where: {
          phone: phone,
          NOT: {
            id: studentId
          }
        }
      });

      if (existingStudent) {
        return NextResponse.json(
          { error: '이미 사용 중인 전화번호입니다.' },
          { status: 400 }
        );
      }
    }

    // 학생 정보 업데이트
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: updateData,
      select: {
        id: true,
        name: true,
        birthDate: true,
        className: true,
        teacher: true,
        phone: true,
        address: true,
        photoUrl: true,
        talents: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: '학생 정보가 성공적으로 업데이트되었습니다.',
      student: updatedStudent
    });
  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json(
      { error: '학생 정보 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
