'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Student {
  id: number;
  name: string;
  className: string;
  teacher: string;
  talents: number;
  present: number;
  absent: number;
  late: number;
  total: number;
  attendanceRate: number;
}

interface Teacher {
  id: number;
  name: string;
  className: string;
  username: string;
  talents: number;
}

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  total: number;
  attendanceRate: number;
}

interface WeeklyStats extends AttendanceStats {
  date: string;
}

interface ArchiveData {
  students: Student[];
  teachers: Teacher[];
  totalStats: AttendanceStats;
  classStats: { [key: string]: AttendanceStats };
  studentStats: Student[];
  weeklyStats: WeeklyStats[];
  summary: {
    totalStudents: number;
    totalTeachers: number;
    totalAttendance: number;
    totalTalentHistory: number;
    totalPurchases: number;
  };
}

export default function Archive2025Page() {
  const [data, setData] = useState<ArchiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'teachers' | 'attendance'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const classOrder = ['믿음1반', '소망1반', '소망2반', '소망3반', '사랑1반', '사랑2반', '사랑3반', '희락1반'];

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const checkAdminAndFetchData = async () => {
    try {
      // 관리자 인증 확인
      const adminResponse = await fetch('/api/admin/me');
      if (!adminResponse.ok) {
        setIsAdmin(false);
        router.push('/login');
        return;
      }
      setIsAdmin(true);

      // 아카이브 데이터 로드
      const response = await fetch('/api/archive/2025');
      if (response.ok) {
        const archiveData = await response.json();
        setData(archiveData);
      } else if (response.status === 401) {
        setIsAdmin(false);
        router.push('/login');
        return;
      }
    } catch (error) {
      console.error('아카이브 데이터 로딩 오류:', error);
      setIsAdmin(false);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (rate: number): string => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBgColor = (rate: number): string => {
    if (rate >= 90) return 'bg-green-100';
    if (rate >= 80) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  // 전체 출석 현황 도넛 차트 데이터
  const getTotalStatsChartData = () => {
    if (!data) return null;

    return {
      labels: ['출석', '결석', '지각'],
      datasets: [
        {
          data: [
            data.totalStats.present,
            data.totalStats.absent,
            data.totalStats.late,
          ],
          backgroundColor: [
            '#10B981',
            '#EF4444',
            '#F59E0B',
          ],
          borderColor: [
            '#059669',
            '#DC2626',
            '#D97706',
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  // 반별 출석률 막대 차트 데이터
  const getClassStatsChartData = () => {
    if (!data) return null;

    return {
      labels: classOrder,
      datasets: [
        {
          label: '출석률 (%)',
          data: classOrder.map(className => data.classStats[className]?.attendanceRate || 0),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  // 학생 검색 필터링
  const filteredStudents = data?.studentStats.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.className.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {isAdmin === null ? '관리자 인증 확인 중...' : '2025년 아카이브 데이터를 불러오는 중...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-amber-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/"
                className="text-amber-600 hover:text-amber-800 text-sm font-medium mb-2 inline-block"
              >
                ← 관리자 대시보드로 돌아가기
              </Link>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">2025년 아카이브</h1>
                <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-sm font-medium">
                  관리자 전용
                </span>
              </div>
              <p className="text-gray-600 mt-1">2025년도 유년부 데이터 보관소</p>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="mt-6 border-b border-amber-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: '개요' },
                { id: 'students', name: '학생 목록' },
                { id: 'teachers', name: '선생님 목록' },
                { id: 'attendance', name: '출석 통계' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 개요 탭 */}
        {activeTab === 'overview' && data && (
          <div className="space-y-8">
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                <div className="text-3xl font-bold text-blue-600">{data.summary.totalStudents}</div>
                <div className="text-sm text-gray-600">등록 학생</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                <div className="text-3xl font-bold text-green-600">{data.summary.totalTeachers}</div>
                <div className="text-sm text-gray-600">등록 선생님</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                <div className="text-3xl font-bold text-purple-600">{data.summary.totalAttendance}</div>
                <div className="text-sm text-gray-600">출석 기록</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
                <div className="text-3xl font-bold text-orange-600">{data.summary.totalTalentHistory}</div>
                <div className="text-sm text-gray-600">달란트 내역</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-pink-500">
                <div className="text-3xl font-bold text-pink-600">{data.summary.totalPurchases}</div>
                <div className="text-sm text-gray-600">구매 내역</div>
              </div>
            </div>

            {/* 전체 출석 통계 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{data.totalStats.present}</div>
                  <div className="text-sm text-gray-600">출석</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{data.totalStats.absent}</div>
                  <div className="text-sm text-gray-600">결석</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{data.totalStats.late}</div>
                  <div className="text-sm text-gray-600">지각</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getStatusColor(data.totalStats.attendanceRate)}`}>
                    {data.totalStats.attendanceRate}%
                  </div>
                  <div className="text-sm text-gray-600">출석률</div>
                </div>
              </div>
            </div>

            {/* 차트 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">전체 출석 현황</h3>
                <div className="h-80">
                  {getTotalStatsChartData() && (
                    <Doughnut data={getTotalStatsChartData()!} options={chartOptions} />
                  )}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">반별 출석률</h3>
                <div className="h-80">
                  {getClassStatsChartData() && (
                    <Bar data={getClassStatsChartData()!} options={barChartOptions} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 학생 목록 탭 */}
        {activeTab === 'students' && data && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                학생 목록 ({data.studentStats.length}명)
              </h2>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="학생 이름 또는 반 검색..."
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-amber-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">반</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">담임</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">달란트</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">출석</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">결석</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">지각</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">출석률</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents
                      .sort((a, b) => {
                        const aClassIndex = classOrder.indexOf(a.className);
                        const bClassIndex = classOrder.indexOf(b.className);
                        if (aClassIndex !== bClassIndex) return aClassIndex - bClassIndex;
                        return a.name.localeCompare(b.name, 'ko');
                      })
                      .map((student) => (
                        <tr key={student.id} className="hover:bg-amber-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {student.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.className}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.teacher}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600 font-semibold">
                            {student.talents}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                            {student.present}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                            {student.absent}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-semibold">
                            {student.late}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusBgColor(student.attendanceRate)} ${getStatusColor(student.attendanceRate)}`}>
                              {student.attendanceRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 선생님 목록 탭 */}
        {activeTab === 'teachers' && data && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              선생님 목록 ({data.teachers.length}명)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.teachers
                .sort((a, b) => {
                  const aClassIndex = classOrder.indexOf(a.className);
                  const bClassIndex = classOrder.indexOf(b.className);
                  return aClassIndex - bClassIndex;
                })
                .map((teacher) => (
                  <div key={teacher.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-gray-900">{teacher.name}</h3>
                        <p className="text-sm text-gray-500">{teacher.className}</p>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">보유 달란트</span>
                        <span className="font-semibold text-amber-600">{teacher.talents}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 출석 통계 탭 */}
        {activeTab === 'attendance' && data && (
          <div className="space-y-8">
            {/* 반별 통계 */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">반별 출석 통계</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {classOrder.map(className => {
                  const stats = data.classStats[className];
                  if (!stats) return null;
                  return (
                    <div key={className} className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{className}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">출석</span>
                          <span className="font-semibold text-green-600">{stats.present}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">결석</span>
                          <span className="font-semibold text-red-600">{stats.absent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">지각</span>
                          <span className="font-semibold text-yellow-600">{stats.late}</span>
                        </div>
                        <div className="border-t pt-3">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">출석률</span>
                            <span className={`font-bold ${getStatusColor(stats.attendanceRate)}`}>
                              {stats.attendanceRate}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 주별 출석 추이 */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">주별 출석 추이</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">출석</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">결석</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">지각</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">총계</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">출석률</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.weeklyStats.map((week, index) => (
                        <tr key={index} className="hover:bg-amber-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(week.date).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                            {week.present}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                            {week.absent}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-semibold">
                            {week.late}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                            {week.total}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusBgColor(week.attendanceRate)} ${getStatusColor(week.attendanceRate)}`}>
                              {week.attendanceRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
