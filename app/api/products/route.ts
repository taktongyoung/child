import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 상품 목록 조회
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('상품 조회 오류:', error);
    return NextResponse.json(
      { error: '상품 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 상품 등록
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.name || !data.price) {
      return NextResponse.json(
        { error: '상품명과 가격은 필수입니다.' },
        { status: 400 }
      );
    }

    if (data.price < 0 || data.stock < 0) {
      return NextResponse.json(
        { error: '가격과 재고는 0 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description || '',
        price: parseInt(data.price),
        category: data.category || '생활용품',
        imageUrl: data.imageUrl || null,
        stock: parseInt(data.stock) || 0,
        isAvailable: data.isAvailable !== false,
      },
    });

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error('상품 등록 오류:', error);
    return NextResponse.json(
      { error: '상품 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
