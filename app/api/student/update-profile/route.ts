import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('student-token')?.value;

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

    const studentId = decoded.studentId;
    const body = await request.json();
    const { birthDate, photoUrl, address, phone } = body;

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

    if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
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
      message: '프로필이 성공적으로 업데이트되었습니다.',
      student: updatedStudent
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: '프로필 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
