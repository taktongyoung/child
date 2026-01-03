'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { exportStudentsToExcel } from '../utils/excelExport';

interface Student {
  id: number;
  name: string;
  birthDate?: string;
  className: string;
  teacher: string;
  phone: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// API 함수
const fetchStudents = async (): Promise<Student[]> => {
  const response = await fetch('/api/students');
  if (!response.ok) {
    throw new Error('학생 목록을 불러오는데 실패했습니다.');
  }
  return response.json();
};

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [selectedBirthdayMonth, setSelectedBirthdayMonth] = useState(new Date().getMonth() + 1);
  const [attendanceData, setAttendanceData] = useState<{[key: string]: string}>({});
  const [attendanceDate, setAttendanceDate] = useState<string>('');
  const [smsData, setSmsData] = useState({
    title: '',
    text: '',
  });
  const [sending, setSending] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');

  // React Query를 사용한 데이터 패칭
  const {
    data: students = [],
    isLoading: loading,
    isError,
    error
  } = useQuery({
    queryKey: ['students'],
    queryFn: fetchStudents,
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
  });

  // 출석 데이터 가져오기
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (students.length === 0) return;
      
      try {
        // 가장 최근 일요일 날짜 계산
        const getMostRecentSunday = (date: Date): Date => {
          const result = new Date(date);
          const dayOfWeek = result.getDay();
          // 오늘이 일요일이면 오늘, 아니면 이전 일요일
          if (dayOfWeek === 0) {
            return result; // 오늘이 일요일
          } else {
            result.setDate(result.getDate() - dayOfWeek);
            return result;
          }
        };

        // 최근 몇 주간의 일요일들을 확인해서 출석 데이터가 있는 가장 최근 일요일 찾기
        const findRecentAttendanceData = async (): Promise<{attendanceMap: {[key: string]: string}, date: string}> => {
          const attendanceMap: {[key: string]: string} = {};
          let currentSunday = getMostRecentSunday(new Date());
          let foundDate = '';
          
          // 최대 8주 전까지 확인
          for (let week = 0; week < 8; week++) {
            const sundayDate = currentSunday.toISOString().split('T')[0];
            
            try {
              const response = await fetch(`/api/attendance?date=${sundayDate}`);
              if (response.ok) {
                const attendanceList = await response.json();
                if (attendanceList.length > 0) {
                  // 출석 데이터가 있으면 이를 사용
                  attendanceList.forEach((record: any) => {
                    attendanceMap[record.studentId] = record.status;
                  });
                  foundDate = sundayDate;
                  break; // 데이터를 찾았으므로 종료
                }
              }
            } catch (error) {
              console.error(`Error fetching attendance for ${sundayDate}:`, error);
            }
            
            // 다음 이전 일요일로 이동 (7일 빼기)
            currentSunday.setDate(currentSunday.getDate() - 7);
          }
          
          return { attendanceMap, date: foundDate };
        };

        const { attendanceMap, date } = await findRecentAttendanceData();
        setAttendanceData(attendanceMap);
        setAttendanceDate(date);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
      }
    };

    fetchAttendanceData();
  }, [students]);

  // 출석 통계 데이터 가져오기
  const [attendanceStats, setAttendanceStats] = useState<{[key: string]: {present: number, absent: number, total: number}}>({});

  useEffect(() => {
    const fetchAttendanceStats = async () => {
      if (students.length === 0) return;
      
      try {
        // 최근 30일 출석 데이터 가져오기
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
        
        const statsMap: {[key: string]: {present: number, absent: number, total: number}} = {};
        
        // 각 학생별로 출석 통계 계산
        for (const student of students) {
          try {
            const response = await fetch(`/api/students/${student.id}/attendance?from=${fromDate}`);
            if (response.ok) {
              const attendanceRecords = await response.json();
              let present = 0, absent = 0;
              
              attendanceRecords.forEach((record: any) => {
                if (record.status === 'present') present++;
                else if (record.status === 'absent') absent++;
              });
              
              statsMap[student.id] = {
                present,
                absent,
                total: attendanceRecords.length
              };
            }
          } catch (error) {
            console.error(`Error fetching stats for student ${student.id}:`, error);
            statsMap[student.id] = { present: 0, absent: 0, total: 0 };
          }
        }
        
        setAttendanceStats(statsMap);
      } catch (error) {
        console.error('Error fetching attendance stats:', error);
      }
    };

    fetchAttendanceStats();
  }, [students]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(students.map(student => student.id));
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

  // 반명 우선순위 정렬 함수
  const classOrder = ['믿음', '소망', '사랑', '희락'];
  function getClassOrderIndex(className: string) {
    const found = classOrder.findIndex(prefix => className.startsWith(prefix));
    return found === -1 ? 99 : found;
  }

  // 반 이름을 큰 카테고리로 매핑하는 함수
  const getMainClass = (className: string): string => {
    if (className.includes('믿음')) return '믿음';
    if (className.includes('소망')) return '소망';
    if (className.includes('사랑')) return '사랑';
    if (className.includes('희락')) return '희락';
    return className; // 기본값
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

  // 장기결석인지 확인하는 함수 (최근 4번 연속 결석)
  const isLongTermAbsent = (studentId: number): boolean => {
    const stats = attendanceStats[studentId];
    if (!stats) return false;
    return stats.absent >= 4;
  };

  // 출석 상태 텍스트 반환 함수
  const getAttendanceStatusText = (studentId: number): string => {
    const status = attendanceData[studentId];
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

  // 출석 상태 색상 반환 함수
  const getAttendanceStatusColor = (studentId: number): string => {
    const status = attendanceData[studentId];
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

  // 특정 월에 생일인지 확인하는 함수
  const isBirthdayInMonth = (birthDate: string | undefined, month: number): boolean => {
    if (!birthDate) return false;
    try {
      const birth = new Date(birthDate);
      return birth.getMonth() === month - 1; // JavaScript의 월은 0부터 시작
    } catch {
      return false;
    }
  };

  // 선택된 월의 생일 학생들 필터링
  const birthdayStudents = students.filter(student => 
    isBirthdayInMonth(student.birthDate, selectedBirthdayMonth)
  ).sort((a, b) => {
    if (!a.birthDate || !b.birthDate) return 0;
    const aDate = new Date(a.birthDate);
    const bDate = new Date(b.birthDate);
    return aDate.getDate() - bDate.getDate();
  });

  // 정렬된 학생 목록
  const filteredStudents = (selectedClass
    ? students.filter(student => getMainClass(student.className) === selectedClass)
    : students
  ).slice().sort((a, b) => {
    const aIdx = getClassOrderIndex(a.className);
    const bIdx = getClassOrderIndex(b.className);
    if (aIdx !== bIdx) return aIdx - bIdx;
    // 같은 그룹 내에서는 반 이름 오름차순
    return a.className.localeCompare(b.className, 'ko');
  });

  const handleSendBulkSms = async () => {
    if (selectedStudents.length === 0) {
      alert('문자를 보낼 학생을 선택해주세요.');
      return;
    }

    if (!smsData.text.trim()) {
      alert('문자 내용을 입력해주세요.');
      return;
    }

    setSending(true);

    try {
      const selectedStudentData = students.filter(student => 
        selectedStudents.includes(student.id)
      );
      
      const phoneNumbers = selectedStudentData.map(student => student.phone);

      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumbers,
          title: smsData.title.trim() || undefined,
          text: smsData.text.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`문자가 성공적으로 발송되었습니다.\n대상: ${result.recipients}명\n유형: ${result.actualMsgType || result.msgType}\n요청번호: ${result.requestNo}`);
        setShowSmsModal(false);
        setSmsData({ title: '', text: '' });
        setSelectedStudents([]);
      } else {
        alert(`문자 발송에 실패했습니다.\n${result.error}`);
      }
    } catch (error) {
      console.error('Error sending bulk SMS:', error);
      alert('문자 발송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
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

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">유년부 학생 기록부</h1>
          <p className="text-sm text-gray-600 mb-4">학생 정보를 확인하고 관리할 수 있습니다.</p>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
            <button
              onClick={() => setShowBirthdayModal(true)}
              className="inline-flex items-center px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-md hover:bg-pink-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
              생일 검색
            </button>
            
            <Link
              href="/bulk-sms"
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-2M3 4h6v4H3V4zm6 0h6v4H9V4z" />
              </svg>
              단체문자
            </Link>
            
            <Link
              href="/attendance"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              출석부
            </Link>
            
            {selectedStudents.length > 0 && (
              <button
                onClick={() => setShowSmsModal(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                선택한 {selectedStudents.length}명에게 문자 보내기
              </button>
            )}

            <button
              onClick={() => exportStudentsToExcel(filteredStudents)}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              엑셀 다운로드
            </button>
            
            <Link
              href="/students/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              새 학생 등록
            </Link>
          </div>
        </div>

        <div className="mb-8">
          <label className="mr-2 font-medium text-gray-700">반 선택:</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체</option>
            {classOrder.map((className) => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>
          <span className="ml-4 text-gray-500">총 {filteredStudents.length}명의 학생</span>
          {attendanceDate && (
            <div className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
              📋 출석 상태: {new Date(attendanceDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} (일요일) 기준
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    학생 정보
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    반
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    담임선생님
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    연락처
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    선택
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
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
                            {isLongTermAbsent(student.id) && (
                              <span className="inline-block mr-1" title="장기결석 (4회 이상)">
                                ⚠️
                              </span>
                            )}
                            {student.name}
                          </Link>
                          <div className="flex items-center mt-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAttendanceStatusColor(student.id)}`}>
                              {getAttendanceStatusText(student.id)}
                            </span>
                            {attendanceDate && (
                              <span className="ml-2 text-xs text-gray-500">
                                ({new Date(attendanceDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getMainClass(student.className)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {student.teacher}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>
                        <div>{student.phone}</div>
                        <div className="text-xs mt-1">
                          <span className="text-gray-500">출결사항: </span>
                          {(() => {
                            const stats = attendanceStats[student.id];
                            if (!stats) return <span className="text-gray-400">통계 없음</span>;
                            return (
                              <>
                                <span className="text-green-600 font-medium">{stats.present}</span>
                                <span className="text-gray-500">/</span>
                                <span className="text-red-600 font-medium">{stats.absent}</span>
                                <span className="text-gray-500">/</span>
                                <span className="text-gray-600">{stats.total}</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => handleSelectStudent(student.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 일괄 SMS 발송 모달 */}
      {showSmsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">일괄 문자 보내기</h3>
              <button
                onClick={() => setShowSmsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                받는 사람: <span className="font-medium">{selectedStudents.length}명</span>
              </p>
              <div className="max-h-24 overflow-y-auto text-xs text-gray-500">
                {students
                  .filter(student => selectedStudents.includes(student.id))
                  .map(student => `${student.name} (${student.phone})`)
                  .join(', ')}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목 (선택사항)
                </label>
                <input
                  type="text"
                  value={smsData.title}
                  onChange={(e) => setSmsData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="제목을 입력하면 장문(LMS)으로 발송됩니다"
                  maxLength={40}
                />
                <p className="text-xs text-gray-500 mt-1">최대 40자</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  문자 내용 *
                </label>
                <textarea
                  value={smsData.text}
                  onChange={(e) => setSmsData(prev => ({ ...prev, text: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  placeholder="문자 내용을 입력하세요"
                  maxLength={2000}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {smsData.text.length}/2000자 
                  {smsData.text.length > 90 || (smsData.title && smsData.title.trim().length > 0) ? ' (장문 LMS)' : ' (단문 SMS)'}
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSendBulkSms}
                disabled={sending || !smsData.text.trim() || selectedStudents.length === 0}
                className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {sending ? '발송 중...' : `${selectedStudents.length}명에게 문자 발송`}
              </button>
              <button
                onClick={() => setShowSmsModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 생일 검색 모달 */}
      {showBirthdayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">생일 검색</h3>
              <button
                onClick={() => setShowBirthdayModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">월 선택</label>
              <select
                value={selectedBirthdayMonth}
                onChange={(e) => setSelectedBirthdayMonth(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value={1}>1월</option>
                <option value={2}>2월</option>
                <option value={3}>3월</option>
                <option value={4}>4월</option>
                <option value={5}>5월</option>
                <option value={6}>6월</option>
                <option value={7}>7월</option>
                <option value={8}>8월</option>
                <option value={9}>9월</option>
                <option value={10}>10월</option>
                <option value={11}>11월</option>
                <option value={12}>12월</option>
              </select>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                {selectedBirthdayMonth}월 생일인 학생: <span className="font-medium">{birthdayStudents.length}명</span>
              </p>
            </div>

            {birthdayStudents.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          학생 정보
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          생일
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          반
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          담임선생님
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          연락처
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {birthdayStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
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
                                  <span className="inline-block mr-1">🎂</span>
                                  {student.name}
                                </Link>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {student.birthDate ? new Date(student.birthDate).toLocaleDateString('ko-KR') : '미입력'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {student.className}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {student.teacher}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {student.phone}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                </div>
                <p className="text-gray-500">{selectedBirthdayMonth}월에 생일인 학생이 없습니다.</p>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowBirthdayModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
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