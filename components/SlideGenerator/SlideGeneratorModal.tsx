'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './SlideGeneratorModal.module.css'
import { generateSlides } from '@/lib/slideGeneratorApi'
import type { EditorHandle } from '@/components/Editor/Editor'

interface SlideGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  htmlContent: string
  setHtmlContent: (content: string) => void
  editorRef?: React.RefObject<EditorHandle | null>
  onStatusUpdate?: (message: string) => void
}

export default function SlideGeneratorModal({
  isOpen,
  onClose,
  htmlContent,
  setHtmlContent,
  editorRef,
  onStatusUpdate,
}: SlideGeneratorModalProps) {
  const [theme, setTheme] = useState('')
  const [content, setContent] = useState('')
  const [chapters, setChapters] = useState<string[]>([''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) {
    return null
  }

  // document.bodyが存在しない場合はレンダリングしない
  if (typeof document === 'undefined' || !document.body) {
    return null
  }

  const handleAddChapter = () => {
    setChapters([...chapters, ''])
  }

  const handleRemoveChapter = (index: number) => {
    if (chapters.length > 1) {
      setChapters(chapters.filter((_, i) => i !== index))
    } else {
      setChapters([''])
    }
  }

  const handleChapterChange = (index: number, value: string) => {
    const newChapters = [...chapters]
    newChapters[index] = value
    setChapters(newChapters)
  }

  const handleGenerate = async () => {
    // バリデーション
    if (!theme.trim()) {
      setError('テーマを入力してください')
      return
    }
    if (!content.trim()) {
      setError('内容を入力してください')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 空の章を除外
      const validChapters = chapters.filter(ch => ch.trim() !== '')

      // Lambda API経由でスライドを生成
      const generatedHTML = await generateSlides(
        theme.trim(),
        content.trim(),
        validChapters
      )

      if (!generatedHTML) {
        throw new Error('生成されたHTMLが空です')
      }

      // 既存のHTMLを完全に置き換える
      setHtmlContent(generatedHTML)

      // カーソル位置を先頭に移動
      setTimeout(() => {
        editorRef?.current?.setCursorPosition(0)
      }, 0)

      // ステータス更新
      if (onStatusUpdate) {
        onStatusUpdate('スライドを生成しました')
        setTimeout(() => {
          onStatusUpdate('')
        }, 3000)
      }

      // モーダルを閉じる
      onClose()

      // フォームをリセット
      setTheme('')
      setContent('')
      setChapters([''])
    } catch (err: any) {
      console.error('スライド生成エラー:', err)
      setError(err.message || 'スライドの生成に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleCancel = () => {
    setTheme('')
    setContent('')
    setChapters([''])
    setError(null)
    onClose()
  }

  const modalContent = (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <h3>🤖 AIスライド生成</h3>

        {error && (
          <div className={styles.errorMessage}>
            ⚠️ {error}
          </div>
        )}

        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="theme" className={styles.label}>
              テーマ <span className={styles.required}>*</span>
            </label>
            <input
              id="theme"
              type="text"
              className={styles.input}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="例: プロジェクト管理のベストプラクティス"
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="content" className={styles.label}>
              内容 <span className={styles.required}>*</span>
            </label>
            <textarea
              id="content"
              className={styles.textarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="スライドに含めたい内容や要点を記入してください..."
              rows={5}
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              章立て（オプション）
            </label>
            <div className={styles.chaptersContainer}>
              {chapters.map((chapter, index) => (
                <div key={index} className={styles.chapterItem}>
                  <input
                    type="text"
                    className={styles.input}
                    value={chapter}
                    onChange={(e) => handleChapterChange(index, e.target.value)}
                    placeholder={`章 ${index + 1}`}
                    disabled={isLoading}
                  />
                  {chapters.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => handleRemoveChapter(index)}
                      disabled={isLoading}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className={styles.addButton}
                onClick={handleAddChapter}
                disabled={isLoading}
              >
                + 章を追加
              </button>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.cancelBtn}
            onClick={handleCancel}
            disabled={isLoading}
          >
            ❌ キャンセル
          </button>
          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={isLoading || !theme.trim() || !content.trim()}
          >
            {isLoading ? '⏳ 生成中...' : '✨ 生成'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
