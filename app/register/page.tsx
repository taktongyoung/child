'use client';

import { useState } from 'react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    region: '',
    interest: '',
    businessType: '',
    businessTime: '',
    operationType: '',
    visitDate: '',
    visitTime: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 폼 제출 로직 구현
    console.log(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">
            영커피 박람회 사전등록
          </h1>
          <p className="text-gray-600">
            카페 창업의 첫 걸음
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 mb-2">성명</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              placeholder="성명을 입력해주세요"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">휴대폰 번호</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              placeholder="010-0000-0000"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">창업희망지역</label>
            <input
              type="text"
              name="region"
              value={formData.region}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              placeholder="예) 서울 강남구"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">01. 카페 창업에 대한 관심도를 선택해주세요</label>
            <select
              name="interest"
              value={formData.interest}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 appearance-none bg-white"
            >
              <option value="">선택해주세요</option>
              <option value="high">매우 관심있음</option>
              <option value="medium">관심있음</option>
              <option value="low">보통</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">02. 계획 중이신 창업 예산을 선택해주세요</label>
            <select
              name="businessType"
              value={formData.businessType}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 appearance-none bg-white"
            >
              <option value="">선택해주세요</option>
              <option value="small">5천만원 미만</option>
              <option value="medium">5천만원 ~ 1억원</option>
              <option value="large">1억원 이상</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">03. 계획 중이신 창업 예상 시기를 선택해주세요</label>
            <select
              name="businessTime"
              value={formData.businessTime}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 appearance-none bg-white"
            >
              <option value="">선택해주세요</option>
              <option value="immediate">즉시</option>
              <option value="within3">3개월 이내</option>
              <option value="within6">6개월 이내</option>
              <option value="after6">6개월 이후</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">04. 창업 경험 또는 점포 운영 유무를 선택해주세요</label>
            <select
              name="operationType"
              value={formData.operationType}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 appearance-none bg-white"
            >
              <option value="">선택해주세요</option>
              <option value="none">경험 없음</option>
              <option value="current">현재 운영 중</option>
              <option value="past">과거 운영 경험 있음</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">방문 희망 날짜</label>
            <select
              name="visitDate"
              value={formData.visitDate}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 appearance-none bg-white"
            >
              <option value="">날짜를 선택해주세요</option>
              <option value="day1">2024년 3월 1일</option>
              <option value="day2">2024년 3월 2일</option>
              <option value="day3">2024년 3월 3일</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">방문 희망 시간</label>
            <select
              name="visitTime"
              value={formData.visitTime}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 appearance-none bg-white"
            >
              <option value="">시간을 선택해주세요</option>
              <option value="morning">오전 (10:00 ~ 12:00)</option>
              <option value="afternoon">오후 (13:00 ~ 17:00)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            사전등록 신청하기
          </button>
        </form>
      </div>
    </div>
  );
} 