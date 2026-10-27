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

  // Shift / Alt は「キー文字列に含まれているか」と「実際に押されているか」が一致する場合だけ一致とする。
  // 以前は文字列に含まれるときしか検査しておらず、'Ctrl+P' が Ctrl+Shift+P にも、'Ctrl+Z' が Ctrl+Shift+Z にも
  // 一致していた（docs/PDF_CTRL_P_SHORTCUT_PLAN.md 2.6）
  if (!!parsed.shift !== event.shiftKey) return false
  if (!!parsed.alt !== event.altKey) return false

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

/**
 * キー文字列を、matchesShortcut() と同じ同一視ルールで正規化する。
 * Ctrl / Cmd / Meta は区別しないため 'Mod' にまとめ、修飾キーは固定順（Mod, Shift, Alt）、1文字キーは大文字に揃える。
 * 例: 'Cmd+P' / 'Meta+P' / 'ctrl+p' → 'Mod+P'、'Shift+Ctrl+P' → 'Mod+Shift+P'
 * 重複チェックや読み込み時の衝突判定に使う（照合そのものは matchesShortcut() が行う）
 */
export function normalizeKeyString(keyString: string): string {
  const parsed = parseKeyString(keyString)
  const parts: string[] = []
  if (parsed.ctrl || parsed.meta) parts.push('Mod')
  if (parsed.shift) parts.push('Shift')
  if (parsed.alt) parts.push('Alt')
  parts.push(parsed.key.length === 1 ? parsed.key.toUpperCase() : parsed.key)
  return parts.join('+')
}

// ショートカットの重複をチェック（Ctrl / Cmd / Meta や修飾キーの順序の違いは同じキーとして扱う）
export function findDuplicateShortcut(
  shortcuts: KeyboardShortcut[],
  shortcutId: string,
  keyString: string
): KeyboardShortcut | null {
  const target = normalizeKeyString(keyString)
  return shortcuts.find(
    s => s.id !== shortcutId && s.enabled && normalizeKeyString(s.customKey || s.defaultKey) === target
  ) || null
}

// ショートカットキー文字列を表示用にフォーマット
export function formatShortcutKey(keyString: string): string {
  // Macの場合はCmd、それ以外はCtrl
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  const modifier = isMac ? 'Cmd' : 'Ctrl'
  
  return keyString.replace(/Ctrl\+/g, `${modifier}+`).replace(/Meta\+/g, `${modifier}+`)
}
