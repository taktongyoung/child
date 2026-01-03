'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type LoginType = 'admin' | 'student' | 'teacher';

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<LoginType>('student');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let endpoint = '/api/student/login';
      if (loginType === 'admin') {
        endpoint = '/api/admin/login';
      } else if (loginType === 'teacher') {
        endpoint = '/api/teacher/login';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 로그인 성공
        if (loginType === 'admin') {
          router.push('/students');
        } else if (loginType === 'teacher') {
          router.push('/teacher-dashboard');
        } else {
          router.push('/student-dashboard');
        }
      } else {
        setError(data.error || '로그인에 실패했습니다.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">유년부 관리 시스템</h1>
            <p className="text-gray-600 mt-2">로그인하여 계속하세요</p>
          </div>

          {/* 로그인 타입 선택 탭 */}
          <div className="grid grid-cols-3 mb-6 bg-gray-100 rounded-lg p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setLoginType('student');
                setFormData({ username: '', password: '' });
                setError('');
              }}
              className={`py-2 px-2 sm:px-4 rounded-md font-medium transition-colors text-sm sm:text-base ${
                loginType === 'student'
                  ? 'bg-white text-blue-600 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              학생
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginType('teacher');
                setFormData({ username: '', password: '' });
                setError('');
              }}
              className={`py-2 px-2 sm:px-4 rounded-md font-medium transition-colors text-sm sm:text-base ${
                loginType === 'teacher'
                  ? 'bg-white text-green-600 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              선생님
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginType('admin');
                setFormData({ username: '', password: '' });
                setError('');
              }}
              className={`py-2 px-2 sm:px-4 rounded-md font-medium transition-colors text-sm sm:text-base ${
                loginType === 'admin'
                  ? 'bg-white text-blue-600 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              관리자
            </button>
          </div>

          {/* 로그인 폼 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                아이디
              </label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={loginType === 'admin' ? '관리자 아이디' : loginType === 'teacher' ? '선생님 아이디' : '이름을 입력하세요'}
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="비밀번호를 입력하세요"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 안내 메시지 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            {loginType === 'student' ? (
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">학생 로그인 안내</p>
                <p>• 아이디: 본인 이름</p>
                <p>• 초기 비밀번호: <span className="font-bold">1234</span></p>
              </div>
            ) : loginType === 'teacher' ? (
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">선생님 로그인 안내</p>
                <p>• 관리자가 등록한 아이디와 비밀번호를 사용하세요</p>
              </div>
            ) : (
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">관리자 로그인 안내</p>
                <p>• 관리자 계정으로 로그인하세요</p>
              </div>
            )}
          </div>
        </div>

        {/* 앱 다운로드 버튼 */}
        <div className="mt-6 space-y-3">
          <a
            href="/child.app_3.apk"
            download
            className="flex items-center justify-center w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            앱다운
          </a>

          {/* 2025년 데이터 보기 버튼 */}
          <a
            href="/archive/2025"
            className="flex items-center justify-center w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            2025년 데이터 보기
          </a>
        </div>

        {/* 버전 정보 */}
        <div className="text-center mt-4 text-sm text-gray-600">
          유년부 학생 기록부 & 달란트 관리 시스템
        </div>
      </div>
    </div>
  );
}
