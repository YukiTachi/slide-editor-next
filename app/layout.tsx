import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'スライドエディタ',
  description: 'A4横向きスライドの作成・編集が可能なエディタ',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}

