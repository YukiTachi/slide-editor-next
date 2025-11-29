'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import styles from './SearchReplaceModal.module.css'

interface SearchReplaceModalProps {
  isOpen: boolean
  onClose: () => void
  htmlContent: string
  onReplace: (newContent: string) => void
  editorRef?: React.RefObject<{ getCursorPosition: () => number; setCursorPosition: (position: number) => void } | null>
}

export default function SearchReplaceModal({
  isOpen,
  onClose,
  htmlContent,
  onReplace,
  editorRef
}: SearchReplaceModalProps) {
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [matches, setMatches] = useState<Array<{ start: number; end: number }>>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // モーダルが開いた時に検索入力欄にフォーカス、位置をリセット
  useEffect(() => {
    if (isOpen && mounted) {
      // 位置を中央にリセット
      setPosition({ x: 0, y: 0 })
      if (searchInputRef.current) {
        searchInputRef.current.focus()
        searchInputRef.current.select()
      }
    }
  }, [isOpen, mounted])

  // ドラッグ開始
  const handleDragStart = (e: React.MouseEvent) => {
    if (modalRef.current && e.button === 0) { // 左クリックのみ
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
      const rect = modalRef.current.getBoundingClientRect()
      // モーダルの中心位置を計算
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      // 現在のpositionを考慮した実際の中心位置
      const currentCenterX = window.innerWidth / 2 + position.x
      const currentCenterY = window.innerHeight / 2 + position.y
      // マウス位置から現在の中心位置を引いた差分を保存
      setDragStart({
        x: e.clientX - currentCenterX,
        y: e.clientY - currentCenterY
      })
    }
  }

  // ドラッグ中
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!modalRef.current) return
      
      e.preventDefault()
      const rect = modalRef.current.getBoundingClientRect()
      // マウス位置からドラッグ開始時の差分を引いて、モーダルの中心の新しい位置を計算
      const newCenterX = e.clientX - dragStart.x
      const newCenterY = e.clientY - dragStart.y
      
      // 画面の中心からのオフセットを計算
      const offsetX = newCenterX - window.innerWidth / 2
      const offsetY = newCenterY - window.innerHeight / 2
      
      // 画面内に収まるように制限（モーダルの中心が画面内にあるように）
      const halfWidth = rect.width / 2
      const halfHeight = rect.height / 2
      const maxOffsetX = window.innerWidth / 2 - halfWidth
      const maxOffsetY = window.innerHeight / 2 - halfHeight
      const minOffsetX = -maxOffsetX
      const minOffsetY = -maxOffsetY
      
      setPosition({
        x: Math.max(minOffsetX, Math.min(offsetX, maxOffsetX)),
        y: Math.max(minOffsetY, Math.min(offsetY, maxOffsetY))
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])

  // 検索を実行
  useEffect(() => {
    if (!isOpen || !searchText.trim()) {
      setMatches([])
      setMatchCount(0)
      setCurrentMatchIndex(0)
      return
    }

    const text = htmlContent
    const flags = caseSensitive ? 'g' : 'gi'
    const regex = new RegExp(escapeRegExp(searchText), flags)
    const foundMatches: Array<{ start: number; end: number }> = []
    
    let match
    while ((match = regex.exec(text)) !== null) {
      foundMatches.push({
        start: match.index,
        end: match.index + match[0].length
      })
    }

    setMatches(foundMatches)
    setMatchCount(foundMatches.length)
    setCurrentMatchIndex(foundMatches.length > 0 ? 1 : 0)
  }, [searchText, caseSensitive, htmlContent, isOpen])

  // 正規表現の特殊文字をエスケープ
  function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // 次の検索結果へ移動
  const goToNext = () => {
    if (matches.length === 0) return
    
    const nextIndex = currentMatchIndex >= matches.length ? 1 : currentMatchIndex + 1
    setCurrentMatchIndex(nextIndex)
    
    const match = matches[nextIndex - 1]
    if (match && editorRef?.current) {
      editorRef.current.setCursorPosition(match.start)
    }
  }

  // 前の検索結果へ移動
  const goToPrevious = () => {
    if (matches.length === 0) return
    
    const prevIndex = currentMatchIndex <= 1 ? matches.length : currentMatchIndex - 1
    setCurrentMatchIndex(prevIndex)
    
    const match = matches[prevIndex - 1]
    if (match && editorRef?.current) {
      editorRef.current.setCursorPosition(match.start)
    }
  }

  // 単一置換
  const replaceOne = () => {
    if (matches.length === 0 || currentMatchIndex === 0) return

    const match = matches[currentMatchIndex - 1]
    if (!match) return

    const before = htmlContent.substring(0, match.start)
    const after = htmlContent.substring(match.end)
    const newContent = before + replaceText + after

    onReplace(newContent)

    // 置換後、次の検索結果へ移動
    setTimeout(() => {
      if (matches.length > 1) {
        goToNext()
      } else {
        setSearchText('')
      }
    }, 0)
  }

  // すべて置換
  const replaceAll = () => {
    if (matches.length === 0) return

    if (!confirm(`${matches.length}件の一致をすべて置換しますか？`)) {
      return
    }

    const flags = caseSensitive ? 'g' : 'gi'
    const regex = new RegExp(escapeRegExp(searchText), flags)
    const newContent = htmlContent.replace(regex, replaceText)

    onReplace(newContent)
    setSearchText('')
    setMatches([])
    setMatchCount(0)
    setCurrentMatchIndex(0)
  }

  // キーボードショートカット
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        goToPrevious()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        goToNext()
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault()
        replaceOne()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, matches, currentMatchIndex])

  if (!isOpen || !mounted) return null

  if (typeof document === 'undefined' || !document.body) {
    return null
  }

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        ref={modalRef}
        className={styles.modal} 
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: position.x !== 0 || position.y !== 0 ? `translate(${position.x}px, ${position.y}px)` : undefined,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
      >
        <div 
          className={styles.header}
          onMouseDown={handleDragStart}
          style={{ cursor: 'grab' }}
        >
          <h3>🔍 検索・置換</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          <div className={styles.searchSection}>
            <label className={styles.label}>
              <span>検索:</span>
              <input
                ref={searchInputRef}
                type="text"
                className={styles.input}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="検索するテキストを入力..."
              />
            </label>
            <div className={styles.searchActions}>
              <button
                className={styles.btn}
                onClick={goToPrevious}
                disabled={matches.length === 0}
                title="前へ (Shift+Enter)"
              >
                ↑ 前へ
              </button>
              <button
                className={styles.btn}
                onClick={goToNext}
                disabled={matches.length === 0}
                title="次へ (Enter)"
              >
                次へ ↓
              </button>
              {matchCount > 0 && (
                <span className={styles.matchInfo}>
                  {currentMatchIndex} / {matchCount}
                </span>
              )}
            </div>
          </div>

          <div className={styles.replaceSection}>
            <label className={styles.label}>
              <span>置換:</span>
              <input
                ref={replaceInputRef}
                type="text"
                className={styles.input}
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="置換するテキストを入力..."
              />
            </label>
            <div className={styles.replaceActions}>
              <button
                className={styles.btn}
                onClick={replaceOne}
                disabled={matches.length === 0 || currentMatchIndex === 0}
                title="置換 (Ctrl+Enter)"
              >
                置換
              </button>
              <button
                className={`${styles.btn} ${styles.replaceAllBtn}`}
                onClick={replaceAll}
                disabled={matches.length === 0}
                title="すべて置換"
              >
                すべて置換 ({matchCount})
              </button>
            </div>
          </div>

          <div className={styles.options}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
              />
              <span>大文字小文字を区別</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

