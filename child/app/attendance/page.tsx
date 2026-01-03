'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { exportAttendanceToExcel } from '../utils/excelExport';

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

export default function AttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<{[key: string]: AttendanceRecord}>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchStudentsAndAttendance();
  }, [selectedDate]);

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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = async (studentId: number, status: string) => {
    // 일요일 검증 추가
    const selectedDateObj = new Date(selectedDate);
    if (selectedDateObj.getDay() !== 0) {
      alert('출석체크는 일요일에만 가능합니다.');
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

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
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
                  const day = new Date(value).getDay();
                  if (day !== 0) { // 0: 일요일
                    alert('일요일만 선택할 수 있습니다.');
                    return;
                  }
                  setSelectedDate(value);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">※ 출석체크는 일요일에만 가능합니다</p>
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    학생 정보
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    반
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    출석 상태
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    출석 체크
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => {
                  const currentStatus = getAttendanceStatus(student.id);
                  return (
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
                              {student.name}
                            </Link>
                            <div className="text-sm text-gray-500">{student.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getMainClass(student.className)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(currentStatus)}`}>
                          {getStatusText(currentStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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