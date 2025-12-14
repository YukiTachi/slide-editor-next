// キーボードショートカット設定の保存・読み込み
import type { KeyboardShortcut, KeyboardShortcutsConfig } from '@/types'
import { DEFAULT_SHORTCUTS, CONFIG_VERSION } from './keyboardShortcutsConfig'

const STORAGE_KEY = 'slideEditor_keyboardShortcuts'

// ブラウザ環境かどうかを判定
function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

// 設定の検証
function validateConfig(config: any): config is KeyboardShortcutsConfig {
  if (!config || typeof config !== 'object') return false
  if (!Array.isArray(config.shortcuts)) return false
  if (typeof config.version !== 'number') return false
  return true
}

// デフォルト設定を取得
export function getDefaultShortcuts(): KeyboardShortcut[] {
  return DEFAULT_SHORTCUTS.map(s => ({ ...s }))
}

// LocalStorageからショートカット設定を読み込む
export function loadShortcuts(): KeyboardShortcut[] {
  if (!isBrowser()) {
    return getDefaultShortcuts()
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return getDefaultShortcuts()
    }

    const config = JSON.parse(stored) as KeyboardShortcutsConfig
    if (!validateConfig(config)) {
      console.warn('Invalid keyboard shortcuts config, using defaults')
      return getDefaultShortcuts()
    }

    // バージョンが異なる場合はデフォルトにリセット
    if (config.version !== CONFIG_VERSION) {
      console.warn('Keyboard shortcuts config version mismatch, resetting to defaults')
      return getDefaultShortcuts()
    }

    // デフォルトショートカットとマージ（新しく追加されたショートカットがある場合に備える）
    const defaultShortcuts = getDefaultShortcuts()
    const shortcutsMap = new Map(config.shortcuts.map(s => [s.id, s]))
    
    return defaultShortcuts.map(defaultShortcut => {
      const stored = shortcutsMap.get(defaultShortcut.id)
      if (stored) {
        // ストレージの設定を優先しつつ、デフォルト値で補完
        return {
          ...defaultShortcut,
          customKey: stored.customKey,
          enabled: stored.enabled !== undefined ? stored.enabled : defaultShortcut.enabled
        }
      }
      return defaultShortcut
    })
  } catch (error) {
    console.error('Failed to load keyboard shortcuts:', error)
    return getDefaultShortcuts()
  }
}

// LocalStorageにショートカット設定を保存
export function saveShortcuts(shortcuts: KeyboardShortcut[]): void {
  if (!isBrowser()) {
    console.warn('Cannot save keyboard shortcuts in non-browser environment')
    return
  }

  try {
    const config: KeyboardShortcutsConfig = {
      shortcuts,
      version: CONFIG_VERSION
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('Failed to save keyboard shortcuts:', error)
  }
}

// ショートカット設定をデフォルトにリセット
export function resetShortcuts(): void {
  if (!isBrowser()) {
    return
  }

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to reset keyboard shortcuts:', error)
  }
}
