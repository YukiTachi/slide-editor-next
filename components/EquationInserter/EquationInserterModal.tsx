'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './EquationInserterModal.module.css'
import { insertEquationToHTML, validateLatex, formatKaTeXError } from '@/lib/equationProcessor'
import type { EditorHandle } from '@/components/Editor/Editor'
import type { EquationConfig, EquationDisplayType, EquationAlignment } from '@/types'

interface EquationInserterModalProps {
  isOpen: boolean
  onClose: () => void
  htmlContent: string
  setHtmlContent: (content: string) => void
  editorRef?: React.RefObject<EditorHandle | null>
  onStatusUpdate?: (message: string) => void
}

// よく使う数式テンプレート
const EQUATION_TEMPLATES = [
  { name: '分数', latex: '\\frac{a}{b}', description: '分数' },
  { name: '平方根', latex: '\\sqrt{x}', description: '平方根' },
  { name: 'n乗根', latex: '\\sqrt[n]{x}', description: 'n乗根' },
  { name: '上付き', latex: 'x^2', description: '上付き文字' },
  { name: '下付き', latex: 'x_i', description: '下付き文字' },
  { name: '積分', latex: '\\int_{a}^{b} f(x) dx', description: '定積分' },
  { name: '総和', latex: '\\sum_{i=1}^{n} x_i', description: '総和' },
  { name: '極限', latex: '\\lim_{x \\to \\infty} f(x)', description: '極限' },
  { name: '偏微分', latex: '\\frac{\\partial f}{\\partial x}', description: '偏微分' },
  { name: '行列', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', description: '2×2行列' },
  { name: 'ベクトル', latex: '\\vec{v} = (x, y, z)', description: 'ベクトル' },
  { name: 'ギリシャ文字α', latex: '\\alpha', description: 'アルファ' },
  { name: 'ギリシャ文字β', latex: '\\beta', description: 'ベータ' },
  { name: 'ギリシャ文字π', latex: '\\pi', description: 'パイ' },
  { name: '不等号', latex: 'a \\leq b', description: '以下' },
  { name: '実数', latex: '\\mathbb{R}', description: '実数集合' },
]

export default function EquationInserterModal({
  isOpen,
  onClose,
  htmlContent,
  setHtmlContent,
  editorRef,
  onStatusUpdate
}: EquationInserterModalProps) {
  const [latex, setLatex] = useState('E = mc^2')
  const [displayType, setDisplayType] = useState<EquationDisplayType>('block')
  const [alignment, setAlignment] = useState<EquationAlignment>('center')
  const [caption, setCaption] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const latexTextareaRef = useRef<HTMLTextAreaElement>(null)
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // リアルタイムプレビュー（デバウンス処理付き）
  useEffect(() => {
    if (!isOpen) return

    // 既存のタイムアウトをクリア
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
    }

    // デバウンス処理（300ms）
    previewTimeoutRef.current = setTimeout(() => {
      if (typeof window === 'undefined' || !(window as any).katex) {
        return
      }

      const trimmedLatex = latex.trim()
      if (!trimmedLatex) {
        setPreviewHtml('')
        setError(null)
        return
      }

      // バリデーション
      const validation = validateLatex(trimmedLatex)
      if (!validation.isValid) {
        setError(validation.error || '無効なLaTeXコードです')
        setPreviewHtml('')
        return
      }

      try {
        // KaTeXでレンダリング
        const katex = (window as any).katex
        const rendered = katex.renderToString(trimmedLatex, {
          displayMode: displayType === 'block',
          throwOnError: false,
          errorColor: '#cc0000'
        })
        setPreviewHtml(rendered)
        setError(null)
      } catch (err) {
        const errorMessage = err instanceof Error ? formatKaTeXError(err) : 'レンダリングエラーが発生しました'
        setError(errorMessage)
        setPreviewHtml('')
      }
    }, 300)

    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current)
      }
    }
  }, [latex, displayType, isOpen])

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
    if (isOpen && latexTextareaRef.current) {
      setTimeout(() => {
        latexTextareaRef.current?.focus()
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

    const trimmedLatex = latex.trim()
    if (!trimmedLatex) {
      alert('LaTeXコードを入力してください')
      return
    }

    // バリデーション
    const validation = validateLatex(trimmedLatex)
    if (!validation.isValid) {
      alert(validation.error || '無効なLaTeXコードです')
      return
    }

    const config: EquationConfig = {
      latex: trimmedLatex,
      displayType,
      alignment: displayType === 'block' ? alignment : undefined,
      caption: displayType === 'block' && caption.trim() ? caption.trim() : undefined,
      label: displayType === 'block' && label.trim() ? label.trim() : undefined
    }

    const cursorPos = editorRef.current?.getCursorPosition() || 0
    const result = insertEquationToHTML(htmlContent, cursorPos, config)
    
    setHtmlContent(result.newContent)
    setTimeout(() => {
      editorRef?.current?.setCursorPosition(result.newCursorPos)
    }, 0)
    
    if (onStatusUpdate) {
      const typeLabel = displayType === 'inline' ? 'インライン数式' : 'ブロック数式'
      onStatusUpdate(`${typeLabel}を挿入しました`)
      setTimeout(() => onStatusUpdate(''), 3000)
    }
    onClose()
  }

  const handleTemplateClick = (templateLatex: string) => {
    setLatex(templateLatex)
    if (latexTextareaRef.current) {
      latexTextareaRef.current.focus()
    }
  }

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>📐 数式を挿入</h3>
        
        {/* 数式タイプ選択 */}
        <div className={styles.section}>
          <label className={styles.sectionTitle}>数式タイプ:</label>
          <div className={styles.radioGroup}>
            <label className={`${styles.radioLabel} ${displayType === 'block' ? styles.selected : ''}`}>
              <input
                type="radio"
                name="displayType"
                value="block"
                checked={displayType === 'block'}
                onChange={(e) => setDisplayType(e.target.value as EquationDisplayType)}
              />
              <span>ブロック数式（独立した行）</span>
            </label>
            <label className={`${styles.radioLabel} ${displayType === 'inline' ? styles.selected : ''}`}>
              <input
                type="radio"
                name="displayType"
                value="inline"
                checked={displayType === 'inline'}
                onChange={(e) => setDisplayType(e.target.value as EquationDisplayType)}
              />
              <span>インライン数式（文中に埋め込む）</span>
            </label>
          </div>
        </div>

        {/* LaTeX入力エリア */}
        <div className={styles.section}>
          <label className={styles.sectionTitle}>LaTeXコード:</label>
          <textarea
            ref={latexTextareaRef}
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            placeholder="例: E = mc^2 または \\int_{a}^{b} f(x) dx"
            className={styles.latexInput}
            rows={6}
            spellCheck={false}
          />
        </div>

        {/* リアルタイムプレビュー */}
        <div className={styles.section}>
          <label className={styles.sectionTitle}>プレビュー:</label>
          <div className={styles.previewContainer}>
            {error ? (
              <div className={styles.errorMessage}>{error}</div>
            ) : previewHtml ? (
              <div 
                className={`${styles.previewContent} ${displayType === 'block' ? styles.previewBlock : styles.previewInline}`}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div className={styles.previewPlaceholder}>LaTeXコードを入力するとプレビューが表示されます</div>
            )}
          </div>
        </div>

        {/* よく使う数式テンプレート */}
        <div className={styles.section}>
          <label className={styles.sectionTitle}>よく使う数式テンプレート:</label>
          <div className={styles.templateGrid}>
            {EQUATION_TEMPLATES.map((template, index) => (
              <button
                key={index}
                className={styles.templateButton}
                onClick={() => handleTemplateClick(template.latex)}
                title={template.description}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        {/* オプション設定（ブロック数式のみ） */}
        {displayType === 'block' && (
          <>
            <div className={styles.section}>
              <label className={styles.sectionTitle}>配置:</label>
              <div className={styles.radioGroup}>
                <label className={`${styles.radioLabel} ${alignment === 'left' ? styles.selected : ''}`}>
                  <input
                    type="radio"
                    name="alignment"
                    value="left"
                    checked={alignment === 'left'}
                    onChange={(e) => setAlignment(e.target.value as EquationAlignment)}
                  />
                  <span>左寄せ</span>
                </label>
                <label className={`${styles.radioLabel} ${alignment === 'center' ? styles.selected : ''}`}>
                  <input
                    type="radio"
                    name="alignment"
                    value="center"
                    checked={alignment === 'center'}
                    onChange={(e) => setAlignment(e.target.value as EquationAlignment)}
                  />
                  <span>中央揃え</span>
                </label>
                <label className={`${styles.radioLabel} ${alignment === 'right' ? styles.selected : ''}`}>
                  <input
                    type="radio"
                    name="alignment"
                    value="right"
                    checked={alignment === 'right'}
                    onChange={(e) => setAlignment(e.target.value as EquationAlignment)}
                  />
                  <span>右寄せ</span>
                </label>
              </div>
            </div>

            <div className={styles.section}>
              <label className={styles.label}>
                <span>キャプション（任意）:</span>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="数式の説明を入力..."
                  className={styles.textInput}
                />
              </label>
            </div>

            <div className={styles.section}>
              <label className={styles.label}>
                <span>ラベル（任意、参照用）:</span>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="eq:example"
                  className={styles.textInput}
                />
              </label>
            </div>
          </>
        )}

        <div className={styles.actions}>
          <button className={styles.insertBtn} onClick={handleInsert}>
            📐 挿入
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

