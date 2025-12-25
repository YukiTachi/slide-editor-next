'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './CodeBlockInserterModal.module.css'
import { insertCodeBlockToHTML } from '@/lib/codeBlockProcessor'
import type { EditorHandle } from '@/components/Editor/Editor'
import type { CodeBlockConfig, CodeLanguage, CodeBlockStyle } from '@/types'

interface CodeBlockInserterModalProps {
  isOpen: boolean
  onClose: () => void
  htmlContent: string
  setHtmlContent: (content: string) => void
  editorRef?: React.RefObject<EditorHandle | null>
  onStatusUpdate?: (message: string) => void
}

// 言語リスト（グループ化）
const LANGUAGE_GROUPS = [
  {
    name: 'Web開発',
    languages: [
      { value: 'javascript' as CodeLanguage, label: 'JavaScript' },
      { value: 'typescript' as CodeLanguage, label: 'TypeScript' },
      { value: 'jsx' as CodeLanguage, label: 'JSX' },
      { value: 'tsx' as CodeLanguage, label: 'TSX' },
      { value: 'html' as CodeLanguage, label: 'HTML' },
      { value: 'css' as CodeLanguage, label: 'CSS' },
      { value: 'scss' as CodeLanguage, label: 'SCSS' },
      { value: 'sass' as CodeLanguage, label: 'SASS' },
    ]
  },
  {
    name: 'プログラミング言語',
    languages: [
      { value: 'python' as CodeLanguage, label: 'Python' },
      { value: 'java' as CodeLanguage, label: 'Java' },
      { value: 'cpp' as CodeLanguage, label: 'C++' },
      { value: 'c' as CodeLanguage, label: 'C' },
      { value: 'csharp' as CodeLanguage, label: 'C#' },
      { value: 'go' as CodeLanguage, label: 'Go' },
      { value: 'rust' as CodeLanguage, label: 'Rust' },
      { value: 'php' as CodeLanguage, label: 'PHP' },
      { value: 'ruby' as CodeLanguage, label: 'Ruby' },
      { value: 'swift' as CodeLanguage, label: 'Swift' },
    ]
  },
  {
    name: 'データ・マークアップ',
    languages: [
      { value: 'json' as CodeLanguage, label: 'JSON' },
      { value: 'xml' as CodeLanguage, label: 'XML' },
      { value: 'yaml' as CodeLanguage, label: 'YAML' },
      { value: 'markdown' as CodeLanguage, label: 'Markdown' },
    ]
  },
  {
    name: 'その他',
    languages: [
      { value: 'sql' as CodeLanguage, label: 'SQL' },
      { value: 'bash' as CodeLanguage, label: 'Bash' },
      { value: 'shell' as CodeLanguage, label: 'Shell' },
      { value: 'plaintext' as CodeLanguage, label: 'プレーンテキスト' },
    ]
  }
]

// スタイル情報
const STYLE_INFO: Record<CodeBlockStyle, { name: string; description: string; icon: string }> = {
  default: {
    name: 'デフォルト',
    description: '背景色付き',
    icon: '📝'
  },
  minimal: {
    name: 'ミニマル',
    description: 'ボーダーのみ',
    icon: '⚪'
  },
  dark: {
    name: 'ダーク',
    description: 'ダークテーマ',
    icon: '🌙'
  },
  transparent: {
    name: '透明',
    description: '透明背景',
    icon: '🔲'
  }
}

