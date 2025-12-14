// キーボードショートカット管理用カスタムフック
import { useState, useEffect, useCallback, useRef } from 'react'
import type { KeyboardShortcut } from '@/types'
import { loadShortcuts, saveShortcuts, resetShortcuts as resetStorage, getDefaultShortcuts } from '@/lib/keyboardShortcutsStorage'
import { matchesShortcut, findDuplicateShortcut } from '@/lib/keyboardShortcutsManager'

export interface ShortcutActions {
  'undo': () => void
  'redo': () => void
  'search-replace': () => void
  'copy-to-clipboard': () => void
  'clear-editor': () => void
  'restore': () => void
  'preview-window': () => void
  'add-slide': () => void
  'insert-image': () => void
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>(() => loadShortcuts())

  // ショートカットを更新
  const updateShortcut = useCallback((id: string, updates: Partial<KeyboardShortcut>) => {
    setShortcuts(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...updates } : s)
      saveShortcuts(updated)
      return updated
    })
  }, [])

  // ショートカットをカスタムキーに設定
  const setCustomKey = useCallback((id: string, customKey: string | undefined) => {
    updateShortcut(id, { customKey })
  }, [updateShortcut])

  // ショートカットの有効/無効を切り替え
  const setEnabled = useCallback((id: string, enabled: boolean) => {
    updateShortcut(id, { enabled })
  }, [updateShortcut])

  // すべてのショートカットをデフォルトにリセット
  const resetAllShortcuts = useCallback(() => {
    const defaults = getDefaultShortcuts()
    setShortcuts(defaults)
    saveShortcuts(defaults)
  }, [])

  // キーボードイベントのハンドリング
  // actionsをrefで保持して、useEffectの依存配列から除外する
  const actionsRef = useRef(actions)
  useEffect(() => {
    actionsRef.current = actions
  }, [actions])

  // shortcutsをrefで保持して、常に最新の値を参照できるようにする
  const shortcutsRef = useRef(shortcuts)
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // エディタ内で入力中はショートカットを無効化
      const target = e.target as HTMLElement
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        return
      }

      // 有効なショートカットをチェック（常に最新のshortcutsを参照）
      const currentShortcuts = shortcutsRef.current
      for (const shortcut of currentShortcuts) {
        // enabledがfalseの場合はスキップ
        if (shortcut.enabled === false) {
          continue
        }

        if (matchesShortcut(e, shortcut)) {
          e.preventDefault()
          e.stopPropagation()

          const action = actionsRef.current[shortcut.action as keyof ShortcutActions]
          if (action && typeof action === 'function') {
            action()
          }
          return
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, []) // 依存配列を空にして、イベントリスナーは1回だけ登録

  // 重複チェック
  const checkDuplicate = useCallback((id: string, keyString: string): KeyboardShortcut | null => {
    return findDuplicateShortcut(shortcuts, id, keyString)
  }, [shortcuts])

  return {
    shortcuts,
    updateShortcut,
    setCustomKey,
    setEnabled,
    resetAllShortcuts,
    checkDuplicate
  }
}
