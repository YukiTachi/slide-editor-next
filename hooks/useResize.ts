import { useState, useRef, useEffect, useCallback } from 'react'

export function useResize() {
  const [isResizing, setIsResizing] = useState(false)
  const [editorWidth, setEditorWidth] = useState(50) // パーセンテージ
  const startXRef = useRef<number>(0)
  const startWidthRef = useRef<number>(0)
  const editorPanelRef = useRef<HTMLDivElement | null>(null)

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    
    if (editorPanelRef.current) {
      startWidthRef.current = editorPanelRef.current.offsetWidth
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const doResize = (e: MouseEvent) => {
      if (!editorPanelRef.current) return

      const container = editorPanelRef.current.parentElement
      if (!container) return

      const containerWidth = container.offsetWidth
      const deltaX = e.clientX - startXRef.current
      const newWidth = startWidthRef.current + deltaX
      const minWidth = 300
      const maxWidth = containerWidth - 300

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        const percentage = (newWidth / containerWidth) * 100
        setEditorWidth(percentage)
      }
    }

    const stopResize = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', doResize)
    document.addEventListener('mouseup', stopResize)

    return () => {
      document.removeEventListener('mousemove', doResize)
      document.removeEventListener('mouseup', stopResize)
    }
  }, [isResizing])

  return {
    isResizing,
    editorWidth,
    startResize,
    editorPanelRef
  }
}

