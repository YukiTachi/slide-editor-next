// キーボードショートカット設定モーダル
'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { KeyboardShortcut } from '@/types'
import { CATEGORY_LABELS } from '@/lib/keyboardShortcutsConfig'
import { formatShortcutKey } from '@/lib/keyboardShortcutsManager'
import ShortcutKeyInput from './ShortcutKeyInput'
import styles from './KeyboardShortcutsModal.module.css'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
  shortcuts: KeyboardShortcut[]
  onUpdateShortcut: (id: string, updates: Partial<KeyboardShortcut>) => void
  onResetAll: () => void
  onCheckDuplicate: (id: string, keyString: string) => KeyboardShortcut | null
}

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcuts,
  onUpdateShortcut,
  onResetAll,
  onCheckDuplicate
}: KeyboardShortcutsModalProps) {
  const [mounted, setMounted] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [localShortcuts, setLocalShortcuts] = useState<KeyboardShortcut[]>(shortcuts)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setLocalShortcuts(shortcuts)
  }, [shortcuts])

  if (!isOpen || !mounted) return null

  if (typeof document === 'undefined' || !document.body) {
    return null
  }

  const handleEditClick = (id: string) => {
    setEditingId(id)
    setDuplicateWarning(null)
  }

  const handleKeyChange = (id: string, keyString: string) => {
    // 重複チェック
    const duplicate = onCheckDuplicate(id, keyString)
    if (duplicate) {
      setDuplicateWarning(`このショートカットは「${duplicate.label}」で既に使用されています`)
      return
    }

    setDuplicateWarning(null)
    onUpdateShortcut(id, { customKey: keyString || undefined })
    setEditingId(null)
  }

  const handleReset = (id: string) => {
    onUpdateShortcut(id, { customKey: undefined })
    setEditingId(null)
    setDuplicateWarning(null)
  }

  const handleToggleEnabled = (id: string, enabled: boolean) => {
    onUpdateShortcut(id, { enabled })
  }

  const handleResetAll = () => {
    if (confirm('すべてのショートカットをデフォルトに戻しますか？')) {
      onResetAll()
      setEditingId(null)
      setDuplicateWarning(null)
    }
  }

  // カテゴリ別にグループ化
  const shortcutsByCategory = localShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>⌨️ キーボードショートカット設定</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          {Object.entries(shortcutsByCategory).map(([category, categoryShortcuts]) => (
            <div key={category} className={styles.categorySection}>
              <h4 className={styles.categoryTitle}>{CATEGORY_LABELS[category as KeyboardShortcut['category']]}</h4>
              <div className={styles.shortcutsList}>
                {categoryShortcuts.map((shortcut) => {
                  const isEditing = editingId === shortcut.id
                  const currentKey = shortcut.customKey || shortcut.defaultKey
                  const duplicate = duplicateWarning && isEditing

                  return (
                    <div key={shortcut.id} className={styles.shortcutItem}>
                      <div className={styles.shortcutLabel}>
                        <span>{shortcut.label}</span>
                        {!shortcut.enabled && <span className={styles.disabledBadge}>無効</span>}
                      </div>
                      <div className={styles.shortcutControls}>
                        {isEditing ? (
                          <div className={styles.editingContainer}>
                            <ShortcutKeyInput
                              value={currentKey}
                              onChange={(keyString) => handleKeyChange(shortcut.id, keyString)}
                              onDuplicate={(keyString) => {
                                const dup = onCheckDuplicate(shortcut.id, keyString)
                                if (dup) {
                                  setDuplicateWarning(`このショートカットは「${dup.label}」で既に使用されています`)
                                } else {
                                  setDuplicateWarning(null)
                                }
                              }}
                            />
                            {duplicate && <div className={styles.duplicateWarning}>{duplicateWarning}</div>}
                            <div className={styles.editActions}>
                              <button
                                className={styles.cancelBtn}
                                onClick={() => {
                                  setEditingId(null)
                                  setDuplicateWarning(null)
                                }}
                              >
                                キャンセル
                              </button>
                              <button
                                className={styles.resetBtn}
                                onClick={() => handleReset(shortcut.id)}
                              >
                                デフォルトに戻す
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className={styles.shortcutKey}>
                              {formatShortcutKey(currentKey)}
                            </span>
                            <div className={styles.shortcutButtons}>
                              <label className={styles.toggleLabel}>
                                <input
                                  type="checkbox"
                                  checked={shortcut.enabled}
                                  onChange={(e) => handleToggleEnabled(shortcut.id, e.target.checked)}
                                />
                                <span>有効</span>
                              </label>
                              <button
                                className={styles.editBtn}
                                onClick={() => handleEditClick(shortcut.id)}
                                disabled={!shortcut.enabled}
                              >
                                編集
                              </button>
                              {shortcut.customKey && (
                                <button
                                  className={styles.resetBtn}
                                  onClick={() => handleReset(shortcut.id)}
                                >
                                  リセット
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <button className={styles.resetAllBtn} onClick={handleResetAll}>
            すべてデフォルトにリセット
          </button>
          <button className={styles.closeButton} onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
