'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { exportAttendanceToExcel } from '../utils/excelExport';
import MobileNav from '@/app/components/MobileNav';

interface Student {
  id: number;
  name: string;
  birthDate?: string;
  className: string;
  teacher: string;
  phone: string;
  photoUrl?: string;
}

interface AttendanceRecord {
  id: number;
  date: string;
  status: string;
  studentId: number;
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

export default function AttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<{[key: string]: AttendanceRecord}>({});
  const [weeklyActivities, setWeeklyActivities] = useState<{[key: number]: WeeklyActivity}>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [classOrder, setClassOrder] = useState<string[]>([]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    fetchStudentsAndAttendance();
  }, [selectedDate]);

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/teachers');
      if (response.ok) {
        const teachers: Teacher[] = await response.json();
        // 선생님들의 반 이름을 중복 제거하여 믿음, 소망, 사랑, 희락 순으로 정렬
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

  const fetchStudentsAndAttendance = async () => {
    setLoading(true);
    try {
      // 학생 목록 가져오기
      const studentsResponse = await fetch('/api/students');
      const studentsData = await studentsResponse.json();
      setStudents(studentsData);

      // 출석 데이터 가져오기
      const attendanceResponse = await fetch(`/api/attendance?date=${selectedDate}`);
      if (attendanceResponse.ok) {
        const attendanceList = await attendanceResponse.json();
        const attendanceMap: {[key: string]: AttendanceRecord} = {};
        attendanceList.forEach((record: AttendanceRecord) => {
          attendanceMap[`${record.studentId}`] = record;
        });
        setAttendanceData(attendanceMap);
      }

      // 주간 활동 데이터 가져오기
      const activitiesResponse = await fetch(`/api/weekly-activities?date=${selectedDate}`);
      if (activitiesResponse.ok) {
        const activitiesList = await activitiesResponse.json();
        const activitiesMap: {[key: number]: WeeklyActivity} = {};
        activitiesList.forEach((activity: WeeklyActivity) => {
          activitiesMap[activity.studentId] = activity;
        });
        setWeeklyActivities(activitiesMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 학생별 활동 상태 가져오기
  const getStudentActivity = (studentId: number): WeeklyActivity => {
    return weeklyActivities[studentId] || { id: 0, studentId, date: selectedDate, bible: false, recitation: false, qt: false, phone: false };
  };

  // 활동 체크 토글
  const handleActivityToggle = async (studentId: number, activityType: 'bible' | 'recitation' | 'qt' | 'phone', currentValue: boolean) => {
    // 출석 가능 날짜 검증 (일요일 또는 12월 25일)
    if (!isValidAttendanceDate(selectedDate)) {
      alert('활동 체크는 일요일 또는 12월 25일(성탄절)에만 가능합니다.');
      return;
    }

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
            id: result.activity?.id || prev[studentId]?.id || 0,
            studentId,
            date: selectedDate,
            bible: activityType === 'bible' ? !currentValue : (prev[studentId]?.bible || false),
            recitation: activityType === 'recitation' ? !currentValue : (prev[studentId]?.recitation || false),
            qt: activityType === 'qt' ? !currentValue : (prev[studentId]?.qt || false),
            phone: activityType === 'phone' ? !currentValue : (prev[studentId]?.phone || false),
          } as WeeklyActivity,
        }));
      } else {
        alert(result.error || '활동 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('활동 토글 오류:', error);
      alert('활동 업데이트 중 오류가 발생했습니다.');
    }
  };

  // 출석 가능한 날짜인지 확인 (일요일 또는 12월 25일)
  const isValidAttendanceDate = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const isSunday = date.getDay() === 0;
    const isChristmas = date.getMonth() === 11 && date.getDate() === 25; // 12월 25일
    return isSunday || isChristmas;
  };

  const handleAttendanceChange = async (studentId: number, status: string) => {
    // 출석 가능 날짜 검증 (일요일 또는 12월 25일)
    if (!isValidAttendanceDate(selectedDate)) {
      alert('출석체크는 일요일 또는 12월 25일(성탄절)에만 가능합니다.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          date: selectedDate,
          status,
        }),
      });

      if (response.ok) {
        const newRecord = await response.json();
        setAttendanceData(prev => ({
          ...prev,
          [studentId.toString()]: newRecord
        }));
      } else {
        const errorData = await response.json();
        alert(errorData.error || '출석 체크 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('출석 체크 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const getAttendanceStatus = (studentId: number): string => {
    return attendanceData[studentId.toString()]?.status || '';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'present':
        return '출석';
      case 'absent':
        return '결석';
      case 'late':
        return '지각';
      default:
        return '미체크';
    }
  };

  const getAttendanceStats = () => {
    const stats = { present: 0, absent: 0, late: 0, unchecked: 0 };
    students.forEach(student => {
      const status = getAttendanceStatus(student.id);
      if (status === 'present') stats.present++;
      else if (status === 'absent') stats.absent++;
      else if (status === 'late') stats.late++;
      else stats.unchecked++;
    });
    return stats;
  };

  const stats = getAttendanceStats();

  // 반명 우선순위 정렬 함수
  function getClassOrderIndex(className: string) {
    const idx = classOrder.indexOf(className);
    return idx === -1 ? 99 : idx;
  }

  // 반 이름을 그대로 반환하는 함수 (학생이 속한 반 그대로 표시)
  const getMainClass = (className: string): string => {
    return className;
  };

  // 생일인지 확인하는 함수
  const isBirthdayThisMonth = (birthDate: string | undefined): boolean => {
    if (!birthDate) return false;
    try {
      const birth = new Date(birthDate);
      const now = new Date();
      return birth.getMonth() === now.getMonth();
    } catch {
      return false;
    }
  };

  // 정렬된 학생 목록
  const filteredStudents = students
    .filter(student => {
      // 반 필터링 (큰 카테고리 기준)
      if (selectedClass && getMainClass(student.className) !== selectedClass) {
        return false;
      }
      // 이름 검색 필터링
      if (searchTerm && !student.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    })
    .slice().sort((a, b) => {
      const aIdx = getClassOrderIndex(a.className);
      const bIdx = getClassOrderIndex(b.className);
      if (aIdx !== bIdx) return aIdx - bIdx;
      // 같은 그룹 내에서는 반 이름 오름차순
      return a.className.localeCompare(b.className, 'ko');
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">출석부를 불러오는 중...</p>
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
        <div className="mb-4 flex justify-end space-x-3">
          <Link
            href="/admin/settings"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            설정
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <Link
              href="/students"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              학생 목록으로 돌아가기
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">출석부</h1>
            <p className="text-sm text-gray-600">
              총 {filteredStudents.length}명의 학생
              {(searchTerm || selectedClass) && (
                <span className="ml-2 text-blue-600">
                  {searchTerm && `"${searchTerm}" 검색`}
                  {searchTerm && selectedClass && ', '}
                  {selectedClass && `${selectedClass}반 필터`}
                </span>
              )}
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">날짜 선택</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!isValidAttendanceDate(value)) {
                    alert('일요일 또는 12월 25일(성탄절)만 선택할 수 있습니다.');
                    return;
                  }
                  setSelectedDate(value);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">※ 출석체크는 일요일 또는 12월 25일(성탄절)에 가능합니다</p>
            </div>
            
            <button
              onClick={() => {
                const attendanceList = Object.values(attendanceData).map(record => ({
                  ...record,
                  student: students.find(s => s.id === record.studentId)
                })).filter(record => record.student);
                exportAttendanceToExcel(attendanceList, selectedDate);
              }}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              출석 데이터 엑셀 다운로드
            </button>
          </div>
        </div>

        {/* 필터 옵션 */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">반 선택</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 반</option>
              {classOrder.map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">학생 검색</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="학생 이름을 입력하세요..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 달란트 안내 */}
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">달란트 자동 지급 안내</p>
              <p>출석 체크 시 <span className="font-semibold">10달란트</span>, 성경/암송/큐티/휴대폰 체크 시 각각 <span className="font-semibold">10달란트</span>가 자동 지급됩니다. (해제 시 차감)</p>
            </div>
          </div>
        </div>

        {/* 출석 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
            <div className="text-sm text-green-700">출석</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
            <div className="text-sm text-red-700">결석</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
            <div className="text-sm text-yellow-700">지각</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-600">{stats.unchecked}</div>
            <div className="text-sm text-gray-700">미체크</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    학생 정보
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    반
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    출석 상태
                  </th>
                  <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    성경
                  </th>
                  <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    암송
                  </th>
                  <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    큐티
                  </th>
                  <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    휴대폰
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    출석 체크
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => {
                  const currentStatus = getAttendanceStatus(student.id);
                  const activity = getStudentActivity(student.id);
                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {student.photoUrl ? (
                            <div className="h-10 w-10 flex-shrink-0">
                              <Image
                                src={student.photoUrl}
                                alt={student.name}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">{student.name[0]}</span>
                            </div>
                          )}
                          <div className="ml-4">
                            <Link
                              href={`/students/${student.id}`}
                              className="text-sm font-medium text-gray-900 hover:text-blue-600"
                            >
                              {isBirthdayThisMonth(student.birthDate) && (
                                <span className="inline-block mr-1" title="이번 달 생일">
                                  🎂
                                </span>
                              )}
                              {student.name}
                            </Link>
                            <div className="text-sm text-gray-500">{student.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getMainClass(student.className)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(currentStatus)}`}>
                          {getStatusText(currentStatus)}
                        </span>
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={activity.bible}
                          onChange={() => handleActivityToggle(student.id, 'bible', activity.bible)}
                          className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                          disabled={saving}
                        />
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={activity.recitation}
                          onChange={() => handleActivityToggle(student.id, 'recitation', activity.recitation)}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          disabled={saving}
                        />
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={activity.qt}
                          onChange={() => handleActivityToggle(student.id, 'qt', activity.qt)}
                          className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          disabled={saving}
                        />
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={activity.phone}
                          onChange={() => handleActivityToggle(student.id, 'phone', activity.phone)}
                          className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                          disabled={saving}
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAttendanceChange(student.id, 'present')}
                            disabled={saving}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                              currentStatus === 'present'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                            }`}
                          >
                            출석
                          </button>
                          <button
                            onClick={() => handleAttendanceChange(student.id, 'late')}
                            disabled={saving}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                              currentStatus === 'late'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-yellow-100'
                            }`}
                          >
                            지각
                          </button>
                          <button
                            onClick={() => handleAttendanceChange(student.id, 'absent')}
                            disabled={saving}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                              currentStatus === 'absent'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                            }`}
                          >
                            결석
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}