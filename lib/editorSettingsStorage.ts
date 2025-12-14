// エディタ設定管理ユーティリティ

import type { EditorSettings } from '@/types'

const SETTINGS_KEY = 'slideEditor_editorSettings'

// デフォルト設定
export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  fontFamily: "'Courier New', monospace",
  lineHeight: 1.6,
  tabSize: 2,
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

/**
 * 設定値の検証
 */
function validateSettings(settings: any): settings is EditorSettings {
  if (!settings || typeof settings !== 'object') return false
  
  // フォントサイズの検証（10-24）
  if (typeof settings.fontSize !== 'number' || 
      settings.fontSize < 10 || settings.fontSize > 24) {
    return false
  }
  
  // フォントファミリーの検証
  if (typeof settings.fontFamily !== 'string' || settings.fontFamily.trim() === '') {
    return false
  }
  
  // 行の高さの検証（1.2-2.0）
  if (typeof settings.lineHeight !== 'number' || 
      settings.lineHeight < 1.2 || settings.lineHeight > 2.0) {
    return false
  }
  
  // タブサイズの検証（2, 4, 8）
  if (typeof settings.tabSize !== 'number' || 
      ![2, 4, 8].includes(settings.tabSize)) {
    return false
  }
  
  return true
}

/**
 * 保存されたエディタ設定を取得
 */
export function getEditorSettings(): EditorSettings {
  if (!isBrowser()) return DEFAULT_EDITOR_SETTINGS
  
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (validateSettings(parsed)) {
        return parsed
      }
    }
  } catch (e) {
    console.error('エディタ設定の読み込みに失敗しました:', e)
  }
  
  return DEFAULT_EDITOR_SETTINGS
}

/**
 * エディタ設定を保存
 */
export function setEditorSettings(settings: EditorSettings): void {
  if (!isBrowser()) return
  
  try {
    if (!validateSettings(settings)) {
      console.error('無効な設定値です:', settings)
      return
    }
    
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('エディタ設定の保存に失敗しました:', e)
  }
}

/**
 * エディタ設定をデフォルトにリセット
 */
export function resetEditorSettings(): void {
  setEditorSettings(DEFAULT_EDITOR_SETTINGS)
}
