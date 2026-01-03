import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// 상품 구매
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 쿠키에서 토큰 가져오기
    const token = request.cookies.get('student-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 토큰 검증
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    const productId = parseInt(params.id);
    const { quantity = 1, requirements = '' } = await request.json();

    if (quantity <= 0) {
      return NextResponse.json(
        { error: '수량은 1개 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 트랜잭션으로 구매 처리
    const result = await prisma.$transaction(async (tx) => {
      // 상품 조회
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error('상품을 찾을 수 없습니다.');
      }

      if (!product.isAvailable) {
        throw new Error('현재 판매하지 않는 상품입니다.');
      }

      if (product.stock < quantity) {
        throw new Error('재고가 부족합니다.');
      }

      // 학생 정보 조회
      const student = await tx.student.findUnique({
        where: { id: decoded.studentId },
      });

      if (!student) {
        throw new Error('학생 정보를 찾을 수 없습니다.');
      }

      const totalPrice = product.price * quantity;

      if (student.talents < totalPrice) {
        throw new Error('달란트가 부족합니다.');
      }

      // 달란트 차감
      const beforeBalance = student.talents;
      const afterBalance = beforeBalance - totalPrice;

      await tx.student.update({
        where: { id: decoded.studentId },
        data: { talents: afterBalance },
      });

      // 달란트 히스토리 생성
      await tx.talentHistory.create({
        data: {
          studentId: decoded.studentId,
          amount: -totalPrice,
          beforeBalance,
          afterBalance,
          reason: `상품 구매: ${product.name} (${quantity}개)`,
          type: 'purchase',
        },
      });

      // 재고 감소
      await tx.product.update({
        where: { id: productId },
        data: { stock: product.stock - quantity },
      });

      // 구매 내역 생성
      const purchase = await tx.purchase.create({
        data: {
          studentId: decoded.studentId,
          productId,
          quantity,
          totalPrice,
          requirements: requirements || null,
          status: 'completed',
        },
        include: {
          product: true,
        },
      });

      return { purchase, afterBalance };
    });

    return NextResponse.json({
      success: true,
      message: '구매가 완료되었습니다.',
      purchase: result.purchase,
      remainingTalents: result.afterBalance,
    });
  } catch (error: any) {
    console.error('상품 구매 오류:', error);
    return NextResponse.json(
      { error: error.message || '구매 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
