'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';

interface Student {
  id: number;
  name: string;
  birthDate?: string;
  className: string;
  teacher: string;
  phone: string;
  address: string;
  photoUrl?: string;
  notes?: string;
}

export default function EditStudentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    className: '',
    teacher: '',
    phone: '',
    address: '',
    note: '',
    photoUrl: '',
  });

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const response = await fetch(`/api/students/${params.id}`);
        if (response.ok) {
          const student: Student = await response.json();
          console.log('Fetched student data:', student);
          
          // birthDate를 YYYY-MM-DD 형식으로 변환
          let formattedBirthDate = '';
          if (student.birthDate) {
            console.log('Original birthDate:', student.birthDate);
            try {
              const date = new Date(student.birthDate);
              if (!isNaN(date.getTime())) {
                // 로컬 시간대를 고려하여 날짜 형식 변환
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                formattedBirthDate = `${year}-${month}-${day}`;
                console.log('Formatted birthDate:', formattedBirthDate);
              }
            } catch (dateError) {
              console.error('Date parsing error:', dateError);
            }
          }
          
          setFormData({
            name: student.name,
            birthDate: formattedBirthDate,
            className: student.className,
            teacher: student.teacher,
            phone: student.phone,
            address: student.address,
            note: student.notes || '',
            photoUrl: student.photoUrl || '',
          });
          if (student.photoUrl) {
            setPreviewUrl(student.photoUrl);
          }
        } else {
          setError('학생 정보를 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('Error fetching student:', error);
        setError('학생 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch(`/api/students/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '학생 정보 수정에 실패했습니다.');
      }

      queryClient.invalidateQueries({ queryKey: ['students'] });
      router.push(`/students/${params.id}`);
    } catch (error) {
      console.error('Error updating student:', error);
      setError(error instanceof Error ? error.message : '학생 정보 수정 중 오류가 발생했습니다.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB를 초과할 수 없습니다.');
      return;
    }

    // 이미지 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    try {
      // 파일 미리보기 생성
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // FormData 생성 및 파일 추가
      const formData = new FormData();
      formData.append('file', file);

      // 파일 업로드 API 호출
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const { fileUrl } = await response.json();
        setFormData(prev => ({
          ...prev,
          photoUrl: fileUrl,
        }));
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('파일 업로드 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">학생 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.name) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href={`/students/${params.id}`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            학생 상세로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href={`/students/${params.id}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            학생 상세로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">학생 정보 수정</h1>
          <p className="text-sm text-gray-600">학생의 정보를 수정해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 mb-2">이름</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
                placeholder="학생 이름을 입력하세요"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">생년월일</label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">반</label>
            <input
              type="text"
              name="className"
              value={formData.className}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              placeholder="예) 1학년 1반"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">담임선생님</label>
            <input
              type="text"
              name="teacher"
              value={formData.teacher}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              placeholder="담임선생님 이름을 입력하세요"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">연락처</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              placeholder="010-0000-0000"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">주소</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              placeholder="주소를 입력하세요"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">증명사진 (300x300px)</label>
            <div className="flex items-start space-x-4">
              <div className="relative w-[300px] h-[300px] border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-gray-500">300x300 크기의 증명사진을<br />업로드해주세요</p>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors mb-2"
                >
                  사진 변경
                </button>
                <p className="text-xs text-gray-500">
                  - JPG, PNG 파일 가능<br />
                  - 최대 5MB<br />
                  - 권장 크기: 300x300px
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">특이사항</label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 min-h-[100px]"
              placeholder="특이사항이 있다면 입력해주세요"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              수정하기
            </button>
            <Link
              href={`/students/${params.id}`}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors text-center"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
} 