import { useEffect, useRef } from 'react'

const AUTO_SAVE_KEY = 'slideEditor_autoSave'
const TIMESTAMP_KEY = 'slideEditor_lastSaved'
const SAVE_INTERVAL = 30000 // 30秒

export function useAutoSave(htmlContent: string, defaultHTML: string) {
  const lastContentRef = useRef<string>('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 自動保存を開始
    intervalRef.current = setInterval(() => {
      const currentContent = htmlContent
      
      // 内容が変更されている場合のみ保存
      if (currentContent !== lastContentRef.current && currentContent.trim() !== '') {
        try {
          localStorage.setItem(AUTO_SAVE_KEY, currentContent)
          localStorage.setItem(TIMESTAMP_KEY, new Date().toISOString())
          lastContentRef.current = currentContent
        } catch (error) {
          console.error('自動保存エラー:', error)
        }
      }
    }, SAVE_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [htmlContent])

  // 復元機能
  const restore = (): string | null => {
    const savedContent = localStorage.getItem(AUTO_SAVE_KEY)
    const savedTimestamp = localStorage.getItem(TIMESTAMP_KEY)
    
    if (savedContent) {
      const saveTime = savedTimestamp ? new Date(savedTimestamp).toLocaleString() : '不明'
      const message = `保存された内容を復元します。\n最終保存: ${saveTime}\n\n現在の内容は失われます。続行しますか？`
      
      if (confirm(message)) {
        lastContentRef.current = savedContent
        return savedContent
      }
    } else {
      alert('復元できる内容がありません。')
    }
    
    return null
  }

  // 初期復元確認
  const checkForRestore = (currentContent: string, defaultContent: string): string | null => {
    const savedContent = localStorage.getItem(AUTO_SAVE_KEY)
    const savedTimestamp = localStorage.getItem(TIMESTAMP_KEY)
    
    if (savedContent && savedContent.trim() !== '') {
      // 現在の内容がデフォルトと同じで、保存されたコンテンツがある場合
      if (currentContent === defaultContent && savedContent !== defaultContent) {
        const saveTime = savedTimestamp ? new Date(savedTimestamp).toLocaleString() : '不明'
        const message = `前回の編集内容が見つかりました。\n最終保存: ${saveTime}\n\n復元しますか？`
        
        if (confirm(message)) {
          lastContentRef.current = savedContent
          return savedContent
        }
      }
    }
    
    return null
  }

  // 未保存の変更があるかチェック
  const hasUnsavedChanges = (): boolean => {
    const savedContent = localStorage.getItem(AUTO_SAVE_KEY) || ''
    return htmlContent !== savedContent
  }

  return {
    restore,
    checkForRestore,
    hasUnsavedChanges
  }
}