export default function CodeBlockInserterModal({
  isOpen,
  onClose,
  htmlContent,
  setHtmlContent,
  editorRef,
  onStatusUpdate
}: CodeBlockInserterModalProps) {
  const [code, setCode] = useState('console.log("Hello, World!");')
  const [language, setLanguage] = useState<CodeLanguage>('javascript')
  const [style, setStyle] = useState<CodeBlockStyle>('default')
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [startLineNumber, setStartLineNumber] = useState(1)
  const [caption, setCaption] = useState('')
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined)
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null)

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

  // モーダルが開いたときにフォーカス
  useEffect(() => {
    if (isOpen && codeTextareaRef.current) {
      setTimeout(() => {
        codeTextareaRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

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

    if (!code.trim()) {
      alert('コードを入力してください')
      return
    }

    const config: CodeBlockConfig = {
      code: code.trim(),
      language,
      style,
      showLineNumbers,
      startLineNumber: showLineNumbers ? startLineNumber : undefined,
      caption: caption.trim() || undefined,
      maxHeight: maxHeight && maxHeight > 0 ? maxHeight : undefined
    }

    const cursorPos = editorRef.current?.getCursorPosition() || 0
    const result = insertCodeBlockToHTML(htmlContent, cursorPos, config)
    
    setHtmlContent(result.newContent)
    setTimeout(() => {
      editorRef?.current?.setCursorPosition(result.newCursorPos)
    }, 0)
    
    if (onStatusUpdate) {
      const langLabel = allLanguages.find(l => l.value === language)?.label || language
      onStatusUpdate(`コードブロック（${langLabel}）を挿入しました`)
      setTimeout(() => onStatusUpdate(''), 3000)
    }
    onClose()
  }

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as CodeLanguage)
  }

  const handleStartLineNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value >= 1) {
      setStartLineNumber(value)
    }
  }

  const handleMaxHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (isNaN(value) || value <= 0) {
      setMaxHeight(undefined)
    } else {
      setMaxHeight(value)
    }
  }

  // 全ての言語をフラットなリストに
  const allLanguages = LANGUAGE_GROUPS.flatMap(group => group.languages)

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>💻 コードブロックを挿入</h3>
        
        <div className={styles.section}>
          <label className={styles.label}>
            <span>プログラミング言語:</span>
            <select
              value={language}
              onChange={handleLanguageChange}
              className={styles.selectInput}
            >
              {LANGUAGE_GROUPS.map((group) => (
                <optgroup key={group.name} label={group.name}>
                  {group.languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.section}>
          <label className={styles.sectionTitle}>コード:</label>
          <textarea
            ref={codeTextareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="コードを入力してください..."
            className={styles.codeInput}
            rows={10}
            spellCheck={false}
          />
        </div>

        <div className={styles.section}>
          <label className={styles.sectionTitle}>スタイル:</label>
          <div className={styles.styleGrid}>
            {(Object.keys(STYLE_INFO) as CodeBlockStyle[]).map((styleKey) => {
              const styleInfo = STYLE_INFO[styleKey]
              return (
                <label
                  key={styleKey}
                  className={`${styles.styleOption} ${style === styleKey ? styles.selected : ''}`}
                >
                  <input
                    type="radio"
                    name="codeBlockStyle"
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
              checked={showLineNumbers}
              onChange={(e) => setShowLineNumbers(e.target.checked)}
            />
            <span>行番号を表示</span>
          </label>
          
          {showLineNumbers && (
            <label className={styles.label}>
              <span>開始行番号:</span>
              <input
                type="number"
                min="1"
                value={startLineNumber}
                onChange={handleStartLineNumberChange}
                className={styles.numberInput}
              />
            </label>
          )}
        </div>

        <div className={styles.section}>
          <label className={styles.label}>
            <span>キャプション（任意）:</span>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="コードブロックの説明を入力..."
              className={styles.textInput}
            />
          </label>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>
            <span>最大高さ（px、任意）:</span>
            <input
              type="number"
              min="1"
              value={maxHeight || ''}
              onChange={handleMaxHeightChange}
              placeholder="未指定"
              className={styles.numberInput}
            />
            <span className={styles.rangeLabel}>スクロール表示用</span>
          </label>
        </div>

        <div className={styles.actions}>
          <button className={styles.insertBtn} onClick={handleInsert}>
            💻 挿入
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

