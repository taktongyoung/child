'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MobileNav from '@/app/components/MobileNav';

interface Student {
  id: number;
  name: string;
  className: string;
  teacher: string;
  phone: string;
  photoUrl?: string;
  talents: number;
}

interface TalentHistory {
  id: number;
  amount: number;
  beforeBalance: number;
  afterBalance: number;
  reason: string;
  type: string;
  createdAt: string;
}

interface WeeklyActivity {
  id: number;
  studentId: number;
  date: string;
  bible: boolean;
  recitation: boolean;
  qt: boolean;
  phone: boolean;
}

interface Teacher {
  id: number;
  name: string;
  className: string;
}

// API 함수
const fetchStudents = async (): Promise<Student[]> => {
  const response = await fetch('/api/students');
  if (!response.ok) {
    throw new Error('학생 목록을 불러오는데 실패했습니다.');
  }
  return response.json();
};

// 이번 주 일요일 계산
const getThisSunday = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - dayOfWeek);
  return sunday.toISOString().split('T')[0];
};

export default function TalentsPage() {
  const queryClient = useQueryClient();
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'talents'>('name');
  const [searchName, setSearchName] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [talentHistory, setTalentHistory] = useState<TalentHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getThisSunday());
  const [weeklyActivities, setWeeklyActivities] = useState<{ [studentId: number]: WeeklyActivity }>({});
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [classOrder, setClassOrder] = useState<string[]>([]);

  // React Query를 사용한 데이터 패칭
  const {
    data: students = [],
    isLoading: loading,
    isError,
    error
  } = useQuery({
    queryKey: ['students'],
    queryFn: fetchStudents,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // 선생님 데이터에서 반 목록 가져오기
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await fetch('/api/teachers');
        if (response.ok) {
          const teachers: Teacher[] = await response.json();
          // 반 이름 정렬 (믿음, 소망, 사랑, 희락 순서)
          const classOrderPriority = ['믿음', '소망', '사랑', '희락'];
          const getClassPriority = (className: string) => {
            for (let i = 0; i < classOrderPriority.length; i++) {
              if (className.startsWith(classOrderPriority[i])) return i;
            }
            return 99;
          };
          const classes = [...new Set(teachers.map(t => t.className))].sort((a, b) => {
            const priorityA = getClassPriority(a);
            const priorityB = getClassPriority(b);
            if (priorityA !== priorityB) return priorityA - priorityB;
            return a.localeCompare(b, 'ko');
          });
          setClassOrder(classes);
        }
      } catch (error) {
        console.error('선생님 목록 조회 오류:', error);
      }
    };
    fetchTeachers();
  }, []);

  // 반명 우선순위 정렬 함수
  function getClassOrderIndex(className: string) {
    const idx = classOrder.indexOf(className);
    return idx === -1 ? 99 : idx;
  }

  // 반 이름을 그대로 반환하는 함수 (학생이 속한 반 그대로 표시)
  const getMainClass = (className: string): string => {
    return className;
  };

  // 정렬된 학생 목록
  const filteredStudents = students
    .filter(student => {
      // 반 필터링
      if (selectedClass && getMainClass(student.className) !== selectedClass) {
        return false;
      }
      // 이름 검색 필터링
      if (searchName && !student.name.toLowerCase().includes(searchName.toLowerCase())) {
        return false;
      }
      return true;
    })
    .slice()
    .sort((a, b) => {
      if (sortBy === 'talents') {
        return b.talents - a.talents; // 달란트 많은 순
      } else {
        const aIdx = getClassOrderIndex(a.className);
        const bIdx = getClassOrderIndex(b.className);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.className.localeCompare(b.className, 'ko');
      }
    });

  // 주간 활동 데이터 가져오기
  useEffect(() => {
    const fetchActivities = async () => {
      if (!selectedDate) return;

      setLoadingActivities(true);
      try {
        const response = await fetch(`/api/weekly-activities?date=${selectedDate}`);
        if (response.ok) {
          const data = await response.json();
          const activitiesMap: { [studentId: number]: WeeklyActivity } = {};
          data.forEach((activity: WeeklyActivity) => {
            activitiesMap[activity.studentId] = activity;
          });
          setWeeklyActivities(activitiesMap);
        }
      } catch (error) {
        console.error('주간 활동 조회 오류:', error);
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchActivities();
  }, [selectedDate]);

  // 활동 체크 토글
  const handleActivityToggle = async (studentId: number, activityType: 'bible' | 'recitation' | 'qt' | 'phone', currentValue: boolean) => {
    try {
      const response = await fetch('/api/weekly-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          date: selectedDate,
          activityType,
          checked: !currentValue,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // 활동 상태 업데이트
        setWeeklyActivities(prev => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            studentId,
            date: selectedDate,
            [activityType]: !currentValue,
          } as WeeklyActivity,
        }));

        // 학생 달란트 업데이트를 위해 쿼리 무효화
        queryClient.invalidateQueries({ queryKey: ['students'] });
      } else {
        alert(result.error || '활동 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('활동 토글 오류:', error);
      alert('활동 업데이트 중 오류가 발생했습니다.');
    }
  };

  // 학생별 활동 상태 가져오기
  const getStudentActivity = (studentId: number) => {
    return weeklyActivities[studentId] || { bible: false, recitation: false, qt: false, phone: false };
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(filteredStudents.map(student => student.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId: number, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleAdjustTalents = async () => {
    if (selectedStudents.length === 0) {
      alert('달란트를 조정할 학생을 선택해주세요.');
      return;
    }

    if (!adjustAmount || adjustAmount === '0') {
      alert('달란트 금액을 입력해주세요.');
      return;
    }

    setAdjusting(true);

    try {
      const response = await fetch('/api/talents', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds: selectedStudents,
          amount: parseInt(adjustAmount),
          reason: adjustReason,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(result.message);
        setShowAdjustModal(false);
        setAdjustAmount('');
        setAdjustReason('');
        setSelectedStudents([]);
        queryClient.invalidateQueries({ queryKey: ['students'] });
      } else {
        alert(`달란트 조정에 실패했습니다.\n${result.error}`);
      }
    } catch (error) {
      console.error('Error adjusting talents:', error);
      alert('달란트 조정 중 오류가 발생했습니다.');
    } finally {
      setAdjusting(false);
    }
  };

  const handleIndividualAdjust = async (studentId: number, studentName: string) => {
    const amount = prompt(`${studentName} 학생의 달란트를 조정합니다.\n지급할 달란트를 입력하세요 (차감은 음수로 입력):`);

    if (amount === null) return; // 취소

    const parsedAmount = parseInt(amount);
    if (isNaN(parsedAmount) || parsedAmount === 0) {
      alert('유효한 숫자를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/talents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentId,
          amount: parsedAmount,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(result.message);
        queryClient.invalidateQueries({ queryKey: ['students'] });

        // 히스토리 모달이 열려있으면 히스토리도 새로고침
        if (showHistoryModal && selectedStudent?.id === studentId) {
          handleShowHistory(studentId);
        }
      } else {
        alert(`달란트 조정에 실패했습니다.\n${result.error}`);
      }
    } catch (error) {
      console.error('Error adjusting talents:', error);
      alert('달란트 조정 중 오류가 발생했습니다.');
    }
  };

  const handleShowHistory = async (studentId: number) => {
    setLoadingHistory(true);
    setShowHistoryModal(true);

    try {
      const response = await fetch(`/api/talents/history?studentId=${studentId}`);
      const result = await response.json();

      if (response.ok) {
        setSelectedStudent(result.student);
        setTalentHistory(result.history);
      } else {
        alert(`히스토리 조회에 실패했습니다.\n${result.error}`);
        setShowHistoryModal(false);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      alert('히스토리 조회 중 오류가 발생했습니다.');
      setShowHistoryModal(false);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleRowClick = (student: Student, event: React.MouseEvent) => {
    // 체크박스나 조정 버튼 클릭 시에는 히스토리를 열지 않음
    const target = event.target as HTMLElement;
    if (target.closest('input[type="checkbox"]') || target.closest('button')) {
      return;
    }
    handleShowHistory(student.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">학생 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            {error instanceof Error ? error.message : '데이터를 불러오는 중 오류가 발생했습니다.'}
          </p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['students'] })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
      });

      if (response.ok) {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <MobileNav role="admin" userName="관리자" onLogout={handleLogout} />
      <div className="max-w-6xl mx-auto px-4 py-8 pt-20">
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">달란트 관리</h1>
              <p className="text-xs md:text-sm text-gray-600">학생들의 달란트를 지급하거나 차감할 수 있습니다.</p>
            </div>
            <div className="flex space-x-2 sm:space-x-3">
              <Link
                href="/admin/settings"
                className="inline-flex items-center px-3 py-2 md:px-4 bg-indigo-600 text-white text-xs md:text-sm font-medium rounded-md hover:bg-indigo-700"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden md:inline">설정</span>
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 md:px-4 bg-gray-600 text-white text-xs md:text-sm font-medium rounded-md hover:bg-gray-700"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden md:inline">로그아웃</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">달란트 자동 지급 안내</p>
                <p>출석 체크 시 자동으로 10달란트가 지급됩니다. 성경/암송/큐티/휴대폰 체크 시 각각 10달란트가 지급됩니다.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 날짜 선택 */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">주간 활동 날짜:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {loadingActivities && (
                <span className="text-xs text-gray-500">로딩중...</span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              체크 시 10달란트 지급 / 해제 시 10달란트 차감
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-6 md:mb-8">
          {/* 필터 영역 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
            <div className="col-span-1">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">반 선택</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                {classOrder.map((className) => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">정렬</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'talents')}
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">이름순</option>
                <option value="talents">달란트순</option>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">이름 검색</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="학생 이름..."
                  className="w-full px-2 py-2 pr-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchName && (
                  <button
                    onClick={() => setSearchName('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title="검색 초기화"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 액션 버튼 영역 */}
          <div className="flex flex-wrap gap-2">
            {selectedStudents.length > 0 && (
              <button
                onClick={() => setShowAdjustModal(true)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 bg-yellow-600 text-white text-xs md:text-sm font-medium rounded-md hover:bg-yellow-700"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">선택한 </span>{selectedStudents.length}명 조정
              </button>
            )}

            <Link
              href="/students"
              className="inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-xs md:text-sm font-medium rounded-md hover:bg-blue-700"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              학생 목록
            </Link>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs md:text-sm text-gray-500">총 {filteredStudents.length}명</span>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
            />
            <span className="text-xs md:text-sm text-gray-700">전체 선택</span>
          </label>
        </div>

        {/* 데스크톱 테이블 뷰 */}
        <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    선택
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    반
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    보유 달란트
                  </th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    성경
                  </th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    암송
                  </th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    큐티
                  </th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    휴대폰
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => {
                  const activity = getStudentActivity(student.id);
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={(e) => handleRowClick(student, e)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={(e) => handleSelectStudent(student.id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getMainClass(student.className)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-yellow-100 text-yellow-800">
                          {student.talents} 달란트
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={activity.bible}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleActivityToggle(student.id, 'bible', activity.bible);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={activity.recitation}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleActivityToggle(student.id, 'recitation', activity.recitation);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={activity.qt}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleActivityToggle(student.id, 'qt', activity.qt);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={activity.phone}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleActivityToggle(student.id, 'phone', activity.phone);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIndividualAdjust(student.id, student.name);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          조정
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 모바일 카드 뷰 */}
        <div className="md:hidden space-y-2">
          {filteredStudents.map((student) => {
            const activity = getStudentActivity(student.id);
            return (
              <div
                key={student.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer active:bg-gray-50"
                onClick={(e) => handleRowClick(student, e)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={(e) => handleSelectStudent(student.id, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{student.name}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {getMainClass(student.className)}
                        </span>
                      </div>
                      <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                        {student.talents} 달란트
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleIndividualAdjust(student.id, student.name);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                  >
                    조정
                  </button>
                </div>
                {/* 활동 체크박스 */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={activity.bible}
                      onChange={() => handleActivityToggle(student.id, 'bible', activity.bible)}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-xs text-gray-600">성경</span>
                  </label>
                  <label className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={activity.recitation}
                      onChange={() => handleActivityToggle(student.id, 'recitation', activity.recitation)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-600">암송</span>
                  </label>
                  <label className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={activity.qt}
                      onChange={() => handleActivityToggle(student.id, 'qt', activity.qt)}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs text-gray-600">큐티</span>
                  </label>
                  <label className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={activity.phone}
                      onChange={() => handleActivityToggle(student.id, 'phone', activity.phone)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-xs text-gray-600">휴대폰</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 달란트 조정 모달 */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">달란트 조정</h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                대상: <span className="font-medium">{selectedStudents.length}명</span>
              </p>
              <div className="max-h-24 overflow-y-auto text-xs text-gray-500 bg-gray-50 p-2 rounded">
                {students
                  .filter(student => selectedStudents.includes(student.id))
                  .map(student => student.name)
                  .join(', ')}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  달란트 금액 *
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="지급할 달란트 (차감은 음수로 입력)"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">예: 10 (지급), -5 (차감)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사유 (선택사항)
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="달란트 조정 사유를 입력하세요"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAdjustTalents}
                disabled={adjusting || !adjustAmount || adjustAmount === '0'}
                className="flex-1 bg-yellow-600 text-white py-2 rounded-md hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {adjusting ? '처리 중...' : '달란트 조정'}
              </button>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 달란트 히스토리 모달 */}
      {showHistoryModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-3xl max-h-[90vh] md:max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-3 md:mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">
                {selectedStudent.name} 달란트 내역
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-3 md:mb-4 p-3 md:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">반: {selectedStudent.className}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs md:text-sm text-gray-600">현재 보유</p>
                  <p className="text-xl md:text-2xl font-bold text-yellow-600">{selectedStudent.talents} 달란트</p>
                </div>
              </div>
            </div>

            {loadingHistory ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 text-sm">내역을 불러오는 중...</p>
                </div>
              </div>
            ) : talentHistory.length > 0 ? (
              <div className="flex-1 overflow-auto">
                {/* 데스크톱 테이블 뷰 */}
                <table className="hidden md:table min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        날짜
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        사유
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        변동
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        변경 전
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        변경 후
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {talentHistory.map((history) => (
                      <tr key={history.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {new Date(history.createdAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {history.reason}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                              history.amount > 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {history.amount > 0 ? '+' : ''}{history.amount}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-center">
                          {history.beforeBalance}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                          {history.afterBalance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* 모바일 카드 뷰 */}
                <div className="md:hidden space-y-2">
                  {talentHistory.map((history) => (
                    <div key={history.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-gray-500">
                          {new Date(history.createdAt).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            history.amount > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {history.amount > 0 ? '+' : ''}{history.amount}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{history.reason}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <span>{history.beforeBalance}</span>
                        <svg className="w-3 h-3 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="font-medium text-gray-700">{history.afterBalance}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 text-sm">아직 달란트 내역이 없습니다.</p>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-4 md:mt-6 pt-3 md:pt-4 border-t">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full md:w-auto px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
