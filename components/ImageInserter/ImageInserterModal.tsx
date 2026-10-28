'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './ImageInserterModal.module.css'
import { saveImageToStorage, generateImageFileName, convertBase64ToExternal } from '@/lib/imageStorage'
import { insertImageToHTML, hasSplitSlideImage } from '@/lib/imageProcessor'
import type { EditorHandle } from '@/components/Editor/Editor'

// 分割スライドの右カラムは画像 1 枚前提のため、既に画像があれば置き換えの確認を出す（docs/PDF_EXPORT_RANGE_PLAN.md 2.9）
export const REPLACE_SPLIT_IMAGE_MESSAGE = 'このスライドは分割レイアウトで既に画像があります。右側の画像を置き換えますか？'

interface ImageInserterModalProps {
  isOpen: boolean
  onClose: () => void
  htmlContent: string
  setHtmlContent: (content: string) => void
  editorRef?: React.RefObject<EditorHandle | null>
  onStatusUpdate?: (message: string) => void
}

const MAX_BASE64_SIZE = 1024 * 1024 // 1MB

export default function ImageInserterModal({
  isOpen,
  onClose,
  htmlContent,
  setHtmlContent,
  editorRef,
  onStatusUpdate
}: ImageInserterModalProps) {
  const [imageMode, setImageMode] = useState<'external' | 'base64'>('external')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  if (!isOpen) {
    return null
  }

  // document.bodyが存在しない場合はレンダリングしない
  if (typeof document === 'undefined' || !document.body) {
    return null
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await handleFiles(Array.from(files))
    }
  }

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await processFile(file)
      } else {
        alert(`${file.name} は画像ファイルではありません。`)
      }
    }
    onClose()
  }

  // 既に画像を持つ分割スライドなら置き換えてよいか確認する。false なら挿入しない
  const confirmReplaceIfSplitImage = (): boolean => {
    const cursorPos = editorRef?.current?.getCursorPosition() || 0
    if (!hasSplitSlideImage(htmlContent, cursorPos)) return true
    return confirm(REPLACE_SPLIT_IMAGE_MESSAGE)
  }

  const processFile = async (file: File) => {
    if (!confirmReplaceIfSplitImage()) return
    if (imageMode === 'external') {
      await insertAsExternalFile(file)
    } else {
      if (file.size <= MAX_BASE64_SIZE) {
        insertAsBase64(file)
      } else {
        showSizeWarning(file)
      }
    }
  }

  const insertAsExternalFile = async (file: File) => {
    try {
      const fileName = generateImageFileName(file.name)
      await saveImageToStorage(file, fileName)
      
      const cursorPos = editorRef?.current?.getCursorPosition() || 0
      const result = insertImageToHTML(htmlContent, cursorPos, '', file.name, fileName)
      
      setHtmlContent(result.newContent)
      setTimeout(() => {
        editorRef?.current?.setCursorPosition(result.newCursorPos)
      }, 0)
      
      if (onStatusUpdate) {
        onStatusUpdate(`画像 "${file.name}" を外部ファイルとして保存しました`)
        setTimeout(() => onStatusUpdate(''), 3000)
      }
    } catch (error) {
      console.error('画像保存エラー:', error)
      alert('画像の保存に失敗しました。')
    }
  }

  const insertAsBase64 = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string
      const cursorPos = editorRef?.current?.getCursorPosition() || 0
      const result = insertImageToHTML(htmlContent, cursorPos, imageSrc, file.name)
      
      setHtmlContent(result.newContent)
      setTimeout(() => {
        editorRef?.current?.setCursorPosition(result.newCursorPos)
      }, 0)
      
      if (onStatusUpdate) {
        onStatusUpdate(`画像 "${file.name}" を挿入しました`)
        setTimeout(() => onStatusUpdate(''), 3000)
      }
    }
    reader.readAsDataURL(file)
  }

  const insertByURL = () => {
    const url = prompt('画像のURLを入力してください:')
    if (url && isValidURL(url)) {
      if (!confirmReplaceIfSplitImage()) return
      const cursorPos = editorRef?.current?.getCursorPosition() || 0
      const result = insertImageToHTML(htmlContent, cursorPos, url, '外部画像')
      
      setHtmlContent(result.newContent)
      setTimeout(() => {
        editorRef?.current?.setCursorPosition(result.newCursorPos)
      }, 0)
      
      if (onStatusUpdate) {
        onStatusUpdate('URLから画像を挿入しました')
        setTimeout(() => onStatusUpdate(''), 3000)
      }
      onClose()
    } else if (url) {
      alert('有効なURLを入力してください。')
    }
  }

  const showSizeWarning = (file: File) => {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
    if (confirm(`画像サイズが${sizeMB}MBと大きいです。Base64で埋め込みますか？\n（HTMLファイルが大きくなります）`)) {
      insertAsBase64(file)
    }
  }

  const isValidURL = (string: string): boolean => {
    try {
      const url = new URL(string)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(Array.from(files))
    }
  }

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>🖼️ 画像を挿入</h3>
        
        <div className={styles.settings}>
          <label>
            <input
              type="radio"
              name="imageMode"
              value="external"
              checked={imageMode === 'external'}
              onChange={() => setImageMode('external')}
            />
            📁 外部ファイルとして保存（HTMLが読みやすい）
          </label>
          <label>
            <input
              type="radio"
              name="imageMode"
              value="base64"
              checked={imageMode === 'base64'}
              onChange={() => setImageMode('base64')}
            />
            🔗 Base64で埋め込み（1ファイルで完結）
          </label>
        </div>

        <div className={styles.options}>
          <button className={styles.fileBtn} onClick={handleFileSelect}>
            📁 ファイルを選択
          </button>
          <button className={styles.urlBtn} onClick={insertByURL}>
            🔗 URLから挿入
          </button>
          <button className={styles.cancelBtn} onClick={onClose}>
            ❌ キャンセル
          </button>
        </div>

        <div
          className={`${styles.dropZone} ${isDragging ? styles.dragOver : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          📎 ここに画像をドラッグ&ドロップ<br />
          <small>対応形式: JPG, PNG, GIF, WebP</small>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}


