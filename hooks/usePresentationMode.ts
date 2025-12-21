import { useState, useEffect, useCallback, useRef } from 'react'
import { extractSlides } from '@/lib/slideReorder'
import { enterFullscreen, exitFullscreen, isFullscreen } from '@/lib/presentationUtils'
import type { PresentationConfig, PresentationState } from '@/types'

interface UsePresentationModeProps {
  htmlContent: string
  isActive: boolean
  onClose: () => void
  config?: Partial<PresentationConfig>
}

const defaultConfig: PresentationConfig = {
  startSlide: 0,
  showProgress: true,
  showControls: false,
  transition: 'fade',
  backgroundColor: '#000000'
}

export function usePresentationMode({
  htmlContent,
  isActive,
  onClose,
  config = {}
}: UsePresentationModeProps) {
  const presentationConfig = { ...defaultConfig, ...config }
  const containerRef = useRef<HTMLDivElement>(null)
  
  const slides = extractSlides(htmlContent)
  const totalSlides = slides.length

  const [currentSlide, setCurrentSlide] = useState(presentationConfig.startSlide)
  const [isFullscreenState, setIsFullscreenState] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // フルスクリーン状態の監視
  useEffect(() => {
    if (!isActive) return

    const handleFullscreenChange = () => {
      setIsFullscreenState(isFullscreen())
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [isActive])

  // フルスクリーンに切り替え（コンポーネント側で呼び出す）
  const startPresentation = useCallback(async () => {
    if (!containerRef.current || !isActive) return

    // 要素がDOMに接続されているか確認
    if (!containerRef.current.isConnected) {
      return false // まだ接続されていない
    }

    try {
      await enterFullscreen(containerRef.current)
      setIsFullscreenState(true)
      return true
    } catch (error) {
      console.error('フルスクリーン開始に失敗:', error)
      return false
    }
  }, [isActive])

  // フルスクリーン終了
  const endPresentation = useCallback(async () => {
    try {
      if (isFullscreen()) {
        await exitFullscreen()
      }
      setIsFullscreenState(false)
      onClose()
    } catch (error) {
      console.error('フルスクリーン終了に失敗:', error)
      onClose()
    }
  }, [onClose])

  // スライド移動
  const goToSlide = useCallback((index: number) => {
    if (index < 0 || index >= totalSlides) return
    
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentSlide(index)
      setIsTransitioning(false)
    }, 150) // トランジション時間
  }, [totalSlides])

  const goToNextSlide = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      goToSlide(currentSlide + 1)
    }
  }, [currentSlide, totalSlides, goToSlide])

  const goToPreviousSlide = useCallback(() => {
    if (currentSlide > 0) {
      goToSlide(currentSlide - 1)
    }
  }, [currentSlide, goToSlide])

  const goToFirstSlide = useCallback(() => {
    goToSlide(0)
  }, [goToSlide])

  const goToLastSlide = useCallback(() => {
    goToSlide(totalSlides - 1)
  }, [totalSlides, goToSlide])

  // キーボードイベントハンドラー
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          e.preventDefault()
          goToNextSlide()
          break
        case 'ArrowLeft':
        case 'Backspace':
        case 'PageUp':
          e.preventDefault()
          goToPreviousSlide()
          break
        case 'Home':
          e.preventDefault()
          goToFirstSlide()
          break
        case 'End':
          e.preventDefault()
          goToLastSlide()
          break
        case 'Escape':
          e.preventDefault()
          endPresentation()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, goToNextSlide, goToPreviousSlide, goToFirstSlide, goToLastSlide, endPresentation])

  // マウスイベントハンドラー（クリックで次へ）
  const handleClick = useCallback((e: React.MouseEvent | MouseEvent) => {
    // 左クリックで次へ
    if ('button' in e && e.button === 0) {
      goToNextSlide()
    }
  }, [goToNextSlide])

  // 右クリックで前へ
  const handleContextMenu = useCallback((e: React.MouseEvent | MouseEvent) => {
    e.preventDefault()
    goToPreviousSlide()
  }, [goToPreviousSlide])

  // フルスクリーン開始関数をエクスポート（コンポーネント側で呼び出す）
  // フック内での自動開始は削除し、コンポーネント側で制御する

  // フルスクリーンが終了したらプレゼンテーションモードも終了
  useEffect(() => {
    if (isActive && !isFullscreenState) {
      // フルスクリーンが終了した場合、少し遅延してからモードを終了
      const timer = setTimeout(() => {
        onClose()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isActive, isFullscreenState, onClose])

  const state: PresentationState = {
    isActive,
    currentSlide,
    totalSlides,
    isFullscreen: isFullscreenState
  }

  return {
    state,
    containerRef,
    currentSlideHTML: slides[currentSlide]?.html || '',
    goToSlide,
    goToNextSlide,
    goToPreviousSlide,
    goToFirstSlide,
    goToLastSlide,
    handleClick,
    handleContextMenu,
    endPresentation,
    startPresentation,
    isTransitioning,
    config: presentationConfig
  }
}

