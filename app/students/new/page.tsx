'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Teacher {
  id: number;
  name: string;
  className: string;
}

export default function NewStudentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [classOrder, setClassOrder] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    className: '',
    teacher: '',
    phone: '',
    address: '',
    note: '',
    photoUrl: '',
    talents: 0,
  });
  const [error, setError] = useState<string>('');

  // 선생님 목록 불러오기
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await fetch('/api/teachers');
        if (response.ok) {
          const data = await response.json();
          setTeachers(data);
          // 반 이름 정렬 (믿음, 소망, 사랑, 희락 순서)
          const classOrderPriority = ['믿음', '소망', '사랑', '희락'];
          const getClassPriority = (className: string) => {
            for (let i = 0; i < classOrderPriority.length; i++) {
              if (className.startsWith(classOrderPriority[i])) return i;
            }
            return 99;
          };
          const classes = [...new Set(data.map((t: Teacher) => t.className))].sort((a: string, b: string) => {
            const priorityA = getClassPriority(a);
            const priorityB = getClassPriority(b);
            if (priorityA !== priorityB) return priorityA - priorityB;
            return a.localeCompare(b, 'ko');
          });
          setClassOrder(classes);
        }
      } catch (error) {
        console.error('Error fetching teachers:', error);
      } finally {
        setLoadingTeachers(false);
      }
    };
    fetchTeachers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '학생 등록에 실패했습니다.');
      }

      router.push('/students');
    } catch (error) {
      console.error('Error creating student:', error);
      setError(error instanceof Error ? error.message : '학생 등록 중 오류가 발생했습니다.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // 담임선생님을 선택하면 해당 선생님의 반으로 자동 설정
    if (name === 'teacher') {
      const selectedTeacher = teachers.find(t => t.name === value);
      if (selectedTeacher) {
        setFormData(prev => ({
          ...prev,
          teacher: value,
          className: selectedTeacher.className
        }));
        return;
      }
    }

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

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">새 학생 등록</h1>
          <p className="text-sm text-gray-600">학생의 기본 정보를 입력해주세요</p>
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
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">반</label>
            <select
              name="className"
              value={formData.className}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">반을 선택하세요</option>
              {classOrder.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">담임선생님</label>
            <select
              name="teacher"
              value={formData.teacher}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              required
              disabled={loadingTeachers}
            >
              <option value="">
                {loadingTeachers ? '선생님 목록 불러오는 중...' : '담임선생님을 선택하세요'}
              </option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.name}>
                  {teacher.name} ({teacher.className})
                </option>
              ))}
            </select>
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
            <label className="block text-gray-700 mb-2">보유 달란트</label>
            <input
              type="number"
              name="talents"
              value={formData.talents}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              placeholder="0"
              min="0"
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
                  사진 선택
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
              등록하기
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 