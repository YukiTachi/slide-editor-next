'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './Preview.module.css'
import { processHTMLForPreviewAsync, processHTMLForPreview } from '@/lib/htmlProcessor'
import { extractSlides, reorderSlides, getSlideTitle, deleteSlide, duplicateSlide } from '@/lib/slideReorder'
import { useSlideSize } from '@/hooks/useSlideSize'
import SlideSizeSelector from '@/components/SlideSizeSelector/SlideSizeSelector'
import { calculatePreviewScale } from '@/lib/slideSizeConfig'

interface PreviewProps {
  htmlContent: string
  setHtmlContent?: (content: string) => void
  onPresentationModeStart?: () => void
}

export default function Preview({ htmlContent, setHtmlContent, onPresentationModeStart }: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [slides, setSlides] = useState<Array<{ html: string; title: string; index: number }>>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const { sizeConfig, sizeType, setSlideSize } = useSlideSize()
  const [previewScale, setPreviewScale] = useState(1)

  // スライドを抽出
  useEffect(() => {
    const extractedSlides = extractSlides(htmlContent)
    setSlides(extractedSlides.map((slide, index) => ({
      html: slide.html,
      title: getSlideTitle(slide.html),
      index
    })))
  }, [htmlContent])

  // プレビュースケールを計算（16:9サイズの場合に縮小が必要）
  useEffect(() => {
    // A4横向きの場合はスケーリング不要
    if (sizeConfig.type === 'a4-landscape') {
      setPreviewScale(1)
      if (iframeRef.current) {
        iframeRef.current.style.transform = 'none'
        iframeRef.current.style.transformOrigin = 'unset'
        iframeRef.current.style.width = '100%'
        iframeRef.current.style.height = '100%'
      }
      return
    }
    
    const calculateScale = () => {
      if (previewContainerRef.current && iframeRef.current) {
        // パディングを考慮した幅と高さを計算（左右・上下20pxずつ）
        const containerWidth = previewContainerRef.current.clientWidth - 40
        const containerHeight = previewContainerRef.current.clientHeight - 40
        
        // 16:9サイズの実際のピクセル値
        const slideWidth = 1920
        const slideHeight = 1080
        
        // コンテナに収まるスケールを計算（幅と高さの両方を考慮）
        const widthScale = containerWidth / slideWidth
        const heightScale = containerHeight / slideHeight
        const scale = Math.min(widthScale, heightScale, 1) // 最大1.0
        
        setPreviewScale(scale)
        
        // iframeにスケーリングを適用（16:9の場合のみ）
        if (scale < 1) {
          // スケール後の実際のサイズを計算
          const scaledWidth = slideWidth * scale
          const scaledHeight = slideHeight * scale
          
          // iframeのサイズをスケール後のサイズに設定
          iframeRef.current.style.width = `${scaledWidth}px`
          iframeRef.current.style.height = `${scaledHeight}px`
          iframeRef.current.style.transform = 'none'
          iframeRef.current.style.transformOrigin = 'unset'
        } else {
          iframeRef.current.style.width = '100%'
          iframeRef.current.style.height = '100%'
          iframeRef.current.style.transform = 'none'
          iframeRef.current.style.transformOrigin = 'unset'
        }
      }
    }
    
    // 初期計算（少し遅延させてDOMのサイズが確定してから）
    const timeoutId = setTimeout(calculateScale, 100)
    
    // ウィンドウリサイズ時にも再計算
    window.addEventListener('resize', calculateScale)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', calculateScale)
    }
  }, [sizeConfig])

  useEffect(() => {
    if (!iframeRef.current) return

    const iframe = iframeRef.current
    const doc = iframe.contentDocument || iframe.contentWindow?.document

    if (!doc) return

    // サイズ設定に基づいてHTMLを処理
    processHTMLForPreviewAsync(htmlContent, sizeConfig).then((processedContent) => {
      if (processedContent && iframeRef.current) {
        const currentDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
        if (currentDoc) {
          currentDoc.open()
          currentDoc.write(processedContent)
          currentDoc.close()
        }
      }
    }).catch((error) => {
      console.warn('CSS読み込みエラー、フォールバックを使用:', error)
      // エラー時は同期版を使用
      const processedContent = processHTMLForPreview(htmlContent, sizeConfig)
      if (processedContent && iframeRef.current) {
        const currentDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
        if (currentDoc) {
          currentDoc.open()
          currentDoc.write(processedContent)
          currentDoc.close()
        }
      }
    })
  }, [htmlContent, sizeConfig])

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

  const handleStartPresentation = () => {
    if (slides.length === 0) {
      alert('スライドがありません。プレゼンテーションモードを開始できません。')
      return
    }
    if (onPresentationModeStart) {
      onPresentationModeStart()
    }
  }

  return (
    <div className={styles.previewPanel}>
      <div className={styles.panelHeader}>
        <span>プレビュー</span>
        {/* 中央にスライドサイズセレクターを配置 */}
        <div className={styles.headerCenter}>
          <SlideSizeSelector
            currentSizeType={sizeType}
            onSizeChange={setSlideSize}
          />
        </div>
        {hasContent && slides.length > 0 && (
          <button
            className={styles.presentationButton}
            onClick={handleStartPresentation}
            title="フルスクリーンプレゼンテーションモードを開始 (F5)"
          >
            🎬 プレゼンテーション
          </button>
        )}
      </div>
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
                        {setHtmlContent != null && (
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
            <div 
              ref={previewContainerRef}
              className={styles.previewWrapper}
            >
              <iframe
                ref={iframeRef}
                className={styles.previewFrame}
                title="プレビュー"
              />
            </div>
          </div>
        ) : (
          <div className={styles.placeholder}>
            {sizeType === 'a4-landscape' ? 'A4横向き' : '16:9'}スライドのプレビューがここに表示されます
          </div>
        )}
      </div>
    </div>
  )
}

