'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { exportStatsToExcel } from '../utils/excelExport';
import { exportStatsToPPT, exportAdvancedStatsToPPT } from '../utils/pptExport';
import MobileNav from '@/app/components/MobileNav';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  total: number;
  attendanceRate: number;
}

interface StudentStats extends AttendanceStats {
  id: number;
  name: string;
  className: string;
}

interface WeeklyStats extends AttendanceStats {
  date: string;
}

interface StatsData {
  totalStats: AttendanceStats;
  classStats: { [key: string]: AttendanceStats };
  studentStats: StudentStats[];
  weeklyStats: WeeklyStats[];
  period: {
    startDate: string;
    endDate: string;
  };
}

interface Teacher {
  id: number;
  name: string;
  className: string;
}

export default function StatsPage() {
  const router = useRouter();
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // 전체, 월별 선택
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>(''); // 정렬 필드
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // 정렬 방향
  const [classOrder, setClassOrder] = useState<string[]>([]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedPeriod, selectedClass]);

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

  const fetchStats = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      let startDate = new Date();

      // 기간 설정
      if (selectedPeriod === 'all') {
        // 전체 기간: 2025년 1월 1일부터
        startDate = new Date('2025-01-01');
      } else {
        // 월별 선택: 선택된 개월 수만큼 이전
        const months = parseInt(selectedPeriod);
        startDate.setMonth(startDate.getMonth() - months);
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      if (selectedClass) {
        params.append('className', selectedClass);
      }

      const response = await fetch(`/api/attendance/stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStatsData(data);
      }
    } catch (error) {
      console.error('통계 데이터 로딩 오류:', error);
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

  // 정렬 핸들러
  const handleSort = (field: string) => {
    if (sortField === field) {
      // 같은 필드를 클릭하면 방향 변경
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 필드를 클릭하면 해당 필드로 내림차순 정렬
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // 정렬 아이콘 표시
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
        </svg>
      );
    }
    
    if (sortDirection === 'asc') {
      return (
        <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      );
    }
  };

  // 전체 출석 현황 도넛 차트 데이터
  const getTotalStatsChartData = () => {
    if (!statsData) return null;
    
    return {
      labels: ['출석', '결석', '지각'],
      datasets: [
        {
          data: [
            statsData.totalStats.present,
            statsData.totalStats.absent,
            statsData.totalStats.late,
          ],
          backgroundColor: [
            '#10B981', // 녹색 (출석)
            '#EF4444', // 빨간색 (결석)
            '#F59E0B', // 노란색 (지각)
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
    if (!statsData) return null;
    
    return {
      labels: classOrder,
      datasets: [
        {
          label: '출석률 (%)',
          data: classOrder.map(className => statsData.classStats[className]?.attendanceRate || 0),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)', // 파란색 (믿음)
            'rgba(16, 185, 129, 0.8)', // 녹색 (소망)
            'rgba(245, 158, 11, 0.8)', // 노란색 (사랑)
            'rgba(239, 68, 68, 0.8)',  // 빨간색 (희락)
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(239, 68, 68, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  // 반별 출석 현황 막대 차트 데이터
  const getClassAttendanceChartData = () => {
    if (!statsData) return null;
    
    return {
      labels: classOrder,
      datasets: [
        {
          label: '출석',
          data: classOrder.map(className => statsData.classStats[className]?.present || 0),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2,
        },
        {
          label: '결석',
          data: classOrder.map(className => statsData.classStats[className]?.absent || 0),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 2,
        },
        {
          label: '지각',
          data: classOrder.map(className => statsData.classStats[className]?.late || 0),
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 2,
        },
      ],
    };
  };

  // 주별 출석 추이 선형 차트 데이터
  const getWeeklyTrendChartData = () => {
    if (!statsData) return null;
    
    const sortedWeeklyStats = [...statsData.weeklyStats].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    return {
      labels: sortedWeeklyStats.map(week => 
        new Date(week.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          label: '출석률 (%)',
          data: sortedWeeklyStats.map(week => week.attendanceRate),
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  };

  // 주별 출석 인원수 차트 데이터 (출석만 집중)
  const getWeeklyAttendanceCountChartData = () => {
    if (!statsData) return null;
    
    const sortedWeeklyStats = [...statsData.weeklyStats].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    return {
      labels: sortedWeeklyStats.map(week => 
        new Date(week.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          label: '출석 인원수 (명)',
          data: sortedWeeklyStats.map(week => week.present),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    };
  };

  // 반별 주간 출석 인원수 비교 차트 데이터
  const getClassWeeklyAttendanceChartData = () => {
    if (!statsData) return null;
    
    // 주별 데이터를 반별로 분리하여 처리 (실제로는 API에서 반별 주간 데이터가 필요하지만, 
    // 현재는 전체 데이터만 있으므로 전체 출석 인원을 반별로 추정 분배)
    const sortedWeeklyStats = [...statsData.weeklyStats].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const labels = sortedWeeklyStats.map(week => 
      new Date(week.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    );
    
    // 각 반의 비율을 계산하여 주별 출석 인원을 추정 분배
    const totalClassAttendance = Object.values(statsData.classStats).reduce((sum, cls) => sum + cls.present, 0);
    
    return {
      labels,
      datasets: classOrder.map((className, index) => {
        const classStats = statsData.classStats[className];
        const classRatio = totalClassAttendance > 0 ? classStats.present / totalClassAttendance : 0;
        
        const colors = [
          'rgba(59, 130, 246, 0.8)',   // 파란색 (믿음)
          'rgba(16, 185, 129, 0.8)',   // 녹색 (소망)
          'rgba(245, 158, 11, 0.8)',   // 노란색 (사랑)
          'rgba(239, 68, 68, 0.8)',    // 빨간색 (희락)
        ];
        
        const borderColors = [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
        ];
        
        return {
          label: `${className}반`,
          data: sortedWeeklyStats.map(week => Math.round(week.present * classRatio)),
          backgroundColor: colors[index],
          borderColor: borderColors[index],
          borderWidth: 2,
        };
      }),
    };
  };

  // 차트 옵션
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
  const filteredStudents = statsData?.studentStats.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">통계 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 pt-20">
      <MobileNav role="admin" userName="관리자" onLogout={handleLogout} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2 inline-block"
              >
                ← 홈으로 돌아가기
              </Link>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900">출석 통계</h1>
              <p className="text-gray-600 text-sm md:text-base mt-1">
                {statsData?.period.startDate} ~ {statsData?.period.endDate}
              </p>
            </div>

            {statsData && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => exportStatsToExcel(statsData)}
                  className="inline-flex items-center px-3 py-2 bg-emerald-600 text-white text-xs md:text-sm font-medium rounded-md hover:bg-emerald-700"
                >
                  <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <span className="hidden md:inline">엑셀</span>
                </button>

                <button
                  onClick={() => exportStatsToPPT(statsData)}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-xs md:text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <span className="hidden md:inline">텍스트</span>
                </button>

                <button
                  onClick={() => exportAdvancedStatsToPPT(statsData)}
                  className="inline-flex items-center px-3 py-2 bg-red-600 text-white text-xs md:text-sm font-medium rounded-md hover:bg-red-700"
                >
                  <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <span className="hidden md:inline">PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* 필터 옵션 */}
          <div className="mt-4 md:mt-6 grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-4">
            <div className="col-span-1">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                기간
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">전체 기간</option>
                <option value="1">최근 1개월</option>
                <option value="2">최근 2개월</option>
                <option value="3">최근 3개월</option>
                <option value="6">최근 6개월</option>
                <option value="12">최근 1년</option>
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                반 필터
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                {classOrder.map(className => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                학생 검색
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="학생 이름 검색..."
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 전체 통계 카드 */}
        {statsData && (
          <div className="mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">전체 통계</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-green-600">
                    {statsData.totalStats.present}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600">출석</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-red-600">
                    {statsData.totalStats.absent}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600">결석</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-yellow-600">
                    {statsData.totalStats.late}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600">지각</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <div className="text-center">
                  <div className={`text-2xl md:text-3xl font-bold ${getStatusColor(statsData.totalStats.attendanceRate)}`}>
                    {statsData.totalStats.attendanceRate}%
                  </div>
                  <div className="text-xs md:text-sm text-gray-600">출석률</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 시각적 통계 차트 */}
        {statsData && (
          <div className="mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 md:mb-6">시각적 통계</h2>

            {/* 첫 번째 행: 전체 출석 현황 도넛 차트 + 반별 출석률 막대 차트 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-8">
              {/* 전체 출석 현황 도넛 차트 */}
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4 text-center">
                  전체 출석 현황
                </h3>
                <div className="h-56 md:h-80" id="total-stats-chart">
                  {getTotalStatsChartData() && (
                    <Doughnut
                      data={getTotalStatsChartData()!}
                      options={chartOptions}
                    />
                  )}
                </div>
              </div>

              {/* 반별 출석률 막대 차트 */}
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4 text-center">
                  반별 출석률
                </h3>
                <div className="h-56 md:h-80" id="class-stats-chart">
                  {getClassStatsChartData() && (
                    <Bar
                      data={getClassStatsChartData()!}
                      options={barChartOptions}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 두 번째 행: 반별 출석 현황 막대 차트 */}
            <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-4 md:mb-8">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4 text-center">
                반별 출석 현황 (출석/결석/지각)
              </h3>
              <div className="h-56 md:h-80" id="class-attendance-chart">
                {getClassAttendanceChartData() && (
                  <Bar
                    data={getClassAttendanceChartData()!}
                    options={{
                      ...chartOptions,
                      scales: {
                        y: {
                          beginAtZero: true,
                        },
                      },
                    }}
                  />
                )}
              </div>
            </div>

            {/* 세 번째 행: 주별 출석 추이 */}
            {statsData.weeklyStats.length > 0 && (
              <div className="space-y-4 md:space-y-8">
                {/* 주별 출석률 추이 차트 */}
                <div className="bg-white rounded-lg shadow p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4 text-center">
                    주별 출석률 추이
                  </h3>
                  <div className="h-56 md:h-80" id="weekly-trend-chart">
                  {getWeeklyTrendChartData() && (
                    <Bar
                      data={getWeeklyTrendChartData()!}
                      options={barChartOptions}
                    />
                  )}
                </div>
                </div>

                {/* 주별 출석률 추이 테이블 - 데스크톱 */}
                <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 text-center">
                      주별 출석률 추이 (상세 데이터)
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
                            <div className="flex items-center">날짜{getSortIcon('date')}</div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('present')}>
                            <div className="flex items-center">출석{getSortIcon('present')}</div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('absent')}>
                            <div className="flex items-center">결석{getSortIcon('absent')}</div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('late')}>
                            <div className="flex items-center">지각{getSortIcon('late')}</div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('attendanceRate')}>
                            <div className="flex items-center">출석률{getSortIcon('attendanceRate')}</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {statsData.weeklyStats
                          .sort((a, b) => {
                            if (sortField) {
                              let aValue: any, bValue: any;
                              switch (sortField) {
                                case 'date': aValue = new Date(a.date).getTime(); bValue = new Date(b.date).getTime(); break;
                                case 'present': aValue = a.present; bValue = b.present; break;
                                case 'absent': aValue = a.absent; bValue = b.absent; break;
                                case 'late': aValue = a.late; bValue = b.late; break;
                                case 'attendanceRate': aValue = a.attendanceRate; bValue = b.attendanceRate; break;
                                default: aValue = 0; bValue = 0;
                              }
                              return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
                            }
                            return new Date(b.date).getTime() - new Date(a.date).getTime();
                          })
                          .map((week, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(week.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{week.present}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{week.absent}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-semibold">{week.late}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
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

                {/* 주별 출석률 추이 - 모바일 카드 뷰 */}
                <div className="md:hidden bg-white rounded-lg shadow">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900 text-center">주별 출석 현황</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {statsData.weeklyStats
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 8)
                      .map((week, index) => (
                        <div key={index} className="p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {new Date(week.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusBgColor(week.attendanceRate)} ${getStatusColor(week.attendanceRate)}`}>
                              {week.attendanceRate}%
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-green-600">출석 {week.present}</span>
                            <span className="text-red-600">결석 {week.absent}</span>
                            <span className="text-yellow-600">지각 {week.late}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 출석 인원수 집중 차트 */}
        {statsData && statsData.weeklyStats.length > 0 && (
          <div className="mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 md:mb-6">출석 인원수 분석</h2>

            <div className="space-y-4 md:space-y-8">
              {/* 주별 출석 인원수 차트 */}
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2 md:mb-4 text-center">
                  주별 출석 인원수 추이
                </h3>
                <p className="text-xs md:text-sm text-gray-600 text-center mb-3 md:mb-4">
                  매주 몇 명이 출석했는지 확인할 수 있습니다
                </p>
                <div className="h-56 md:h-80" id="weekly-attendance-count-chart">
                   {getWeeklyAttendanceCountChartData() && (
                     <Bar 
                       data={getWeeklyAttendanceCountChartData()!} 
                       options={{
                         ...chartOptions,
                         scales: {
                           y: {
                             beginAtZero: true,
                             title: {
                               display: true,
                               text: '출석 인원수 (명)'
                             }
                           },
                           x: {
                             title: {
                               display: true,
                               text: '날짜'
                             }
                           }
                         },
                         plugins: {
                           ...chartOptions.plugins,
                           tooltip: {
                             callbacks: {
                               label: function(context) {
                                 return `출석 인원: ${context.parsed.y}명`;
                               }
                             }
                           }
                         }
                       }}
                     />
                   )}
                 </div>
              </div>

              {/* 반별 주간 출석 인원수 비교 차트 */}
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2 md:mb-4 text-center">
                  반별 주간 출석 인원수 비교
                </h3>
                <p className="text-xs md:text-sm text-gray-600 text-center mb-3 md:mb-4">
                  각 반별로 매주 출석 인원수를 비교해볼 수 있습니다
                </p>
                <div className="h-56 md:h-80" id="class-weekly-attendance-chart">
                   {getClassWeeklyAttendanceChartData() && (
                     <Bar 
                       data={getClassWeeklyAttendanceChartData()!} 
                       options={{
                         ...chartOptions,
                         scales: {
                           y: {
                             beginAtZero: true,
                             stacked: false,
                             title: {
                               display: true,
                               text: '출석 인원수 (명)'
                             }
                           },
                           x: {
                             title: {
                               display: true,
                               text: '날짜'
                             }
                           }
                         },
                         plugins: {
                           ...chartOptions.plugins,
                           tooltip: {
                             mode: 'index',
                             intersect: false,
                             callbacks: {
                               label: function(context) {
                                 return `${context.dataset.label}: ${context.parsed.y}명`;
                               }
                             }
                           }
                         }
                       }}
                     />
                   )}
                 </div>
              </div>

              {/* 출석 인원수 통계 요약 */}
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4 text-center">
                  출석 인원수 통계 요약
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                  <div className="text-center p-3 md:p-4 bg-green-50 rounded-lg">
                    <div className="text-xl md:text-2xl font-bold text-green-600">
                      {Math.max(...statsData.weeklyStats.map(w => w.present))}
                    </div>
                    <div className="text-xs md:text-sm text-gray-600">최대 출석</div>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg">
                    <div className="text-xl md:text-2xl font-bold text-blue-600">
                      {Math.min(...statsData.weeklyStats.map(w => w.present))}
                    </div>
                    <div className="text-xs md:text-sm text-gray-600">최소 출석</div>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-purple-50 rounded-lg">
                    <div className="text-xl md:text-2xl font-bold text-purple-600">
                      {Math.round(statsData.weeklyStats.reduce((sum, w) => sum + w.present, 0) / statsData.weeklyStats.length)}
                    </div>
                    <div className="text-xs md:text-sm text-gray-600">평균 출석</div>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-orange-50 rounded-lg">
                    <div className="text-xl md:text-2xl font-bold text-orange-600">
                      {statsData.weeklyStats.length}
                    </div>
                    <div className="text-xs md:text-sm text-gray-600">총 주차</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 반별 통계 */}
        {statsData && !selectedClass && (
          <div className="mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">반별 통계</h2>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {classOrder.map(className => {
                const classStats = statsData.classStats[className];
                if (!classStats) return null;
                return (
                  <div key={className} className="bg-white rounded-lg shadow p-3 md:p-6">
                    <h3 className="text-sm md:text-lg font-semibold text-gray-900 mb-2 md:mb-4 text-center">
                      {className}
                    </h3>
                    <div className="space-y-1 md:space-y-3">
                      <div className="flex justify-between text-xs md:text-sm">
                        <span className="text-gray-600">출석</span>
                        <span className="font-semibold text-green-600">{classStats.present}</span>
                      </div>
                      <div className="flex justify-between text-xs md:text-sm">
                        <span className="text-gray-600">결석</span>
                        <span className="font-semibold text-red-600">{classStats.absent}</span>
                      </div>
                      <div className="flex justify-between text-xs md:text-sm">
                        <span className="text-gray-600">지각</span>
                        <span className="font-semibold text-yellow-600">{classStats.late}</span>
                      </div>
                      <div className="border-t pt-2 md:pt-3">
                        <div className="flex justify-between text-xs md:text-sm">
                          <span className="font-medium text-gray-700">출석률</span>
                          <span className={`font-bold ${getStatusColor(classStats.attendanceRate)}`}>
                            {classStats.attendanceRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* 개별 학생 통계 */}
        {statsData && !selectedClass && (
          <div className="mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">
              개별 학생 통계
              {searchTerm && (
                <span className="text-xs md:text-sm font-normal text-gray-600 ml-2">
                  (검색: "{searchTerm}")
                </span>
              )}
            </h2>

            {/* 데스크톱 테이블 뷰 */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                        <div className="flex items-center">학생명{getSortIcon('name')}</div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('className')}>
                        <div className="flex items-center">반{getSortIcon('className')}</div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('present')}>
                        <div className="flex items-center">출석{getSortIcon('present')}</div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('absent')}>
                        <div className="flex items-center">결석{getSortIcon('absent')}</div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('late')}>
                        <div className="flex items-center">지각{getSortIcon('late')}</div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('attendanceRate')}>
                        <div className="flex items-center">출석률{getSortIcon('attendanceRate')}</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents
                      .sort((a, b) => {
                        if (sortField) {
                          let aValue: any, bValue: any;
                          switch (sortField) {
                            case 'name':
                              return sortDirection === 'asc' ? a.name.localeCompare(b.name, 'ko') : b.name.localeCompare(a.name, 'ko');
                            case 'className': aValue = classOrder.indexOf(a.className); bValue = classOrder.indexOf(b.className); break;
                            case 'present': aValue = a.present; bValue = b.present; break;
                            case 'absent': aValue = a.absent; bValue = b.absent; break;
                            case 'late': aValue = a.late; bValue = b.late; break;
                            case 'attendanceRate': aValue = a.attendanceRate; bValue = b.attendanceRate; break;
                            default: aValue = 0; bValue = 0;
                          }
                          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
                        }
                        const aClassIndex = classOrder.indexOf(a.className);
                        const bClassIndex = classOrder.indexOf(b.className);
                        if (aClassIndex !== bClassIndex) return aClassIndex - bClassIndex;
                        return a.name.localeCompare(b.name, 'ko');
                      })
                      .map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link href={`/students/${student.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                              {student.name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.className}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{student.present}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{student.absent}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-semibold">{student.late}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
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

            {/* 모바일 카드 뷰 */}
            <div className="md:hidden space-y-2">
              {filteredStudents
                .sort((a, b) => {
                  const aClassIndex = classOrder.indexOf(a.className);
                  const bClassIndex = classOrder.indexOf(b.className);
                  if (aClassIndex !== bClassIndex) return aClassIndex - bClassIndex;
                  return a.name.localeCompare(b.name, 'ko');
                })
                .map((student) => (
                  <Link key={student.id} href={`/students/${student.id}`}>
                    <div className="bg-white rounded-lg shadow p-3 active:bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{student.name}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{student.className}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusBgColor(student.attendanceRate)} ${getStatusColor(student.attendanceRate)}`}>
                          {student.attendanceRate}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">출석 {student.present}</span>
                        <span className="text-red-600">결석 {student.absent}</span>
                        <span className="text-yellow-600">지각 {student.late}</span>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}