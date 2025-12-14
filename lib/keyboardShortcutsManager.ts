// キーボードショートカットの管理・実行
import type { KeyboardShortcut } from '@/types'

// キー文字列をパースして、KeyboardEventと比較可能な形式に変換
export function parseKeyString(keyString: string): {
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  key: string
} {
  const parts = keyString.split('+').map(p => p.trim())
  const result: {
    ctrl?: boolean
    meta?: boolean
    shift?: boolean
    alt?: boolean
    key: string
  } = {
    key: ''
  }

  for (const part of parts) {
    const lower = part.toLowerCase()
    if (lower === 'ctrl' || lower === 'cmd') {
      result.ctrl = true
    } else if (lower === 'meta') {
      result.meta = true
    } else if (lower === 'shift') {
      result.shift = true
    } else if (lower === 'alt') {
      result.alt = true
    } else {
      result.key = part
    }
  }

  return result
}

// KeyboardEventがショートカットにマッチするかチェック
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  const keyString = shortcut.customKey || shortcut.defaultKey
  const parsed = parseKeyString(keyString)

  // CtrlとMetaの処理（MacではmetaKey、Windows/LinuxではctrlKey）
  const hasCtrlOrMeta = parsed.ctrl || parsed.meta
  if (hasCtrlOrMeta && !event.ctrlKey && !event.metaKey) {
    return false
  }
  if (!hasCtrlOrMeta && (event.ctrlKey || event.metaKey)) {
    return false
  }

  // Shiftキーのチェック
  if (parsed.shift !== undefined) {
    if (parsed.shift && !event.shiftKey) return false
    if (!parsed.shift && event.shiftKey) return false
  }

  // Altキーのチェック
  if (parsed.alt !== undefined) {
    if (parsed.alt && !event.altKey) return false
    if (!parsed.alt && event.altKey) return false
  }

  // キーのチェック（大文字小文字を考慮）
  const eventKey = event.key
  const shortcutKey = parsed.key

  // 特殊キーの処理
  if (shortcutKey === 'Escape' && eventKey === 'Escape') return true
  if (shortcutKey === 'Enter' && eventKey === 'Enter') return true
  if (shortcutKey === 'Space' && eventKey === ' ') return true
  if (shortcutKey === 'Tab' && eventKey === 'Tab') return true

  // 通常のキー（大文字小文字を無視）
  if (shortcutKey.toLowerCase() === eventKey.toLowerCase()) return true

  return false
}

// ショートカットの重複をチェック
export function findDuplicateShortcut(
  shortcuts: KeyboardShortcut[],
  shortcutId: string,
  keyString: string
): KeyboardShortcut | null {
  return shortcuts.find(s => s.id !== shortcutId && s.enabled && (s.customKey || s.defaultKey) === keyString) || null
}

// ショートカットキー文字列を表示用にフォーマット
export function formatShortcutKey(keyString: string): string {
  // Macの場合はCmd、それ以外はCtrl
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  const modifier = isMac ? 'Cmd' : 'Ctrl'
  
  return keyString.replace(/Ctrl\+/g, `${modifier}+`).replace(/Meta\+/g, `${modifier}+`)
}
