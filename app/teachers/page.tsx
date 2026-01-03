'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MobileNav from '@/app/components/MobileNav';

interface Teacher {
  id: number;
  name: string;
  username: string;
  className: string;
  phone?: string;
  email?: string;
  talents: number;
  createdAt: string;
  updatedAt: string;
}

export default function TeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    className: '',
    phone: '',
    email: '',
  });

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/teachers');
      if (response.ok) {
        const data = await response.json();
        setTeachers(data);
      }
    } catch (error) {
      console.error('선생님 목록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.username || !formData.password || !formData.className) {
      alert('이름, 아이디, 비밀번호, 담당 반은 필수입니다.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('선생님이 추가되었습니다.');
        setShowAddModal(false);
        setFormData({
          name: '',
          username: '',
          password: '',
          className: '',
          phone: '',
          email: '',
        });
        fetchTeachers();
      } else {
        alert(data.error || '선생님 추가 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('선생님 추가 오류:', error);
      alert('선생님 추가 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingTeacher) return;

    if (!formData.name || !formData.username || !formData.className) {
      alert('이름, 아이디, 담당 반은 필수입니다.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/teachers/${editingTeacher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('선생님 정보가 수정되었습니다.');
        setEditingTeacher(null);
        setFormData({
          name: '',
          username: '',
          password: '',
          className: '',
          phone: '',
          email: '',
        });
        fetchTeachers();
      } else {
        alert(data.error || '선생님 정보 수정 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('선생님 수정 오류:', error);
      alert('선생님 정보 수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (id: number, name: string) => {
    if (!confirm(`${name} 선생님을 삭제하시겠습니까?\n(해당 선생님의 모든 달란트 히스토리가 삭제됩니다.)`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teachers?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('선생님이 삭제되었습니다.');
        fetchTeachers();
      } else {
        const data = await response.json();
        alert(data.error || '선생님 삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('선생님 삭제 오류:', error);
      alert('선생님 삭제 중 오류가 발생했습니다.');
    }
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      username: teacher.username,
      password: '',
      className: teacher.className,
      phone: teacher.phone || '',
      email: teacher.email || '',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <MobileNav role="admin" userName="관리자" onLogout={handleLogout} />
      <div className="py-8 px-4 pt-20">
        <div className="max-w-6xl mx-auto">
          {/* 헤더 */}
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">선생님 관리</h1>
                <p className="text-gray-600 mt-1 sm:mt-2">총 {teachers.length}명의 선생님</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors text-sm sm:text-base"
                >
                  + 선생님 추가
                </button>
                <Link
                  href="/students"
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-center text-sm sm:text-base"
                >
                  학생 관리
                </Link>
                <Link
                  href="/"
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors text-center text-sm sm:text-base"
                >
                  대시보드
                </Link>
              </div>
            </div>
          </div>

          {/* 선생님 목록 */}
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">선생님 목록</h2>

            {teachers.length > 0 ? (
              <>
                {/* 데스크톱 테이블 뷰 */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">이름</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">아이디</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">담당 반</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">연락처</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">이메일</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">달란트</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map((teacher) => (
                        <tr key={teacher.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="font-medium text-gray-900">{teacher.name}</span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{teacher.username}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {teacher.className}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{teacher.phone || '-'}</td>
                          <td className="py-3 px-4 text-gray-600">{teacher.email || '-'}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                              {teacher.talents} T
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => openEditModal(teacher)}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 모바일 카드 뷰 */}
                <div className="lg:hidden space-y-4">
                  {teachers.map((teacher) => (
                    <div key={teacher.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 text-lg">{teacher.name}</h3>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                          {teacher.talents} T
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">아이디</span>
                          <span className="font-medium text-gray-900">{teacher.username}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">담당 반</span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {teacher.className}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">연락처</span>
                          <span className="text-gray-900">{teacher.phone || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">이메일</span>
                          <span className="text-gray-900 truncate ml-2">{teacher.email || '-'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => openEditModal(teacher)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                          className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">등록된 선생님이 없습니다.</p>
              </div>
            )}
          </div>

          {/* 선생님 추가 모달 */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">선생님 추가</h3>

                <form onSubmit={handleAddTeacher}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">이름 *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="홍길동"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">아이디 *</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="teacher1"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호 *</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="비밀번호"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">담당 반 *</label>
                    <input
                      type="text"
                      value={formData.className}
                      onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="유년부1반"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">연락처</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="010-1234-5678"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="teacher@example.com"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? '추가 중...' : '추가하기'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setFormData({
                          name: '',
                          username: '',
                          password: '',
                          className: '',
                          phone: '',
                          email: '',
                        });
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 선생님 수정 모달 */}
          {editingTeacher && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">선생님 정보 수정</h3>

                <form onSubmit={handleUpdateTeacher}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">이름 *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">아이디 *</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">새 비밀번호 (변경 시에만 입력)</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="변경하지 않으려면 비워두세요"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">담당 반 *</label>
                    <input
                      type="text"
                      value={formData.className}
                      onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">연락처</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? '수정 중...' : '수정하기'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTeacher(null);
                        setFormData({
                          name: '',
                          username: '',
                          password: '',
                          className: '',
                          phone: '',
                          email: '',
                        });
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
