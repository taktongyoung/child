'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { exportStudentAttendanceToExcel } from '../../utils/excelExport';

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
  createdAt: string;
  updatedAt: string;
}

interface AttendanceRecord {
  id: number;
  date: string;
  status: string;
  createdAt: string;
}

export default function StudentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsData, setSmsData] = useState({
    title: '',
    text: '',
  });
  const [sending, setSending] = useState(false);
  const [comments, setComments] = useState<{[key: string]: string}>({});
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    const fetchStudentAndAttendance = async () => {
      try {
        // 학생 정보 가져오기
        const studentResponse = await fetch(`/api/students/${params.id}`);
        if (studentResponse.ok) {
          const studentData = await studentResponse.json();
          setStudent(studentData);

          // 최근 30일 출석 기록 가져오기
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const attendanceResponse = await fetch(`/api/students/${params.id}/attendance?from=${thirtyDaysAgo.toISOString().split('T')[0]}`);
          if (attendanceResponse.ok) {
            const attendanceData = await attendanceResponse.json();
            setAttendanceRecords(attendanceData);
            // 출석 기록의 코멘트 값을 comments state에 반영
            const commentsObj: { [key: string]: string } = {};
            attendanceData.forEach((record: any) => {
              commentsObj[record.id] = record.comment || '';
            });
            setComments(commentsObj);
          }
        } else {
          setError('학생 정보를 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('학생 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentAndAttendance();
  }, [params.id]);

  const handleDelete = async () => {
    if (!student) return;
    
    if (confirm(`${student.name} 학생의 정보를 삭제하시겠습니까?`)) {
      try {
        const response = await fetch(`/api/students/${params.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          router.push('/students');
        } else {
          const data = await response.json();
          alert(data.error || '삭제 중 오류가 발생했습니다.');
        }
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleSendSms = async () => {
    if (!student || !smsData.text.trim()) {
      alert('문자 내용을 입력해주세요.');
      return;
    }

    setSending(true);

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: student.phone,
          title: smsData.title.trim() || undefined,
          text: smsData.text.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`문자가 성공적으로 발송되었습니다.\n유형: ${result.actualMsgType || result.msgType}\n요청번호: ${result.requestNo}`);
        setShowSmsModal(false);
        setSmsData({ title: '', text: '' });
      } else {
        alert(`문자 발송에 실패했습니다.\n${result.error}`);
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      alert('문자 발송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
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

  const getAttendanceStats = () => {
    const stats = { present: 0, absent: 0, late: 0, total: attendanceRecords.length };
    attendanceRecords.forEach(record => {
      if (record.status === 'present') stats.present++;
      else if (record.status === 'absent') stats.absent++;
      else if (record.status === 'late') stats.late++;
    });
    const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
    return { ...stats, attendanceRate };
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

  // 출석 기록 삭제 함수 추가
  const handleDeleteAttendance = async (recordId: number, date: string) => {
    if (!confirm(`${date} 출석 기록을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/attendance?id=${recordId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // 출석 기록 목록에서 해당 기록 제거
        setAttendanceRecords(prev => prev.filter(record => record.id !== recordId));
        // 코멘트도 제거
        setComments(prev => {
          const updated = { ...prev };
          delete updated[recordId];
          return updated;
        });
        alert('출석 기록이 삭제되었습니다.');
      } else {
        const errorData = await response.json();
        alert(errorData.error || '출석 기록 삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error deleting attendance:', error);
      alert('출석 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSaveComment = async (recordId: number, comment: string) => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recordId, comment }),
      });
      if (res.ok) {
        setComments(prev => ({ ...prev, [recordId]: comment }));
      } else {
        const data = await res.json();
        alert(data.error || '코멘트 저장 중 오류가 발생했습니다.');
      }
    } catch (e) {
      alert('코멘트 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteComment = async (recordId: number) => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recordId }),
      });
      if (res.ok) {
        setComments(prev => ({ ...prev, [recordId]: '' }));
      } else {
        const data = await res.json();
        alert(data.error || '코멘트 삭제 중 오류가 발생했습니다.');
      }
    } catch (e) {
      alert('코멘트 삭제 중 오류가 발생했습니다.');
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

  if (error || !student) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/students"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            학생 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/students"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            학생 목록으로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {isBirthdayThisMonth(student.birthDate) && (
              <span className="inline-block mr-2" title="이번 달 생일">
                🎂
              </span>
            )}
            {student.name} 학생 정보
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="text-center">
                  {student.photoUrl ? (
                    <Image
                      src={student.photoUrl}
                      alt={student.name}
                      width={200}
                      height={200}
                      className="mx-auto rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-4xl font-bold text-gray-400">{student.name[0]}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                    <p className="text-gray-900 font-semibold">{student.name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
                    <p className="text-gray-900">
                      {student.birthDate ? new Date(student.birthDate).toLocaleDateString('ko-KR') : '미입력'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">반</label>
                    <p className="text-gray-900">{student.className}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">담임선생님</label>
                    <p className="text-gray-900">{student.teacher}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                    <p className="text-gray-900">{student.phone}</p>
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                    <p className="text-gray-900">{student.address}</p>
                  </div>
                  
                  {student.notes && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">특이사항</label>
                      <p className="text-gray-900 whitespace-pre-wrap">{student.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row justify-between gap-4">
            <div className="text-sm text-gray-500">
              등록일: {new Date(student.createdAt).toLocaleDateString('ko-KR')}
              {student.updatedAt !== student.createdAt && (
                <span className="ml-4">
                  수정일: {new Date(student.updatedAt).toLocaleDateString('ko-KR')}
                </span>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowSmsModal(true)}
                className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                문자 보내기
              </button>
              
              <Link
                href={`/students/${student.id}/edit`}
                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                수정
              </Link>
              
              <button
                onClick={handleDelete}
                className="inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                삭제
              </button>
            </div>
          </div>
        </div>

        {/* 출석 기록 섹션 */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">출석 기록 (최근 30일)</h2>
            {student && attendanceRecords.length > 0 && (
              <button
                onClick={() => exportStudentAttendanceToExcel(student, attendanceRecords)}
                className="inline-flex items-center px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                엑셀 다운로드
              </button>
            )}
          </div>
          
          {attendanceRecords.length > 0 ? (
            <>
              {/* 출석 통계 */}
              <div className="px-6 py-4 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{getAttendanceStats().present}</div>
                    <div className="text-sm text-gray-600">출석</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{getAttendanceStats().absent}</div>
                    <div className="text-sm text-gray-600">결석</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{getAttendanceStats().late}</div>
                    <div className="text-sm text-gray-600">지각</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{getAttendanceStats().attendanceRate}%</div>
                    <div className="text-sm text-gray-600">출석률</div>
                  </div>
                </div>
              </div>

              {/* 출석 기록 목록 */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        날짜
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        요일
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        출석 상태
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        코멘트
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceRecords
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((record) => {
                        const recordId = record.id.toString();
                        const commentValue = comments[recordId] || '';
                        const isEditing = editingRow === recordId;
                        const editValue =
                          typeof editValues[recordId] !== 'undefined' ? editValues[recordId] : commentValue;
                        return [
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(record.date).toLocaleDateString('ko-KR')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(record.date).toLocaleDateString('ko-KR', { weekday: 'short' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                                {getStatusText(record.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={editValue}
                                  autoFocus
                                  onChange={e => setEditValues(prev => ({ ...prev, [recordId]: e.target.value }))}
                                  onKeyDown={async e => {
                                    if (e.key === 'Enter') {
                                      await handleSaveComment(record.id, editValue);
                                      setEditingRow(null);
                                    } else if (e.key === 'Escape') {
                                      setEditValues(prev => ({ ...prev, [recordId]: commentValue }));
                                      setEditingRow(null);
                                    }
                                  }}
                                  onBlur={() => {
                                    setEditValues(prev => ({ ...prev, [recordId]: commentValue }));
                                    setEditingRow(null);
                                  }}
                                />
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <button
                                    className="text-blue-600 hover:underline text-sm"
                                    onClick={() => setEditingRow(recordId)}
                                  >
                                    {commentValue ? '수정' : '추가'}
                                  </button>
                                  {commentValue && (
                                    <button
                                      className="text-red-500 hover:underline text-sm"
                                      onClick={async () => {
                                        await handleDeleteComment(record.id);
                                        setEditValues(prev => ({ ...prev, [recordId]: '' }));
                                      }}
                                    >
                                      삭제
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleDeleteAttendance(record.id, new Date(record.date).toLocaleDateString('ko-KR'))}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                title="출석 기록 삭제"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>,
                          commentValue && !isEditing ? (
                            <tr key={record.id + '-comment'}>
                              <td colSpan={5} className="px-6 pb-4 pt-0 bg-blue-50 text-sm text-blue-700 text-left align-middle h-12">
                                <div className="flex items-center h-12">{commentValue}</div>
                              </td>
                            </tr>
                          ) : null
                        ];
                      })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="px-6 py-8 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500">아직 출석 기록이 없습니다.</p>
              <Link
                href="/attendance"
                className="inline-flex items-center mt-4 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700"
              >
                출석부에서 기록하기
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* SMS 발송 모달 */}
      {showSmsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">문자 보내기</h3>
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
                받는 사람: <span className="font-medium">{student.name} ({student.phone})</span>
              </p>
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
                onClick={handleSendSms}
                disabled={sending || !smsData.text.trim()}
                className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {sending ? '발송 중...' : '문자 발송'}
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
    </div>
  );
}