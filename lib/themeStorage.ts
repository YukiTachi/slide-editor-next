// テーマ管理ユーティリティ

export type Theme = 'light' | 'dark' | 'auto'

const THEME_KEY = 'slideEditor_theme'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

/**
 * システムのテーマ設定を取得
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (!isBrowser()) return 'light'
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

/**
 * 実際に適用すべきテーマを取得（autoの場合はシステム設定を返す）
 */
export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    return getSystemTheme()
  }
  return theme
}

/**
 * 保存されたテーマ設定を取得
 */
export function getTheme(): Theme {
  if (!isBrowser()) return 'auto'
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'auto') {
      return saved
    }
  } catch (e) {
    console.error('テーマ設定の読み込みに失敗しました:', e)
  }
  return 'auto'
}

/**
 * テーマ設定を保存
 */
export function setTheme(theme: Theme): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch (e) {
    console.error('テーマ設定の保存に失敗しました:', e)
  }
}

/**
 * テーマをHTMLに適用
 */
export function applyTheme(theme: Theme): void {
  if (!isBrowser()) return
  const effectiveTheme = getEffectiveTheme(theme)
  const root = document.documentElement
  
  if (effectiveTheme === 'dark') {
    root.classList.add('dark-theme')
    root.classList.remove('light-theme')
  } else {
    root.classList.add('light-theme')
    root.classList.remove('dark-theme')
  }
  
  // データ属性も設定（CSSで使用可能）
  root.setAttribute('data-theme', effectiveTheme)
}

/**
 * システムテーマ変更を監視
 */
export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  if (!isBrowser() || !window.matchMedia) {
    return () => {}
  }
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light')
  }
  
  // 古いブラウザ対応
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  } else {
    // フォールバック（古いブラウザ）
    mediaQuery.addListener(handler)
    return () => mediaQuery.removeListener(handler)
  }
}

