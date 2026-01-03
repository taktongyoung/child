import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from './providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // 폰트 로딩 중에도 텍스트 표시 (성능 개선)
})

export const metadata: Metadata = {
  title: '유년부 학생관리 시스템',
  description: '유년부 학생 정보 관리와 출석 기록을 효율적으로 관리하세요',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
