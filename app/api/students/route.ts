import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const student = await prisma.student.create({
      data: {
        name: data.name,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        className: data.className,
        teacher: data.teacher,
        phone: data.phone,
        address: data.address,
        photoUrl: data.photoUrl || '',
        notes: data.notes || data.note || '',
        talents: data.talents !== undefined ? parseInt(data.talents) : 0,
      },
    });
    return NextResponse.json(student);
  } catch (error: any) {
    console.error('학생 생성 오류:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('phone')) {
      return NextResponse.json(
        { error: '이미 등록된 전화번호입니다.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: '학생 정보 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        birthDate: true,
        className: true,
        teacher: true,
        phone: true,
        photoUrl: true,
        createdAt: true,
        updatedAt: true,
        talents: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const response = NextResponse.json(students);
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    
    return response;
  } catch (error) {
    console.error('학생 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '학생 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 