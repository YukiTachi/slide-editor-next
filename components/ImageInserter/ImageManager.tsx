'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './ImageManager.module.css'
import { getAllStoredImages, deleteImageFromStorage, type StoredImages, type ImageData } from '@/lib/imageStorage'
import { insertImageToHTML, hasSplitSlideImage } from '@/lib/imageProcessor'
import { REPLACE_SPLIT_IMAGE_MESSAGE } from '@/components/ImageInserter/ImageInserterModal'
import type { EditorHandle } from '@/components/Editor/Editor'

interface ImageManagerProps {
  isOpen: boolean
  onClose: () => void
  onStatusUpdate?: (message: string) => void
  htmlContent?: string
  setHtmlContent?: (content: string) => void
  editorRef?: React.RefObject<EditorHandle | null>
}

export default function ImageManager({ 
  isOpen, 
  onClose, 
  onStatusUpdate, 
  htmlContent = '', 
  setHtmlContent, 
  editorRef 
}: ImageManagerProps) {
  const [images, setImages] = useState<StoredImages>({})
  const [mounted, setMounted] = useState(false)
  const [previewImage, setPreviewImage] = useState<{ data: string; fileName: string; image: ImageData } | null>(null)
  const [detailImage, setDetailImage] = useState<{ fileName: string; image: ImageData } | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setImages(getAllStoredImages())
    }
  }, [isOpen])

  // 1. 画像をエディタに挿入
  const handleInsert = (fileName: string, image: ImageData) => {
    if (!htmlContent || !setHtmlContent || !editorRef) {
      alert('エディタが利用できません')
      return
    }

    const cursorPos = editorRef.current?.getCursorPosition() || 0
    // 既に画像を持つ分割スライドなら置き換えの確認（docs/PDF_EXPORT_RANGE_PLAN.md 2.9）
    if (hasSplitSlideImage(htmlContent, cursorPos) && !confirm(REPLACE_SPLIT_IMAGE_MESSAGE)) return
    const result = insertImageToHTML(htmlContent, cursorPos, '', image.originalName, fileName)
    
    setHtmlContent(result.newContent)
    setTimeout(() => {
      editorRef?.current?.setCursorPosition(result.newCursorPos)
    }, 0)
    
    if (onStatusUpdate) {
      onStatusUpdate(`画像 "${image.originalName}" を挿入しました`)
      setTimeout(() => onStatusUpdate(''), 3000)
    }
    onClose()
  }

  // 2. 画像のダウンロード
  const handleDownload = (fileName: string, image: ImageData) => {
    const link = document.createElement('a')
    link.href = image.data
    link.download = image.originalName || fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    if (onStatusUpdate) {
      onStatusUpdate(`画像 "${image.originalName}" をダウンロードしました`)
      setTimeout(() => onStatusUpdate(''), 3000)
    }
  }

  // 3. 画像のコピー
  const handleCopy = async (image: ImageData) => {
    try {
      // Base64データをBlobに変換
      const response = await fetch(image.data)
      const blob = await response.blob()
      
      // クリップボードにコピー
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ])
      
      if (onStatusUpdate) {
        onStatusUpdate(`画像 "${image.originalName}" をクリップボードにコピーしました`)
        setTimeout(() => onStatusUpdate(''), 3000)
      }
    } catch (err) {
      console.error('コピーに失敗:', err)
      alert('クリップボードへのコピーに失敗しました')
    }
  }

  // 4. 画像のプレビュー（拡大表示）
  const handlePreview = (fileName: string, image: ImageData) => {
    setPreviewImage({ data: image.data, fileName, image })
  }

  // 5. 画像情報の詳細表示
  const handleShowDetail = (fileName: string, image: ImageData) => {
    setDetailImage({ fileName, image })
  }

  const handleDelete = (fileName: string) => {
    if (confirm(`画像 "${fileName}" を削除しますか？`)) {
      deleteImageFromStorage(fileName)
      setImages(getAllStoredImages())
      if (onStatusUpdate) {
        onStatusUpdate('画像を削除しました')
        setTimeout(() => onStatusUpdate(''), 3000)
      }
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  if (!isOpen || !mounted) return null

  const imageList = Object.keys(images)

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>📁 画像管理</h3>
        {imageList.length === 0 ? (
          <>
            <p>保存されている画像がありません。</p>
            <button className={styles.closeBtn} onClick={onClose}>
              閉じる
            </button>
          </>
        ) : (
          <>
            <div className={styles.imageList}>
              {imageList.map((fileName) => {
                const image = images[fileName]
                const sizeKB = (image.size / 1024).toFixed(1)
                return (
                  <div key={fileName} className={styles.imageItem}>
                    <img 
                      src={image.data} 
                      alt={image.originalName} 
                      className={styles.thumbnail}
                      onClick={() => handlePreview(fileName, image)}
                      style={{ cursor: 'pointer' }}
                      title="クリックで拡大表示"
                    />
                    <div className={styles.imageInfo}>
                      <strong>{image.originalName}</strong>
                      <br />
                      <small>
                        {fileName} ({sizeKB}KB)
                      </small>
                    </div>
                    <div className={styles.buttonGroup}>
                      {htmlContent && setHtmlContent && editorRef && (
                        <button 
                          className={styles.actionBtn} 
                          onClick={() => handleInsert(fileName, image)}
                          title="エディタに挿入"
                        >
                          ➕
                        </button>
                      )}
                      <button 
                        className={styles.actionBtn} 
                        onClick={() => handleDownload(fileName, image)}
                        title="ダウンロード"
                      >
                        ⬇️
                      </button>
                      <button 
                        className={styles.actionBtn} 
                        onClick={() => handleCopy(image)}
                        title="クリップボードにコピー"
                      >
                        📋
                      </button>
                      <button 
                        className={styles.actionBtn} 
                        onClick={() => handleShowDetail(fileName, image)}
                        title="詳細情報"
                      >
                        ℹ️
                      </button>
                      <button 
                        className={styles.deleteBtn} 
                        onClick={() => handleDelete(fileName)}
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <button className={styles.closeBtn} onClick={onClose}>
              閉じる
            </button>
          </>
        )}
      </div>
    </div>
  )

  const previewModalContent = previewImage ? (
    <div className={styles.previewOverlay} onClick={() => setPreviewImage(null)}>
      <div className={styles.previewModal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closePreviewBtn} onClick={() => setPreviewImage(null)}>✕</button>
        <img src={previewImage.data} alt={previewImage.image.originalName} className={styles.previewImage} />
        <div className={styles.previewInfo}>
          <strong>{previewImage.image.originalName}</strong>
          <small>{previewImage.fileName}</small>
        </div>
      </div>
    </div>
  ) : null

  const detailModalContent = detailImage ? (
    <div className={styles.detailOverlay} onClick={() => setDetailImage(null)}>
      <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeDetailBtn} onClick={() => setDetailImage(null)}>✕</button>
        <h4>📊 画像情報</h4>
        <div className={styles.detailContent}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>ファイル名:</span>
            <span className={styles.detailValue}>{detailImage.image.originalName}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>保存名:</span>
            <span className={styles.detailValue}>{detailImage.fileName}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>サイズ:</span>
            <span className={styles.detailValue}>{formatFileSize(detailImage.image.size)}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>タイプ:</span>
            <span className={styles.detailValue}>{detailImage.image.type}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>保存日時:</span>
            <span className={styles.detailValue}>{formatDate(detailImage.image.timestamp)}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>プレビュー:</span>
            <img src={detailImage.image.data} alt={detailImage.image.originalName} className={styles.detailPreview} />
          </div>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {createPortal(modalContent, document.body)}
      {previewModalContent && createPortal(previewModalContent, document.body)}
      {detailModalContent && createPortal(detailModalContent, document.body)}
    </>
  )
}


