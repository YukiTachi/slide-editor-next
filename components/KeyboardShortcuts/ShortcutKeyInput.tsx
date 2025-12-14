// キー入力受付コンポーネント
'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './KeyboardShortcutsModal.module.css'

interface ShortcutKeyInputProps {
  value: string
  onChange: (keyString: string) => void
  onDuplicate?: (duplicateKey: string) => void
  disabled?: boolean
}

export default function ShortcutKeyInput({
  value,
  onChange,
  onDuplicate,
  disabled = false
}: ShortcutKeyInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [displayValue, setDisplayValue] = useState(value)
  const inputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDisplayValue(value)
  }, [value])

  useEffect(() => {
    if (!isRecording) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const parts: string[] = []
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

      if (e.ctrlKey || e.metaKey) {
        parts.push(isMac ? 'Cmd' : 'Ctrl')
      }
      if (e.shiftKey) {
        parts.push('Shift')
      }
      if (e.altKey) {
        parts.push('Alt')
      }

      // 修飾キー自体が押された場合は何もしない（修飾キー+通常キーの組み合わせを待つ）
      const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta']
      if (modifierKeys.includes(e.key)) {
        return
      }

      // 特殊キーの処理
      let keyPart = ''
      if (e.key === ' ') {
        keyPart = 'Space'
      } else if (e.key === 'Escape') {
        // Escapeキーでキャンセル
        setIsRecording(false)
        return
      } else if (e.key === 'Enter') {
        keyPart = 'Enter'
      } else if (e.key === 'Tab') {
        keyPart = 'Tab'
      } else if (e.key.length === 1) {
        // 通常の文字キー
        keyPart = e.shiftKey ? e.key.toUpperCase() : e.key.toLowerCase()
      } else if (e.key.startsWith('Arrow')) {
        keyPart = e.key.replace('Arrow', '')
      } else if (e.key.startsWith('F') && /^F\d+$/.test(e.key)) {
        // ファンクションキー（F1-F12）
        keyPart = e.key
      } else {
        // その他の特殊キー（修飾キー以外）
        keyPart = e.key
      }

      if (keyPart) {
        parts.push(keyPart)
        const keyString = parts.join('+')
        
        // 重複チェック
        if (onDuplicate) {
          onDuplicate(keyString)
        }
        
        onChange(keyString)
        setIsRecording(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isRecording, onChange, onDuplicate])

  const handleClick = () => {
    if (disabled) return
    setIsRecording(true)
    setDisplayValue('キーを押してください...')
  }

  const handleBlur = () => {
    setIsRecording(false)
    setDisplayValue(value)
  }

  return (
    <div
      ref={inputRef}
      className={`${styles.keyInput} ${isRecording ? styles.recording : ''} ${disabled ? styles.disabled : ''}`}
      onClick={handleClick}
      onBlur={handleBlur}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label="ショートカットキーを設定"
    >
      {displayValue || '未設定'}
    </div>
  )
}
