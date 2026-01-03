'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MobileNav from '@/app/components/MobileNav';

interface Teacher {
  id: number;
  name: string;
  username: string;
  className: string;
  phone?: string;
  email?: string;
  talents: number;
}

interface Student {
  id: number;
  name: string;
  className: string;
  talents: number;
  phone: string;
  birthDate?: string;
  address?: string;
  photoUrl?: string;
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

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [talentAmount, setTalentAmount] = useState('');
  const [talentReason, setTalentReason] = useState('');
  const [granting, setGranting] = useState(false);
  const [useTeacherTalents, setUseTeacherTalents] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState<{[key: number]: string}>({});
  const [checkingAttendance, setCheckingAttendance] = useState(false);
  const [weeklyGrantInfo, setWeeklyGrantInfo] = useState<{weeklyTotal: number; remaining: number} | null>(null);
  const [weeklyActivities, setWeeklyActivities] = useState<{[key: number]: WeeklyActivity}>({});

  // 학생 정보 수정 상태
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editData, setEditData] = useState({
    name: '',
    birthDate: '',
    phone: '',
    address: '',
    photoUrl: '',
  });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [updating, setUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchData();
    // 오늘 날짜를 일요일로 설정 (가장 최근 일요일)
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? 0 : day; // 일요일이면 0, 아니면 지난 일요일까지의 차이
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - diff);
    setAttendanceDate(sunday.toISOString().split('T')[0]);
  }, []);

  // 출석 날짜가 변경될 때마다 출석 정보 불러오기
  useEffect(() => {
    if (attendanceDate) {
      fetchAttendanceStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceDate]);

  const fetchData = async () => {
    try {
      const meResponse = await fetch('/api/teacher/me');
      if (!meResponse.ok) {
        router.push('/teacher-login');
        return;
      }
      const meData = await meResponse.json();
      setTeacher(meData.teacher);

      // 학생 정보를 병렬로 조회 (성능 개선)
      const studentsData = await fetch('/api/teacher/my-students').then(res => res.ok ? res.json() : null);
      if (studentsData) {
        setStudents(studentsData.students);
      }
    } catch (error) {
      console.error('데이터 조회 오류:', error);
      router.push('/teacher-login');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStatus = async () => {
    if (!attendanceDate) return;

    try {
      // 출석 정보 조회
      const response = await fetch(`/api/teacher/attendance?date=${attendanceDate}`);
      if (response.ok) {
        const data = await response.json();
        setAttendanceStatus(data.attendanceMap || {});
      }

      // 주간 활동 정보 조회
      const activitiesResponse = await fetch(`/api/weekly-activities?date=${attendanceDate}`);
      if (activitiesResponse.ok) {
        const activitiesList = await activitiesResponse.json();
        const activitiesMap: {[key: number]: WeeklyActivity} = {};
        activitiesList.forEach((activity: WeeklyActivity) => {
          activitiesMap[activity.studentId] = activity;
        });
        setWeeklyActivities(activitiesMap);
      }
    } catch (error) {
      console.error('출석 정보 조회 오류:', error);
    }
  };

  // 학생별 활동 상태 가져오기
  const getStudentActivity = (studentId: number): WeeklyActivity => {
    return weeklyActivities[studentId] || { id: 0, studentId, date: attendanceDate, bible: false, recitation: false, qt: false, phone: false };
  };

  // 활동 체크 토글
  const handleActivityToggle = async (studentId: number, activityType: 'bible' | 'recitation' | 'qt' | 'phone', currentValue: boolean) => {
    try {
      const response = await fetch('/api/weekly-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          date: attendanceDate,
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
            date: attendanceDate,
            [activityType]: !currentValue,
          } as WeeklyActivity,
        }));

        // 학생 달란트 정보 업데이트
        fetchData();
      } else {
        alert(result.error || '활동 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('활동 토글 오류:', error);
      alert('활동 업데이트 중 오류가 발생했습니다.');
    }
  };

  const fetchWeeklyGrantInfo = async () => {
    try {
      const response = await fetch('/api/teacher/weekly-grants');
      if (response.ok) {
        const data = await response.json();
        setWeeklyGrantInfo({
          weeklyTotal: data.weeklyTotal,
          remaining: data.remaining,
        });
      }
    } catch (error) {
      console.error('주간 부여 정보 조회 오류:', error);
    }
  };

  const handleGrantTalents = async () => {
    if (!selectedStudent || !talentAmount || !talentReason) {
      alert('모든 항목을 입력해주세요.');
      return;
    }

    const amount = parseInt(talentAmount);
    if (isNaN(amount) || amount === 0) {
      alert('유효한 달란트를 입력해주세요.');
      return;
    }

    // 선생님 달란트로 전송하는 경우 양수만 허용
    if (useTeacherTalents && amount < 0) {
      alert('선생님 달란트로 전송할 때는 양수만 입력 가능합니다.');
      return;
    }

    // 선생님 달란트로 전송하는 경우 잔액 확인
    if (useTeacherTalents && teacher && teacher.talents < amount) {
      alert(`보유 달란트가 부족합니다. (보유: ${teacher.talents}T, 필요: ${amount}T)`);
      return;
    }

    setGranting(true);

    try {
      // 선생님 달란트로 전송 또는 일반 부여
      const endpoint = useTeacherTalents ? '/api/teacher/transfer-talents' : '/api/teacher/grant-talents';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          amount: amount,
          reason: talentReason,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (useTeacherTalents) {
          alert(`${selectedStudent.name}에게 ${amount}T를 전송했습니다. (내 달란트 ${data.result.teacher.before}T → ${data.result.teacher.after}T)`);
        } else {
          alert(`${selectedStudent.name}에게 ${amount > 0 ? '+' : ''}${amount} 달란트를 부여했습니다.`);
        }
        setSelectedStudent(null);
        setTalentAmount('');
        setTalentReason('');
        setUseTeacherTalents(false);
        fetchData();
        fetchWeeklyGrantInfo(); // 주간 한도 정보 새로고침
      } else {
        alert(data.error || '달란트 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('달란트 처리 오류:', error);
      alert('달란트 처리 중 오류가 발생했습니다.');
    } finally {
      setGranting(false);
    }
  };

  const handleAttendanceCheck = async (studentId: number, status: string) => {
    if (!attendanceDate) {
      alert('출석 날짜를 선택해주세요.');
      return;
    }

    setCheckingAttendance(true);

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          date: attendanceDate,
          status,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAttendanceStatus({
          ...attendanceStatus,
          [studentId]: status,
        });
        // 학생 달란트 정보 업데이트 (출석 시 +5 달란트 반영)
        fetchData();
      } else {
        alert(data.error || '출석 체크 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('출석 체크 오류:', error);
      alert('출석 체크 중 오류가 발생했습니다.');
    } finally {
      setCheckingAttendance(false);
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setEditData({
      name: student.name,
      birthDate: student.birthDate ? new Date(student.birthDate).toISOString().split('T')[0] : '',
      phone: student.phone,
      address: student.address || '',
      photoUrl: student.photoUrl || '',
    });
    setEditError('');
    setEditSuccess('');
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    if (!editingStudent) return;

    // 유효성 검사
    if (!editData.name.trim()) {
      setEditError('이름은 필수 항목입니다.');
      return;
    }

    if (!editData.phone.trim()) {
      setEditError('연락처는 필수 항목입니다.');
      return;
    }

    setUpdating(true);

    try {
      const response = await fetch('/api/teacher/update-student', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: editingStudent.id,
          ...editData,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEditSuccess('학생 정보가 성공적으로 업데이트되었습니다.');
        // 학생 목록 새로고침
        fetchData();
        // 3초 후 모달 닫기
        setTimeout(() => {
          setEditingStudent(null);
          setEditSuccess('');
        }, 2000);
      } else {
        setEditError(data.error || '학생 정보 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Update student error:', error);
      setEditError('학생 정보 업데이트 중 오류가 발생했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setEditError('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    // 파일 형식 체크
    if (!file.type.startsWith('image/')) {
      setEditError('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setUploadingPhoto(true);
    setEditError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (uploadResponse.ok && uploadData.url) {
        setEditData(prev => ({ ...prev, photoUrl: uploadData.url }));
        setEditSuccess('사진이 업로드되었습니다. "학생 정보 업데이트" 버튼을 눌러 저장하세요.');
      } else {
        setEditError(uploadData.error || '사진 업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      setEditError('사진 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/teacher/logout', { method: 'POST' });
      router.push('/teacher-login');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8 px-4 pt-20">
      <MobileNav role="teacher" userName={teacher.name} onLogout={handleLogout} />
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{teacher.name} 선생님</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">담당 학생 {students.length}명</p>
            </div>
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3">
              <div className="text-center xs:text-right bg-gradient-to-r from-yellow-50 to-orange-50 px-4 sm:px-6 py-3 rounded-xl border border-yellow-200">
                <p className="text-xs text-gray-600 mb-1">나의 달란트</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">{teacher.talents} T</p>
                <p className="text-xs text-gray-500 mt-1">출석 체크로 획득</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>

        {/* 출석 날짜 선택 */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">출석 체크</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="text-sm font-medium text-gray-700">출석 날짜:</label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* 학생 목록 */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">학생 목록 ({students.length}명)</h2>

          {students.length > 0 ? (
            <>
              {/* 데스크톱 테이블 뷰 */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 font-medium text-gray-700">이름</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">반</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">달란트</th>
                      <th className="text-center py-3 px-2 font-medium text-gray-700">출석</th>
                      <th className="text-center py-3 px-1 font-medium text-gray-700 text-xs">성경</th>
                      <th className="text-center py-3 px-1 font-medium text-gray-700 text-xs">암송</th>
                      <th className="text-center py-3 px-1 font-medium text-gray-700 text-xs">큐티</th>
                      <th className="text-center py-3 px-1 font-medium text-gray-700 text-xs">휴대폰</th>
                      <th className="text-center py-3 px-2 font-medium text-gray-700">달란트</th>
                      <th className="text-center py-3 px-2 font-medium text-gray-700">수정</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const activity = getStudentActivity(student.id);
                      return (
                        <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2">
                              {student.photoUrl ? (
                                <img
                                  src={student.photoUrl}
                                  alt={student.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                  <span className="text-green-600 font-medium text-sm">{student.name[0]}</span>
                                </div>
                              )}
                              <span className="font-medium text-sm">{student.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {student.className}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {student.talents} T
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex justify-center space-x-1">
                              <button
                                onClick={() => handleAttendanceCheck(student.id, 'present')}
                                disabled={checkingAttendance}
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  attendanceStatus[student.id] === 'present'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-green-100'
                                }`}
                              >
                                출
                              </button>
                              <button
                                onClick={() => handleAttendanceCheck(student.id, 'late')}
                                disabled={checkingAttendance}
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  attendanceStatus[student.id] === 'late'
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-yellow-100'
                                }`}
                              >
                                지
                              </button>
                              <button
                                onClick={() => handleAttendanceCheck(student.id, 'absent')}
                                disabled={checkingAttendance}
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  attendanceStatus[student.id] === 'absent'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-red-100'
                                }`}
                              >
                                결
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-1 text-center">
                            <input
                              type="checkbox"
                              checked={activity.bible}
                              onChange={() => handleActivityToggle(student.id, 'bible', activity.bible)}
                              className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                          </td>
                          <td className="py-3 px-1 text-center">
                            <input
                              type="checkbox"
                              checked={activity.recitation}
                              onChange={() => handleActivityToggle(student.id, 'recitation', activity.recitation)}
                              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-3 px-1 text-center">
                            <input
                              type="checkbox"
                              checked={activity.qt}
                              onChange={() => handleActivityToggle(student.id, 'qt', activity.qt)}
                              className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                          </td>
                          <td className="py-3 px-1 text-center">
                            <input
                              type="checkbox"
                              checked={activity.phone}
                              onChange={() => handleActivityToggle(student.id, 'phone', activity.phone)}
                              className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                fetchWeeklyGrantInfo();
                              }}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                              부여
                            </button>
                          </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="w-full px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                          >
                            정보 수정
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 뷰 */}
              <div className="lg:hidden space-y-4">
                {students.map((student) => {
                  const activity = getStudentActivity(student.id);
                  return (
                  <div key={student.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {/* 학생 정보 */}
                    <div className="flex items-center gap-3">
                      {student.photoUrl ? (
                        <img
                          src={student.photoUrl}
                          alt={student.name}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-green-600 font-medium text-lg">{student.name[0]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg">{student.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {student.className}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {student.talents} T
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      <span className="font-medium">연락처:</span> {student.phone}
                    </div>

                    {/* 출석 체크 버튼 */}
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">출석 체크</p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleAttendanceCheck(student.id, 'present')}
                          disabled={checkingAttendance}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            attendanceStatus[student.id] === 'present'
                              ? 'bg-green-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-green-50'
                          }`}
                        >
                          출석
                        </button>
                        <button
                          onClick={() => handleAttendanceCheck(student.id, 'late')}
                          disabled={checkingAttendance}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            attendanceStatus[student.id] === 'late'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-yellow-50'
                          }`}
                        >
                          지각
                        </button>
                        <button
                          onClick={() => handleAttendanceCheck(student.id, 'absent')}
                          disabled={checkingAttendance}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            attendanceStatus[student.id] === 'absent'
                              ? 'bg-red-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-red-50'
                          }`}
                        >
                          결석
                        </button>
                      </div>
                    </div>

                    {/* 주간 활동 체크 */}
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">주간 활동 (체크 시 10T 부여)</p>
                      <div className="grid grid-cols-4 gap-2">
                        <label className={`flex flex-col items-center p-2 rounded-lg cursor-pointer transition-colors ${
                          activity.bible ? 'bg-green-100 border-2 border-green-500' : 'bg-white border border-gray-300'
                        }`}>
                          <input
                            type="checkbox"
                            checked={activity.bible}
                            onChange={() => handleActivityToggle(student.id, 'bible', activity.bible)}
                            className="sr-only"
                          />
                          <span className="text-lg mb-1">{activity.bible ? '✓' : ''}</span>
                          <span className="text-xs font-medium text-gray-700">성경</span>
                        </label>
                        <label className={`flex flex-col items-center p-2 rounded-lg cursor-pointer transition-colors ${
                          activity.recitation ? 'bg-blue-100 border-2 border-blue-500' : 'bg-white border border-gray-300'
                        }`}>
                          <input
                            type="checkbox"
                            checked={activity.recitation}
                            onChange={() => handleActivityToggle(student.id, 'recitation', activity.recitation)}
                            className="sr-only"
                          />
                          <span className="text-lg mb-1">{activity.recitation ? '✓' : ''}</span>
                          <span className="text-xs font-medium text-gray-700">암송</span>
                        </label>
                        <label className={`flex flex-col items-center p-2 rounded-lg cursor-pointer transition-colors ${
                          activity.qt ? 'bg-purple-100 border-2 border-purple-500' : 'bg-white border border-gray-300'
                        }`}>
                          <input
                            type="checkbox"
                            checked={activity.qt}
                            onChange={() => handleActivityToggle(student.id, 'qt', activity.qt)}
                            className="sr-only"
                          />
                          <span className="text-lg mb-1">{activity.qt ? '✓' : ''}</span>
                          <span className="text-xs font-medium text-gray-700">큐티</span>
                        </label>
                        <label className={`flex flex-col items-center p-2 rounded-lg cursor-pointer transition-colors ${
                          activity.phone ? 'bg-orange-100 border-2 border-orange-500' : 'bg-white border border-gray-300'
                        }`}>
                          <input
                            type="checkbox"
                            checked={activity.phone}
                            onChange={() => handleActivityToggle(student.id, 'phone', activity.phone)}
                            className="sr-only"
                          />
                          <span className="text-lg mb-1">{activity.phone ? '✓' : ''}</span>
                          <span className="text-xs font-medium text-gray-700">휴대폰</span>
                        </label>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          fetchWeeklyGrantInfo();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
                      >
                        달란트 부여
                      </button>
                      <button
                        onClick={() => handleEditStudent(student)}
                        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 font-medium"
                      >
                        정보 수정
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">담당 반 학생이 없습니다.</p>
            </div>
          )}
        </div>

        {/* 학생 정보 수정 모달 */}
        {editingStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">학생 정보 수정</h3>
                <button
                  onClick={() => {
                    setEditingStudent(null);
                    setEditError('');
                    setEditSuccess('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUpdateStudent} className="space-y-4">
                {editError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {editError}
                  </div>
                )}

                {editSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                    {editSuccess}
                  </div>
                )}

                {/* 사진 업로드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    프로필 사진
                  </label>
                  <div className="flex items-center space-x-4">
                    {editData.photoUrl ? (
                      <img
                        src={editData.photoUrl}
                        alt="프로필 사진"
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {uploadingPhoto ? '업로드 중...' : 'JPG, PNG 파일 (최대 5MB)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 이름 */}
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-2">
                    이름 *
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="학생 이름"
                    required
                  />
                </div>

                {/* 생일 */}
                <div>
                  <label htmlFor="edit-birthDate" className="block text-sm font-medium text-gray-700 mb-2">
                    생일
                  </label>
                  <input
                    id="edit-birthDate"
                    type="date"
                    value={editData.birthDate}
                    onChange={(e) => setEditData({ ...editData, birthDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* 연락처 */}
                <div>
                  <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700 mb-2">
                    연락처 *
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="010-1234-5678"
                    required
                  />
                </div>

                {/* 주소 */}
                <div>
                  <label htmlFor="edit-address" className="block text-sm font-medium text-gray-700 mb-2">
                    주소
                  </label>
                  <textarea
                    id="edit-address"
                    value={editData.address}
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="주소를 입력하세요"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={updating || uploadingPhoto}
                    className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {updating ? '업데이트 중...' : '학생 정보 업데이트'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStudent(null);
                      setEditError('');
                      setEditSuccess('');
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

        {/* 달란트 부여 모달 */}
        {selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">달란트 부여</h3>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setTalentAmount('');
                    setTalentReason('');
                    setUseTeacherTalents(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">학생: <span className="font-medium text-gray-900">{selectedStudent.name}</span></p>
                <p className="text-sm text-gray-600">현재 달란트: <span className="font-medium text-yellow-600">{selectedStudent.talents}T</span></p>
                {teacher && (
                  <p className="text-sm text-gray-600">내 달란트: <span className="font-medium text-green-600">{teacher.talents}T</span></p>
                )}
              </div>

              {/* 일반 부여 주간 한도 정보 */}
              {!useTeacherTalents && weeklyGrantInfo && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">이번 주 일반 부여 한도</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {weeklyGrantInfo.weeklyTotal}T / 5T 사용
                    </span>
                    <span className={`text-sm font-bold ${weeklyGrantInfo.remaining > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {weeklyGrantInfo.remaining}T 남음
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${weeklyGrantInfo.weeklyTotal >= 5 ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min((weeklyGrantInfo.weeklyTotal / 5) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={useTeacherTalents}
                    onChange={(e) => setUseTeacherTalents(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    내 달란트로 전송 (내 달란트가 차감됩니다)
                  </span>
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {useTeacherTalents ? '전송할 달란트' : '달란트 (음수는 차감)'}
                </label>
                <input
                  type="number"
                  value={talentAmount}
                  onChange={(e) => setTalentAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={useTeacherTalents ? "예: 10" : "예: 5 또는 -3"}
                  min={useTeacherTalents ? "1" : undefined}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사유
                </label>
                <input
                  type="text"
                  value={talentReason}
                  onChange={(e) => setTalentReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="예: 성경 암송, 숙제 미제출"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleGrantTalents}
                  disabled={granting}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {granting ? '처리 중...' : (useTeacherTalents ? '전송하기' : '부여하기')}
                </button>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setTalentAmount('');
                    setTalentReason('');
                    setUseTeacherTalents(false);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
