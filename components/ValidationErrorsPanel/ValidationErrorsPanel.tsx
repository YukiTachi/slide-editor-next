'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './ValidationErrorsPanel.module.css'
import { type ValidationError } from '@/lib/htmlValidator'
import type { EditorHandle } from '@/components/Editor/Editor'

interface ValidationErrorsPanelProps {
  isOpen: boolean
  onClose: () => void
  validationErrors: ValidationError[]
  htmlContent: string
  editorRef?: React.RefObject<EditorHandle>
}

export default function ValidationErrorsPanel({
  isOpen,
  onClose,
  validationErrors,
  htmlContent,
  editorRef
}: ValidationErrorsPanelProps) {
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState<'all' | 'error' | 'warning'>('all')

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // ESCキーで閉じる
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !mounted) {
    return null
  }

  if (typeof document === 'undefined' || !document.body) {
    return null
  }

  // フィルター適用
  const filteredErrors = validationErrors.filter(error => {
    if (filter === 'error') return error.type === 'error'
    if (filter === 'warning') return error.type === 'warning'
    return true
  })

  const errorCount = validationErrors.filter(e => e.type === 'error').length
  const warningCount = validationErrors.filter(e => e.type === 'warning').length

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>警告・エラー一覧</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>

        <div className={styles.content}>
          {/* フィルターボタン */}
          <div className={styles.filterButtons}>
            <button
              className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => setFilter('all')}
            >
              すべて
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'error' ? styles.active : ''}`}
              onClick={() => setFilter('error')}
            >
              エラーのみ
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'warning' ? styles.active : ''}`}
              onClick={() => setFilter('warning')}
            >
              警告のみ
            </button>
          </div>

          {/* エラー・警告一覧 */}
          <div className={styles.errorsList}>
            {filteredErrors.length === 0 ? (
              <div className={styles.emptyMessage}>
                {filter === 'all' 
                  ? '警告・エラーはありません' 
                  : filter === 'error' 
                  ? 'エラーはありません'
                  : '警告はありません'}
              </div>
            ) : (
              filteredErrors.map((error, index) => (
                <div
                  key={`${error.line}-${error.code}-${index}`}
                  className={`${styles.errorItem} ${error.type === 'error' ? styles.error : styles.warning}`}
                  onClick={() => {
                    // 行番号へのジャンプは後で実装
                    if (editorRef?.current) {
                      const lines = htmlContent.split('\n')
                      if (error.line >= 1 && error.line <= lines.length) {
                        let position = 0
                        for (let i = 0; i < error.line - 1; i++) {
                          position += lines[i].length + 1
                        }
                        editorRef.current.setCursorPosition(position)
                        editorRef.current.focus()
                        onClose()
                      }
                    }
                  }}
                >
                  <span className={styles.icon}>
                    {error.type === 'error' ? '❌' : '⚠️'}
                  </span>
                  <span className={styles.lineNumber}>行 {error.line}</span>
                  <span className={styles.message}>{error.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* フッター */}
        <div className={styles.footer}>
          エラー: {errorCount}件、警告: {warningCount}件
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}


