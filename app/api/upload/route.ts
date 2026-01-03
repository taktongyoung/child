import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      );
    }

    // 파일 확장자 확인
    const fileType = file.type;
    if (!['image/jpeg', 'image/png'].includes(fileType)) {
      return NextResponse.json(
        { error: 'JPG 또는 PNG 파일만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 확인 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기는 5MB를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 파일 이름 생성 (타임스탬프 + 원본 파일명)
    const timestamp = Date.now();
    const originalName = file.name;
    const fileName = `${timestamp}-${originalName}`;

    // public/uploads 디렉토리에 파일 저장
    const path = join(process.cwd(), 'public', 'uploads', fileName);
    await writeFile(path, buffer);

    // 클라이언트에서 접근 가능한 URL 반환
    const fileUrl = `/uploads/${fileName}`;

    return NextResponse.json({ fileUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 