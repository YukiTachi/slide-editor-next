// キーボードショートカット設定の保存・読み込み
import type { KeyboardShortcut, KeyboardShortcutsConfig } from '@/types'
import { DEFAULT_SHORTCUTS, CONFIG_VERSION } from './keyboardShortcutsConfig'
import { normalizeKeyString } from './keyboardShortcutsManager'

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

    // 新しく追加された既定ショートカットが、ユーザーの既存の有効なキー割り当てと衝突する場合は
    // 無効で追加する（ユーザーの既存設定 > 新しい既定）。照合は Ctrl / Cmd を同一視するため正規化して比較する。
    // 対象は現行の既定に id が存在する保存済みエントリに限る（既定から削除された古い id は照合対象にならないため）。
    // 有効で追加した新規既定のキーも usedKeys に加え、新規既定どうしが同じキーを持つ場合は先に並ぶ方だけを有効にする。
    // 詳細は docs/PDF_CTRL_P_SHORTCUT_PLAN.md 2.4
    const defaultIds = new Set(defaultShortcuts.map(s => s.id))
    const usedKeys = new Set(
      config.shortcuts
        .filter(s => defaultIds.has(s.id) && s.enabled !== false)
        .map(s => normalizeKeyString(s.customKey || s.defaultKey))
    )

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
      const key = normalizeKeyString(defaultShortcut.defaultKey)
      if (usedKeys.has(key)) {
        console.info(`[shortcuts] ${defaultShortcut.id} は既存のキー割り当て（${defaultShortcut.defaultKey}）と重複するため無効で追加します`)
        return { ...defaultShortcut, enabled: false }
      }
      if (defaultShortcut.enabled) usedKeys.add(key)
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
