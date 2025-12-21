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
  'toggle-hierarchy': () => void
  'presentation-mode': () => void
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
      // エディタ内で入力中でも、グローバルショートカットは有効にする
      const target = e.target as HTMLElement
      
      // CodeMirrorエディタ内かどうかをチェック
      const isInCodeMirror = target.closest('.cm-editor') !== null
      
      // 入力フィールド（TEXTAREA、INPUT）で、かつCodeMirrorエディタ内でない場合
      // ただし、Ctrl/Metaキーが押されている場合はグローバルショートカットとして処理
      if ((target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') && !isInCodeMirror) {
        // Ctrl/Metaキーが押されていない場合は無効化
        if (!e.ctrlKey && !e.metaKey) {
          return
        }
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

    // capture phaseで登録（CodeMirrorがイベントを消費する前に処理）
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
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
