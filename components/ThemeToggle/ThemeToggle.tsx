'use client'

import { useTheme } from '@/hooks/useTheme'
import styles from './ThemeToggle.module.css'

export default function ThemeToggle() {
  const { theme, effectiveTheme, setTheme } = useTheme()

  const handleToggle = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('auto')
    } else {
      setTheme('light')
    }
  }

  const getIcon = () => {
    if (theme === 'auto') {
      return '🌓' // システム設定に従う
    }
    return effectiveTheme === 'dark' ? '🌙' : '☀️'
  }

  const getTitle = () => {
    if (theme === 'light') {
      return 'ライトモード（クリックでダークモードに切り替え）'
    } else if (theme === 'dark') {
      return 'ダークモード（クリックで自動に切り替え）'
    } else {
      return `自動（システム設定: ${effectiveTheme === 'dark' ? 'ダーク' : 'ライト'}）クリックでライトモードに切り替え`
    }
  }

  return (
    <button
      className={styles.themeToggle}
      onClick={handleToggle}
      title={getTitle()}
      aria-label="テーマを切り替え"
    >
      <span className={styles.icon}>{getIcon()}</span>
    </button>
  )
}

