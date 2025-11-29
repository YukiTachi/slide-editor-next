import { useState, useRef, useCallback, useEffect } from 'react'

interface HistoryState {
  content: string
  timestamp: number
}

const MAX_HISTORY_SIZE = 50 // 履歴の最大保持数

export function useHistory(initialContent: string) {
  const [history, setHistory] = useState<HistoryState[]>([
    { content: initialContent, timestamp: Date.now() }
  ])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isUndoable, setIsUndoable] = useState(false)
  const [isRedoable, setIsRedoable] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastContentRef = useRef<string>(initialContent)

  // アンドゥ/リドゥ可能かどうかを更新
  useEffect(() => {
    setIsUndoable(currentIndex > 0)
    setIsRedoable(currentIndex < history.length - 1)
  }, [currentIndex, history.length])

  // 履歴に追加（debounce付き）
  const addToHistory = useCallback((content: string) => {
    // 前回の内容と同じ場合は履歴に追加しない
    if (content === lastContentRef.current) {
      return
    }

    // 既存のdebounceタイマーをクリア
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 500ms後に履歴に追加（連続した変更を1つの履歴として扱う）
    debounceTimerRef.current = setTimeout(() => {
      setHistory(prevHistory => {
        // 現在位置より後ろの履歴を削除（新しい履歴を追加するため）
        const newHistory = prevHistory.slice(0, currentIndex + 1)
        
        // 新しい履歴を追加
        const newState: HistoryState = {
          content,
          timestamp: Date.now()
        }
        
        const updatedHistory = [...newHistory, newState]
        
        // 履歴数が上限を超えた場合、古い履歴を削除
        if (updatedHistory.length > MAX_HISTORY_SIZE) {
          return updatedHistory.slice(-MAX_HISTORY_SIZE)
        }
        
        return updatedHistory
      })
      
      setCurrentIndex(prevIndex => {
        const newIndex = Math.min(prevIndex + 1, MAX_HISTORY_SIZE - 1)
        return newIndex
      })
      
      lastContentRef.current = content
    }, 500)
  }, [currentIndex])

  // アンドゥ（元に戻す）
  const undo = useCallback((): string | null => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      const previousContent = history[newIndex].content
      lastContentRef.current = previousContent
      return previousContent
    }
    return null
  }, [currentIndex, history])

  // リドゥ（やり直す）
  const redo = useCallback((): string | null => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      const nextContent = history[newIndex].content
      lastContentRef.current = nextContent
      return nextContent
    }
    return null
  }, [currentIndex, history])

  // 履歴をリセット（新しいコンテンツで初期化）
  const resetHistory = useCallback((content: string) => {
    setHistory([{ content, timestamp: Date.now() }])
    setCurrentIndex(0)
    lastContentRef.current = content
  }, [])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    addToHistory,
    undo,
    redo,
    isUndoable,
    isRedoable,
    resetHistory
  }
}

