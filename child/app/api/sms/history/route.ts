import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// SMS 발송 이력 조회
export async function GET(request: NextRequest) {
  try {
    const smsHistory = await prisma.smsHistory.findMany({
      orderBy: {
        sentAt: 'desc',
      },
      take: 50, // 최근 50개만 조회
    });

    return NextResponse.json(smsHistory);
  } catch (error) {
    console.error('SMS 이력 조회 오류:', error);
    return NextResponse.json(
      { error: 'SMS 이력을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// SMS 발송 이력 저장
export async function POST(request: NextRequest) {
  try {
    const { recipients, title, content, msgType, requestNo } = await request.json();

    if (!recipients || !content || !msgType) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const smsHistory = await prisma.smsHistory.create({
      data: {
        recipients: parseInt(recipients),
        title: title || null,
        content: content,
        msgType: msgType,
        requestNo: requestNo || null,
        status: 'success', // 성공한 경우만 저장
        sentAt: new Date(),
      },
    });

    return NextResponse.json(smsHistory);
  } catch (error) {
    console.error('SMS 이력 저장 오류:', error);
    return NextResponse.json(
      { error: 'SMS 이력 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 