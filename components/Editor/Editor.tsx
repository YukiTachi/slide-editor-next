'use client'

import { useRef, useEffect, useImperativeHandle, forwardRef, useState, useMemo } from 'react'
import styles from './Editor.module.css'
import { validateHTML, type ValidationError } from '@/lib/htmlValidator'

export interface EditorHandle {
  getCursorPosition: () => number
  setCursorPosition: (position: number) => void
  focus: () => void
}

interface EditorProps {
  htmlContent: string
  setHtmlContent: (content: string) => void
  onValidationChange?: (errors: ValidationError[]) => void
}

const Editor = forwardRef<EditorHandle, EditorProps>(({ htmlContent, setHtmlContent, onValidationChange }, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const errorsRef = useRef<HTMLDivElement>(null)

  // リアルタイム検証
  const validationErrors = useMemo(() => {
    if (!htmlContent.trim()) return []
    return validateHTML(htmlContent)
  }, [htmlContent])

  // 親コンポーネントにエラー情報を通知
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(validationErrors)
    }
  }, [validationErrors, onValidationChange])

  // 行番号を生成
  const lines = htmlContent.split('\n')
  const lineNumbers = Array.from({ length: lines.length }, (_, i) => i + 1)

  // 各行のエラーをマップ
  const errorsByLine = useMemo(() => {
    const map = new Map<number, ValidationError[]>()
    for (const error of validationErrors) {
      if (!map.has(error.line)) {
        map.set(error.line, [])
      }
      map.get(error.line)!.push(error)
    }
    return map
  }, [validationErrors])

  // スクロール同期
  useEffect(() => {
    const textarea = textareaRef.current
    const lineNumbers = lineNumbersRef.current
    const errors = errorsRef.current

    if (!textarea || !lineNumbers || !errors) return

    const handleScroll = () => {
      lineNumbers.scrollTop = textarea.scrollTop
      errors.scrollTop = textarea.scrollTop
    }

    textarea.addEventListener('scroll', handleScroll)
    return () => {
      textarea.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    getCursorPosition: () => {
      return textareaRef.current?.selectionStart || 0
    },
    setCursorPosition: (position: number) => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(position, position)
        textareaRef.current.focus()
      }
    },
    focus: () => {
      textareaRef.current?.focus()
    }
  }))

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHtmlContent(e.target.value)
  }

  return (
    <div className={styles.editorPanel}>
      <div className={styles.panelHeader}>HTMLエディタ</div>
      <div className={styles.editorWrapper}>
        <div ref={lineNumbersRef} className={styles.lineNumbers}>
          {lineNumbers.map((num) => (
            <div key={num} className={styles.lineNumber}>
              {num}
            </div>
          ))}
        </div>
        <div ref={errorsRef} className={styles.errorIcons}>
          {lineNumbers.map((num) => {
            const errors = errorsByLine.get(num) || []
            if (errors.length === 0) {
              return <div key={num} className={styles.errorIcon}></div>
            }
            const hasError = errors.some(e => e.type === 'error')
            return (
              <div key={num} className={styles.errorIcon} title={errors.map(e => e.message).join('\n')}>
                {hasError ? '❌' : '⚠️'}
              </div>
            )
          })}
        </div>
        <textarea
          ref={textareaRef}
          className={styles.editor}
          value={htmlContent}
          onChange={handleInput}
          spellCheck={false}
        />
      </div>
    </div>
  )
})

Editor.displayName = 'Editor'

export default Editor

