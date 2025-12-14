'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './SlideTemplateSelectorModal.module.css'
import { SlideTemplates, DEFAULT_TEMPLATES } from '@/lib/slideTemplates'
import type { SlideTemplate } from '@/types'
import type { EditorHandle } from '@/components/Editor/Editor'

interface SlideTemplateSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  htmlContent: string
  setHtmlContent: (content: string) => void
  editorRef?: React.RefObject<EditorHandle | null>
  onStatusUpdate?: (message: string) => void
}

type Category = 'all' | 'basic' | 'layout' | 'special'

export default function SlideTemplateSelectorModal({
  isOpen,
  onClose,
  htmlContent,
  setHtmlContent,
  editorRef,
  onStatusUpdate,
}: SlideTemplateSelectorModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all')

  if (!isOpen) {
    return null
  }

  // document.bodyが存在しない場合はレンダリングしない
  if (typeof document === 'undefined' || !document.body) {
    return null
  }

  // カテゴリでフィルタリング
  const filteredTemplates =
    selectedCategory === 'all'
      ? DEFAULT_TEMPLATES
      : DEFAULT_TEMPLATES.filter((t) => t.category === selectedCategory)

  const handleTemplateSelect = (template: SlideTemplate) => {
    const cursorPosition = editorRef?.current?.getCursorPosition() || 0
    const slideInsertPosition = SlideTemplates.findSlideInsertPosition(htmlContent, cursorPosition)

    // 選択したテンプレートのHTMLを取得
    const templateHTML = SlideTemplates.getTemplate(template.id)

    // 新しいHTMLコンテンツを作成
    let newHtmlContent =
      htmlContent.slice(0, slideInsertPosition) + templateHTML + htmlContent.slice(slideInsertPosition)

    // ページ番号を振り直し
    newHtmlContent = SlideTemplates.updatePageNumbers(newHtmlContent)

    // エディタに新しいコンテンツを設定
    setHtmlContent(newHtmlContent)

    // カーソル位置を新しいスライドの開始位置に移動
    // テンプレートの最初のh1タグの位置を探す
    const h1Index = templateHTML.indexOf('<h1>')
    if (h1Index !== -1) {
      const titleEndIndex = templateHTML.indexOf('</h1>', h1Index)
      if (titleEndIndex !== -1) {
        const newCursorPosition = slideInsertPosition + titleEndIndex + 5 // </h1>の後
        setTimeout(() => {
          editorRef?.current?.setCursorPosition(newCursorPosition)
        }, 0)
      }
    }

    // ステータス更新
    if (onStatusUpdate) {
      onStatusUpdate(`「${template.name}」テンプレートでスライドを追加しました`)
      setTimeout(() => {
        onStatusUpdate('')
      }, 2000)
    }

    // モーダルを閉じる
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const categories: Array<{ id: Category; label: string }> = [
    { id: 'all', label: 'すべて' },
    { id: 'basic', label: '基本' },
    { id: 'layout', label: 'レイアウト' },
    { id: 'special', label: '特別' },
  ]

  const modalContent = (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <h3>📋 テンプレートからスライド追加</h3>

        {/* カテゴリフィルタ */}
        <div className={styles.categoryTabs}>
          {categories.map((category) => (
            <button
              key={category.id}
              className={`${styles.categoryTab} ${selectedCategory === category.id ? styles.active : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* テンプレートグリッド */}
        <div className={styles.templateGrid}>
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={styles.templateCard}
              onClick={() => handleTemplateSelect(template)}
            >
              <div className={styles.templateIcon}>{template.icon}</div>
              <div className={styles.templateName}>{template.name}</div>
              <div className={styles.templateDescription}>{template.description}</div>
            </div>
          ))}
        </div>

        {/* キャンセルボタン */}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            ❌ キャンセル
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}


