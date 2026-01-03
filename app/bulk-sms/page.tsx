'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Student {
  id: number;
  name: string;
  className: string;
  teacher: string;
  phone: string;
  photoUrl?: string;
}

interface SmsHistory {
  id: number;
  recipients: number;
  title?: string;
  content: string;
  msgType: string;
  sentAt: string;
  status: string;
}

// API 함수들
const fetchStudents = async (): Promise<Student[]> => {
  const response = await fetch('/api/students');
  if (!response.ok) {
    throw new Error('학생 목록을 불러오는데 실패했습니다.');
  }
  return response.json();
};

const fetchSmsHistory = async (): Promise<SmsHistory[]> => {
  const response = await fetch('/api/sms/history');
  if (!response.ok) {
    throw new Error('SMS 이력을 불러오는데 실패했습니다.');
  }
  return response.json();
};

export default function BulkSmsPage() {
  const queryClient = useQueryClient();
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [classFilter, setClassFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [smsData, setSmsData] = useState({
    title: '',
    text: '',
  });
  const [sending, setSending] = useState(false);

  // React Query를 사용한 데이터 패칭
  const {
    data: students = [],
    isLoading: studentsLoading,
    isError: studentsError
  } = useQuery({
    queryKey: ['students'],
    queryFn: fetchStudents,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const {
    data: smsHistory = [],
    isLoading: historyLoading
  } = useQuery({
    queryKey: ['smsHistory'],
    queryFn: fetchSmsHistory,
    staleTime: 30 * 1000, // 30초
    gcTime: 5 * 60 * 1000, // 5분
  });

  // 필터링 로직
  React.useEffect(() => {
    let filtered = students;

    if (classFilter) {
      filtered = filtered.filter(student => student.className === classFilter);
    }

    if (searchFilter) {
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        student.phone.includes(searchFilter)
      );
    }

    setFilteredStudents(filtered);
    // 필터링 후 선택된 학생들 중 필터에서 제외된 학생들 제거
    setSelectedStudents(prev => prev.filter(id => 
      filtered.some(student => student.id === id)
    ));
  }, [students, classFilter, searchFilter]);

  const getUniqueClasses = () => {
    const classes = Array.from(new Set(students.map(student => student.className)));
    return classes.sort();
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

  const handleSelectByClass = (className: string) => {
    const classStudents = students.filter(student => student.className === className);
    const classStudentIds = classStudents.map(student => student.id);
    
    // 해당 반 학생들이 모두 선택되어 있는지 확인
    const allSelected = classStudentIds.every(id => selectedStudents.includes(id));
    
    if (allSelected) {
      // 모두 선택되어 있으면 해제
      setSelectedStudents(prev => prev.filter(id => !classStudentIds.includes(id)));
    } else {
      // 일부만 선택되어 있거나 아무도 선택되지 않았으면 모두 선택
      setSelectedStudents(prev => {
        const newSelected = [...prev];
        classStudentIds.forEach(id => {
          if (!newSelected.includes(id)) {
            newSelected.push(id);
          }
        });
        return newSelected;
      });
    }
  };

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
        // SMS 이력 저장
        await fetch('/api/sms/history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipients: result.recipients,
            title: smsData.title.trim() || null,
            content: smsData.text.trim(),
            msgType: result.actualMsgType || result.msgType,
            requestNo: result.requestNo,
          }),
        });

        alert(`문자가 성공적으로 발송되었습니다.\n대상: ${result.recipients}명\n유형: ${result.actualMsgType || result.msgType}\n요청번호: ${result.requestNo}`);
        setShowSmsModal(false);
        setSmsData({ title: '', text: '' });
        setSelectedStudents([]);
        
        // SMS 이력 새로고침
        queryClient.invalidateQueries({ queryKey: ['smsHistory'] });
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

  if (studentsLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (studentsError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">학생 목록을 불러오는데 실패했습니다.</p>
          <Link
            href="/students"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            학생 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
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
            <h1 className="text-2xl font-bold text-gray-900 mb-1">단체 문자 발송</h1>
            <p className="text-sm text-gray-600">
              전체 {students.length}명 / 필터링된 {filteredStudents.length}명 / 선택된 {selectedStudents.length}명
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex gap-3">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              발송 이력
            </button>
            
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
          </div>
        </div>

        {/* 필터 및 반별 선택 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">반별 필터</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체 반</option>
                {getUniqueClasses().map(className => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">학생 검색</label>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="이름 또는 전화번호로 검색"
              />
            </div>
          </div>

          {/* 반별 일괄 선택 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">반별 일괄 선택</label>
            <div className="flex flex-wrap gap-2">
              {getUniqueClasses().map(className => {
                const classStudents = students.filter(student => student.className === className);
                const selectedInClass = classStudents.filter(student => selectedStudents.includes(student.id)).length;
                const isAllSelected = selectedInClass === classStudents.length && classStudents.length > 0;
                const isPartialSelected = selectedInClass > 0 && selectedInClass < classStudents.length;
                
                return (
                  <button
                    key={className}
                    onClick={() => handleSelectByClass(className)}
                    className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                      isAllSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : isPartialSelected
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-50'
                    }`}
                  >
                    {className} ({selectedInClass}/{classStudents.length})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">학생 목록</h3>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">전체 선택</span>
                </label>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">
                    <span className="sr-only">선택</span>
                  </th>
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => handleSelectStudent(student.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
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
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        </div>
                      </div>
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
      </div>

      {/* 단체 SMS 발송 모달 */}
      {showSmsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">단체 문자 발송</h3>
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
              <div className="max-h-24 overflow-y-auto text-xs text-gray-500 bg-gray-50 p-2 rounded">
                {students
                  .filter(student => selectedStudents.includes(student.id))
                  .map(student => `${student.name} (${student.className})`)
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

      {/* 발송 이력 모달 */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">문자 발송 이력</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      발송일시
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      수신인수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      유형
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      제목/내용
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {smsHistory.map((history) => (
                    <tr key={history.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(history.sentAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {history.recipients}명
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          history.msgType === 'SMS' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {history.msgType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                        {history.title && (
                          <div className="font-medium text-gray-900 mb-1">{history.title}</div>
                        )}
                        <div className="truncate">{history.content}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          history.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {history.status === 'success' ? '발송완료' : '발송실패'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {smsHistory.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  발송 이력이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 