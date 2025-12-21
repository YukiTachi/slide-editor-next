'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './TableInserterModal.module.css'
import { insertTableToHTML } from '@/lib/tableProcessor'
import { TABLE_STYLE_INFO } from '@/lib/tableStyles'
import type { EditorHandle } from '@/components/Editor/Editor'
import type { TableConfig, TableStyle } from '@/types'

interface TableInserterModalProps {
  isOpen: boolean
  onClose: () => void
  htmlContent: string
  setHtmlContent: (content: string) => void
  editorRef?: React.RefObject<EditorHandle | null>
  onStatusUpdate?: (message: string) => void
}

export default function TableInserterModal({
  isOpen,
  onClose,
  htmlContent,
  setHtmlContent,
  editorRef,
  onStatusUpdate
}: TableInserterModalProps) {
  const [rows, setRows] = useState(3)
  const [columns, setColumns] = useState(4)
  const [style, setStyle] = useState<TableStyle>('bordered')
  const [hasHeader, setHasHeader] = useState(true)
  const [caption, setCaption] = useState('')

  // ESCキーで閉じる
  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  // document.bodyが存在しない場合はレンダリングしない
  if (typeof document === 'undefined' || !document.body) {
    return null
  }

  const handleInsert = () => {
    if (!htmlContent || !setHtmlContent || !editorRef) {
      alert('エディタが利用できません')
      return
    }

    const config: TableConfig = {
      rows,
      columns,
      style,
      hasHeader,
      caption: caption.trim() || undefined
    }

    const cursorPos = editorRef.current?.getCursorPosition() || 0
    const result = insertTableToHTML(htmlContent, cursorPos, config)
    
    setHtmlContent(result.newContent)
    setTimeout(() => {
      editorRef?.current?.setCursorPosition(result.newCursorPos)
    }, 0)
    
    if (onStatusUpdate) {
      onStatusUpdate(`表（${rows}行 × ${columns}列）を挿入しました`)
      setTimeout(() => onStatusUpdate(''), 3000)
    }
    onClose()
  }

  const handleRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value >= 1 && value <= 20) {
      setRows(value)
    }
  }

  const handleColumnsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value >= 1 && value <= 10) {
      setColumns(value)
    }
  }

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>📊 表を挿入</h3>
        
        <div className={styles.section}>
          <label className={styles.label}>
            <span>行数:</span>
            <input
              type="number"
              min="1"
              max="20"
              value={rows}
              onChange={handleRowsChange}
              className={styles.numberInput}
            />
            <span className={styles.rangeLabel}>(1-20)</span>
          </label>
          
          <label className={styles.label}>
            <span>列数:</span>
            <input
              type="number"
              min="1"
              max="10"
              value={columns}
              onChange={handleColumnsChange}
              className={styles.numberInput}
            />
            <span className={styles.rangeLabel}>(1-10)</span>
          </label>
        </div>

        <div className={styles.section}>
          <label className={styles.sectionTitle}>スタイル:</label>
          <div className={styles.styleGrid}>
            {(Object.keys(TABLE_STYLE_INFO) as TableStyle[]).map((styleKey) => {
              const styleInfo = TABLE_STYLE_INFO[styleKey]
              return (
                <label
                  key={styleKey}
                  className={`${styles.styleOption} ${style === styleKey ? styles.selected : ''}`}
                >
                  <input
                    type="radio"
                    name="tableStyle"
                    value={styleKey}
                    checked={style === styleKey}
                    onChange={() => setStyle(styleKey)}
                  />
                  <span className={styles.styleIcon}>{styleInfo.icon}</span>
                  <div className={styles.styleInfo}>
                    <div className={styles.styleName}>{styleInfo.name}</div>
                    <div className={styles.styleDescription}>{styleInfo.description}</div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={(e) => setHasHeader(e.target.checked)}
            />
            <span>ヘッダー行を含める</span>
          </label>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>
            <span>キャプション（任意）:</span>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="表の説明を入力..."
              className={styles.textInput}
            />
          </label>
        </div>

        <div className={styles.actions}>
          <button className={styles.insertBtn} onClick={handleInsert}>
            📊 挿入
          </button>
          <button className={styles.cancelBtn} onClick={onClose}>
            ❌ キャンセル
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}


