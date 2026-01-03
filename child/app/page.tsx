'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthGuard from './components/AuthGuard'

export default function Home() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 중 오류:', error)
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">
              유년부 출석/심방 시스템
            </h1>
            <p className="text-gray-600">
              학생 정보 관리와 출석 기록을 효율적으로 관리하세요
            </p>
            <button
              onClick={handleLogout}
              className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
            >
              로그아웃
            </button>
          </div>
          
          <div className="space-y-4">
            <Link 
              href="/students" 
              className="block w-full px-6 py-4 bg-white border border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">학생 관리</h2>
                  <p className="text-sm text-gray-600">학생 정보 조회 및 관리</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/attendance" 
              className="block w-full px-6 py-4 bg-white border border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">출석부</h2>
                  <p className="text-sm text-gray-600">학생 출석 관리</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/stats" 
              className="block w-full px-6 py-4 bg-white border border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">출석 통계</h2>
                  <p className="text-sm text-gray-600">전체/반별/개별 출석 통계</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </AuthGuard>
  )
}