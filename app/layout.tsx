import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import 'katex/dist/katex.min.css'
import '../styles/globals.css'
import '../styles/theme.css'
import '../styles/equation.css'

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

