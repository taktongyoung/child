'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import MobileNav from '@/app/components/MobileNav';

interface Student {
  id: number;
  name: string;
  username: string;
  className: string;
  teacher: string;
  phone: string;
  address?: string;
  photoUrl?: string;
  talents: number;
  birthDate?: string;
}

interface AttendanceRecord {
  id: number;
  date: string;
  status: string;
  comment?: string;
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

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  stock: number;
  isAvailable: boolean;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [talentHistory, setTalentHistory] = useState<TalentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'attendance' | 'talents' | 'marketplace' | 'settings'>('attendance');

  // 달란트 잔치 상태
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [purchaseRequirements, setPurchaseRequirements] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  // 비밀번호 변경 상태
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // 프로필 수정 상태
  const [profileData, setProfileData] = useState({
    birthDate: '',
    phone: '',
    address: '',
    photoUrl: '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      // 학생 정보 조회
      const meResponse = await fetch('/api/student/me');
      if (!meResponse.ok) {
        router.push('/student-login');
        return;
      }
      const meData = await meResponse.json();
      setStudent(meData.student);

      // 프로필 데이터 초기화
      setProfileData({
        birthDate: meData.student.birthDate ? new Date(meData.student.birthDate).toISOString().split('T')[0] : '',
        phone: meData.student.phone || '',
        address: meData.student.address || '',
        photoUrl: meData.student.photoUrl || '',
      });

      // 출석, 달란트, 상품 정보를 병렬로 조회 (성능 개선)
      const [attendanceData, talentsData, productsData] = await Promise.all([
        fetch('/api/student/my-attendance').then(res => res.ok ? res.json() : null),
        fetch('/api/student/my-talents').then(res => res.ok ? res.json() : null),
        fetch('/api/products').then(res => res.ok ? res.json() : null)
      ]);

      // 데이터 설정
      if (attendanceData) {
        setAttendance(attendanceData.attendance);
      }
      if (talentsData) {
        setTalentHistory(talentsData.history);
      }
      if (productsData) {
        setProducts(productsData.filter((p: Product) => p.isAvailable));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      router.push('/student-login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/student/logout', { method: 'POST' });
      router.push('/student-login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    // 전화번호 유효성 검사
    if (!profileData.phone.trim()) {
      setProfileError('전화번호는 필수 항목입니다.');
      return;
    }

    setUpdatingProfile(true);

    try {
      const response = await fetch('/api/student/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setProfileSuccess('프로필이 성공적으로 업데이트되었습니다.');
        setStudent(data.student);
      } else {
        setProfileError(data.error || '프로필 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      setProfileError('프로필 업데이트 중 오류가 발생했습니다.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    // 파일 형식 체크
    if (!file.type.startsWith('image/')) {
      setProfileError('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setUploadingPhoto(true);
    setProfileError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (uploadResponse.ok && uploadData.url) {
        setProfileData(prev => ({ ...prev, photoUrl: uploadData.url }));
        setProfileSuccess('사진이 업로드되었습니다. "프로필 업데이트" 버튼을 눌러 저장하세요.');
      } else {
        setProfileError(uploadData.error || '사진 업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      setProfileError('사진 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // 유효성 검사
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('모든 필드를 입력해주세요.');
      return;
    }

    if (passwordData.newPassword.length < 4) {
      setPasswordError('새 비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setChangingPassword(true);

    try {
      const response = await fetch('/api/student/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPasswordSuccess('비밀번호가 성공적으로 변경되었습니다.');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setPasswordError(data.error || '비밀번호 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Change password error:', error);
      setPasswordError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedProduct || !student) return;

    const totalPrice = selectedProduct.price * purchaseQuantity;

    if (student.talents < totalPrice) {
      alert('달란트가 부족합니다.');
      return;
    }

    if (purchaseQuantity > selectedProduct.stock) {
      alert('재고가 부족합니다.');
      return;
    }

    if (!confirm(`"${selectedProduct.name}"을(를) ${purchaseQuantity}개 구매하시겠습니까?\n총 ${totalPrice} 달란트가 차감됩니다.`)) {
      return;
    }

    setPurchasing(true);

    try {
      const response = await fetch(`/api/products/${selectedProduct.id}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: purchaseQuantity,
          requirements: purchaseRequirements
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`구매가 완료되었습니다!\n남은 달란트: ${data.remainingTalents}`);
        setSelectedProduct(null);
        setPurchaseQuantity(1);
        setPurchaseRequirements('');
        // 데이터 새로고침
        fetchStudentData();
      } else {
        alert(data.error || '구매 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('구매 오류:', error);
      alert('구매 중 오류가 발생했습니다.');
    } finally {
      setPurchasing(false);
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'present': return '출석';
      case 'absent': return '결석';
      case 'late': return '지각';
      default: return '미체크';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAttendanceStats = () => {
    const stats = { present: 0, absent: 0, late: 0, total: attendance.length };
    attendance.forEach(record => {
      if (record.status === 'present') stats.present++;
      else if (record.status === 'absent') stats.absent++;
      else if (record.status === 'late') stats.late++;
    });
    const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
    return { ...stats, attendanceRate };
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

  if (!student) {
    return null;
  }

  const stats = getAttendanceStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 pt-20">
      <MobileNav role="student" userName={student.name} onLogout={handleLogout} />
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {student.photoUrl ? (
                <Image
                  src={student.photoUrl}
                  alt={student.name}
                  width={64}
                  height={64}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl sm:text-2xl font-bold text-blue-600">{student.name[0]}</span>
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{student.name}</h1>
                <p className="text-sm sm:text-base text-gray-600 truncate">{student.className} | {student.teacher} 선생님</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
            >
              로그아웃
            </button>
          </div>

          {/* 달란트 정보 */}
          <div className="mt-4 sm:mt-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">보유 달란트</p>
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{student.talents}</p>
                </div>
              </div>
              <a
                href="/marketplace"
                className="inline-flex items-center justify-center px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                달란트 잔치
              </a>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex-1 min-w-max px-3 sm:px-6 py-3 sm:py-4 font-medium transition-colors text-xs sm:text-base ${
                activeTab === 'attendance'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 inline sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="hidden sm:inline">출석 기록</span>
              <span className="sm:hidden">출석</span>
            </button>
            <button
              onClick={() => setActiveTab('talents')}
              className={`flex-1 min-w-max px-3 sm:px-6 py-3 sm:py-4 font-medium transition-colors text-xs sm:text-base ${
                activeTab === 'talents'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 inline sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">달란트 내역</span>
              <span className="sm:hidden">달란트</span>
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`flex-1 min-w-max px-3 sm:px-6 py-3 sm:py-4 font-medium transition-colors text-xs sm:text-base ${
                activeTab === 'marketplace'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 inline sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="hidden sm:inline">달란트 잔치</span>
              <span className="sm:hidden">잔치</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 min-w-max px-3 sm:px-6 py-3 sm:py-4 font-medium transition-colors text-xs sm:text-base ${
                activeTab === 'settings'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 inline sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              설정
            </button>
          </div>

          {/* 출석 기록 탭 */}
          {activeTab === 'attendance' && (
            <div className="p-6">
              {/* 출석 통계 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                  <div className="text-sm text-gray-600">출석</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                  <div className="text-sm text-gray-600">결석</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
                  <div className="text-sm text-gray-600">지각</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.attendanceRate}%</div>
                  <div className="text-sm text-gray-600">출석률</div>
                </div>
              </div>

              {/* 출석 기록 목록 */}
              {attendance.length > 0 ? (
                <div className="space-y-3">
                  {attendance.map((record) => (
                    <div key={record.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(record.date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short',
                          })}
                        </p>
                        {record.comment && (
                          <p className="text-sm text-gray-600 mt-1">{record.comment}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(record.status)}`}>
                        {getStatusText(record.status)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-500">아직 출석 기록이 없습니다.</p>
                </div>
              )}
            </div>
          )}

          {/* 달란트 내역 탭 */}
          {activeTab === 'talents' && (
            <div className="p-6">
              {talentHistory.length > 0 ? (
                <div className="space-y-3">
                  {talentHistory.map((history) => (
                    <div key={history.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{history.reason}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(history.createdAt).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${history.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {history.amount > 0 ? '+' : ''}{history.amount}
                          </div>
                          <div className="text-sm text-gray-600">
                            {history.beforeBalance} → {history.afterBalance}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">아직 달란트 내역이 없습니다.</p>
                </div>
              )}
            </div>
          )}

          {/* 달란트 잔치 탭 */}
          {activeTab === 'marketplace' && (
            <div className="p-6">
              {products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {products.map((product) => (
                    <div key={product.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <div className="relative h-48 bg-gray-100">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <svg className="w-20 h-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                            </svg>
                            <span className="text-xl font-bold text-yellow-600">{product.price}</span>
                          </div>
                          <span className="text-sm text-gray-500">재고: {product.stock}개</span>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setPurchaseQuantity(1);
                            setPurchaseRequirements('');
                          }}
                          disabled={product.stock === 0}
                          className={`w-full py-3 rounded-lg font-medium transition-colors ${
                            product.stock === 0
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {product.stock === 0 ? '품절' : '구매하기'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-gray-500 text-lg">현재 판매 중인 상품이 없습니다.</p>
                </div>
              )}
            </div>
          )}

          {/* 설정 탭 */}
          {activeTab === 'settings' && (
            <div className="p-6">
              <div className="max-w-2xl mx-auto space-y-8">
                {/* 프로필 수정 섹션 */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-6">프로필 정보 수정</h3>

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    {profileError && (
                      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                        {profileError}
                      </div>
                    )}

                    {profileSuccess && (
                      <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                        {profileSuccess}
                      </div>
                    )}

                    {/* 사진 업로드 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        프로필 사진
                      </label>
                      <div className="flex items-center space-x-4">
                        {profileData.photoUrl ? (
                          <Image
                            src={profileData.photoUrl}
                            alt="프로필 사진"
                            width={80}
                            height={80}
                            className="rounded-full object-cover"
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
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {uploadingPhoto ? '업로드 중...' : 'JPG, PNG 파일 (최대 5MB)'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 생일 */}
                    <div>
                      <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
                        생일
                      </label>
                      <input
                        id="birthDate"
                        type="date"
                        value={profileData.birthDate}
                        onChange={(e) => setProfileData({ ...profileData, birthDate: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* 연락처 */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        연락처 *
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="010-1234-5678"
                        required
                      />
                    </div>

                    {/* 주소 */}
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                        주소
                      </label>
                      <textarea
                        id="address"
                        value={profileData.address}
                        onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="주소를 입력하세요"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={updatingProfile || uploadingPhoto}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {updatingProfile ? '업데이트 중...' : '프로필 업데이트'}
                    </button>
                  </form>
                </div>

                {/* 구분선 */}
                <div className="border-t border-gray-200"></div>

                {/* 비밀번호 변경 섹션 */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-6">비밀번호 변경</h3>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {passwordError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                      {passwordSuccess}
                    </div>
                  )}

                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      현재 비밀번호
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="현재 비밀번호를 입력하세요"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      새 비밀번호
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="새 비밀번호를 입력하세요 (최소 4자)"
                      required
                      minLength={4}
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      새 비밀번호 확인
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="새 비밀번호를 다시 입력하세요"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {changingPassword ? '변경 중...' : '비밀번호 변경'}
                  </button>
                </form>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>안내:</strong> 비밀번호는 최소 4자 이상이어야 합니다. 비밀번호를 안전하게 보관하세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 구매 확인 모달 */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">상품 구매</h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-start space-x-4">
                {selectedProduct.imageUrl ? (
                  <div className="h-20 w-20 flex-shrink-0 relative">
                    <Image
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      fill
                      className="rounded-lg object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{selectedProduct.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{selectedProduct.description}</p>
                  <p className="text-sm text-yellow-600 font-medium mt-2">{selectedProduct.price} 달란트</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                구매 수량
              </label>
              <input
                type="number"
                min="1"
                max={selectedProduct.stock}
                value={purchaseQuantity}
                onChange={(e) => setPurchaseQuantity(Math.max(1, Math.min(selectedProduct.stock, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">최대 {selectedProduct.stock}개까지 구매 가능</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                요구사항 (선택사항)
              </label>
              <textarea
                value={purchaseRequirements}
                onChange={(e) => setPurchaseRequirements(e.target.value)}
                placeholder="색상, 사이즈 등 요구사항을 입력하세요"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">상품 구매 시 필요한 요구사항을 입력해주세요 (예: 색상, 사이즈 등)</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">총 가격</span>
                <span className="text-lg font-bold text-yellow-600">{selectedProduct.price * purchaseQuantity} 달란트</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">남은 달란트</span>
                <span className={`text-lg font-bold ${
                  student.talents - (selectedProduct.price * purchaseQuantity) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {student.talents - (selectedProduct.price * purchaseQuantity)}
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handlePurchase}
                disabled={purchasing || student.talents < (selectedProduct.price * purchaseQuantity)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {purchasing ? '구매 중...' : '구매 확인'}
              </button>
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-400 transition-colors"
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
