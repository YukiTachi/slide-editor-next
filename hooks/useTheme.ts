import { useState, useEffect } from 'react'
import { getTheme, setTheme as saveTheme, applyTheme, getEffectiveTheme, watchSystemTheme, type Theme } from '@/lib/themeStorage'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getTheme())
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => getEffectiveTheme(getTheme()))

  // 初期化時にテーマを適用
  useEffect(() => {
    applyTheme(theme)
    setEffectiveTheme(getEffectiveTheme(theme))
  }, [theme])

  // システムテーマ変更を監視（autoモードの場合）
  useEffect(() => {
    if (theme !== 'auto') return

    const unwatch = watchSystemTheme((systemTheme) => {
      setEffectiveTheme(systemTheme)
      applyTheme('auto')
    })

    return unwatch
  }, [theme])

  // テーマを変更
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    saveTheme(newTheme)
    applyTheme(newTheme)
    setEffectiveTheme(getEffectiveTheme(newTheme))
  }

  // テーマをトグル（light ↔ dark、autoは除外）
  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('light')
    } else {
      // autoの場合は現在のシステムテーマに基づいて切り替え
      const current = getEffectiveTheme('auto')
      setTheme(current === 'light' ? 'dark' : 'light')
    }
  }

  return {
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme,
  }
}

