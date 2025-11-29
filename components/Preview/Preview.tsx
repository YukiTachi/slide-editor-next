'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './Preview.module.css'
import { processHTMLForPreview } from '@/lib/htmlProcessor'
import { extractSlides, reorderSlides, getSlideTitle, deleteSlide, duplicateSlide } from '@/lib/slideReorder'

interface PreviewProps {
  htmlContent: string
  setHtmlContent?: (content: string) => void
}

export default function Preview({ htmlContent, setHtmlContent }: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [slides, setSlides] = useState<Array<{ html: string; title: string; index: number }>>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // スライドを抽出
  useEffect(() => {
    const extractedSlides = extractSlides(htmlContent)
    setSlides(extractedSlides.map((slide, index) => ({
      html: slide.html,
      title: getSlideTitle(slide.html),
      index
    })))
  }, [htmlContent])

  useEffect(() => {
    if (!iframeRef.current) return

    const iframe = iframeRef.current
    const doc = iframe.contentDocument || iframe.contentWindow?.document

    if (!doc) return

    const processedContent = processHTMLForPreview(htmlContent)

    if (processedContent) {
      doc.open()
      doc.write(processedContent)
      doc.close()
    }
  }, [htmlContent])

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex || !setHtmlContent) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newContent = reorderSlides(htmlContent, draggedIndex, dropIndex)
    setHtmlContent(newContent)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDeleteSlide = (index: number) => {
    if (!setHtmlContent) return
    
    if (slides.length <= 1) {
      alert('最後の1つのスライドは削除できません。')
      return
    }

    if (confirm(`スライド${index + 1}「${slides[index].title}」を削除しますか？`)) {
      const newContent = deleteSlide(htmlContent, index)
      setHtmlContent(newContent)
    }
  }

  const handleDuplicateSlide = (index: number) => {
    if (!setHtmlContent) return
    
    const newContent = duplicateSlide(htmlContent, index)
    setHtmlContent(newContent)
  }

  const hasContent = htmlContent.trim().length > 0
  const canReorder = slides.length > 1 && setHtmlContent !== undefined

  return (
    <div className={styles.previewPanel}>
      <div className={styles.panelHeader}>プレビュー</div>
      <div className={styles.previewContainer}>
        {hasContent ? (
          <div className={styles.previewWithSlides}>
            {canReorder && (
              <div className={styles.slideList}>
                <div className={styles.slideListHeader}>
                  <span>📋 スライド一覧</span>
                  <small>ドラッグ&ドロップで順序変更</small>
                </div>
                <div className={styles.slideListContent}>
                  {slides.map((slide, index) => (
                    <div
                      key={index}
                      className={`${styles.slideItem} ${
                        draggedIndex === index ? styles.dragging : ''
                      } ${dragOverIndex === index ? styles.dragOver : ''}`}
                      draggable={canReorder}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      <span className={styles.slideNumber}>{index + 1}</span>
                      <span className={styles.slideTitle}>{slide.title || 'タイトルなし'}</span>
                      <div className={styles.slideActions}>
                        {setHtmlContent && (
                          <>
                            <button
                              className={styles.actionBtn}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDuplicateSlide(index)
                              }}
                              title="複製"
                            >
                              📋
                            </button>
                            <button
                              className={styles.actionBtn}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteSlide(index)
                              }}
                              disabled={slides.length <= 1}
                              title={slides.length <= 1 ? "最後の1つは削除できません" : "削除"}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                        {canReorder && <span className={styles.dragHandle}>⋮⋮</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              className={styles.previewFrame}
              title="プレビュー"
            />
          </div>
        ) : (
          <div className={styles.placeholder}>
            A4横向きスライドのプレビューがここに表示されます
          </div>
        )}
      </div>
    </div>
  )
}

