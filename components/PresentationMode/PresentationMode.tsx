'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { usePresentationMode } from '@/hooks/usePresentationMode'
import { processSlideForPresentation } from '@/lib/presentationUtils'
import { useSlideSize } from '@/hooks/useSlideSize'
import type { SlideSizeConfig } from '@/types'
import styles from './PresentationMode.module.css'

interface PresentationModeProps {
  htmlContent: string
  isOpen: boolean
  onClose: () => void
  startSlide?: number
  onReady?: (startFullscreen: () => Promise<void>) => void
}

// スライドサイズをピクセルに変換
function getSlideDimensionsInPx(sizeConfig: SlideSizeConfig): { width: number; height: number } {
  if (sizeConfig.type === '16-9') {
    return { width: 1920, height: 1080 }
  }
  // A4横向き: 297mm x 210mm → px変換 (96dpi基準: 1mm = 3.7795px)
  return { width: 1122, height: 794 }
}

export default function PresentationMode({
  htmlContent,
  isOpen,
  onClose,
  startSlide = 0,
  onReady
}: PresentationModeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [slideHTML, setSlideHTML] = useState<string>('')
  const { sizeConfig, sizeType } = useSlideSize()
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })

  // 画面サイズを監視
  useEffect(() => {
    if (!isOpen) return

    const updateScreenSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    // 初期サイズを設定
    updateScreenSize()

    // リサイズイベントを監視
    window.addEventListener('resize', updateScreenSize)
    // フルスクリーン変更も監視
    document.addEventListener('fullscreenchange', updateScreenSize)

    return () => {
      window.removeEventListener('resize', updateScreenSize)
      document.removeEventListener('fullscreenchange', updateScreenSize)
    }
  }, [isOpen])

  // スライドのスケールとスタイルを計算
  const slideStyle = useMemo(() => {
    if (screenSize.width === 0 || screenSize.height === 0) {
      return { width: 0, height: 0, scale: 1 }
    }

    const slideDimensions = getSlideDimensionsInPx(sizeConfig)
    const padding = 40 // 上下左右の余白

    const availableWidth = screenSize.width - padding
    const availableHeight = screenSize.height - padding

    // アスペクト比を保ちながら画面に収まるスケールを計算
    const scaleX = availableWidth / slideDimensions.width
    const scaleY = availableHeight / slideDimensions.height
    const scale = Math.min(scaleX, scaleY)

    return {
      width: slideDimensions.width,
      height: slideDimensions.height,
      scale
    }
  }, [screenSize, sizeConfig])

  const {
    state,
    containerRef,
    currentSlideHTML,
    goToNextSlide,
    goToPreviousSlide,
    handleClick,
    handleContextMenu,
    endPresentation,
    startPresentation,
    isTransitioning,
    config
  } = usePresentationMode({
    htmlContent,
    isActive: isOpen,
    onClose,
    config: { startSlide }
  })

  // スライドHTMLの処理
  useEffect(() => {
    if (!isOpen || !currentSlideHTML) {
      setSlideHTML('')
      return
    }

    processSlideForPresentation(currentSlideHTML, sizeConfig).then((processedHTML) => {
      setSlideHTML(processedHTML)
    }).catch((error) => {
      console.error('スライド処理エラー:', error)
      setSlideHTML('')
    })
  }, [isOpen, currentSlideHTML, sizeConfig, sizeType])

  // iframeにスライドを表示
  useEffect(() => {
    if (!iframeRef.current || !slideHTML) return

    const iframe = iframeRef.current
    const doc = iframe.contentDocument || iframe.contentWindow?.document

    if (!doc) return

    doc.open()
    doc.write(slideHTML)
    doc.close()
  }, [slideHTML])

  // フルスクリーン開始関数を定義
  const startFullscreenFunc = useCallback(async () => {
    if (!containerRef.current || !containerRef.current.isConnected) {
      throw new Error('要素がまだDOMに接続されていません')
    }

    const { isFullscreen, enterFullscreen } = await import('@/lib/presentationUtils')
    
    // 既にフルスクリーンになっている場合はスキップ
    if (isFullscreen()) {
      return
    }

    await enterFullscreen(containerRef.current)
  }, [])

  // コンポーネントが準備できたことを親に通知
  useEffect(() => {
    if (isOpen && onReady && containerRef.current && containerRef.current.isConnected) {
      onReady(startFullscreenFunc)
    }
  }, [isOpen, onReady, startFullscreenFunc])

  // コンポーネントがマウントされた後にフルスクリーンを開始
  useEffect(() => {
    if (!isOpen) return

    const startFullscreen = async () => {
      if (!containerRef.current || !containerRef.current.isConnected) {
        setTimeout(startFullscreen, 50)
        return
      }

      try {
        await startFullscreenFunc()
      } catch (error: any) {
        // ユーザージェスチャー関連のエラーは警告レベルに下げる
        const errorMessage = error?.message || String(error)
        if (
          errorMessage.includes('user gesture') ||
          errorMessage.includes('Permissions check failed') ||
          errorMessage.includes('not allowed')
        ) {
          // ユーザージェスチャー関連のエラーは警告として記録（再試行される）
          // 既にフルスクリーンになっている場合は再試行しない
          const { isFullscreen } = await import('@/lib/presentationUtils')
          if (!isFullscreen()) {
            setTimeout(startFullscreen, 200)
          }
        } else {
          // その他のエラーは通常通りエラーとして記録
          console.error('フルスクリーン開始に失敗:', error)
          setTimeout(startFullscreen, 200)
        }
      }
    }

    // 要素がレンダリングされた後、少し遅延してから実行
    // 最初の試行は即座に実行（ユーザーのクリックイベントのコンテキストに近い）
    setTimeout(startFullscreen, 0)
  }, [isOpen, startFullscreenFunc])

  if (!isOpen) {
    return null
  }

  // サーバー側レンダリングの場合はnullを返す
  if (typeof document === 'undefined' || !document.body) {
    return null
  }

  const transitionClass = isTransitioning ? styles.transitioning : ''
  const transitionType = config.transition === 'fade' ? styles.fade : 
                        config.transition === 'slide' ? styles.slide : ''

  const presentationContent = (
    <div
      ref={containerRef}
      className={`${styles.presentationContainer} ${transitionClass} ${transitionType}`}
      style={{ backgroundColor: config.backgroundColor }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <div className={styles.slideWrapper}>
        <iframe
          ref={iframeRef}
          className={styles.slideFrame}
          title={`スライド ${state.currentSlide + 1}`}
          style={{
            width: `${slideStyle.width}px`,
            height: `${slideStyle.height}px`,
            transform: `scale(${slideStyle.scale})`,
          }}
        />
      </div>

      {config.showProgress && (
        <div className={styles.progress}>
          <span className={styles.slideNumber}>
            {state.currentSlide + 1} / {state.totalSlides}
          </span>
        </div>
      )}

      {config.showControls && (
        <div className={styles.controls}>
          <button
            className={styles.controlButton}
            onClick={(e) => {
              e.stopPropagation()
              goToPreviousSlide()
            }}
            disabled={state.currentSlide === 0}
            aria-label="前のスライド"
          >
            ←
          </button>
          <button
            className={styles.controlButton}
            onClick={(e) => {
              e.stopPropagation()
              goToNextSlide()
            }}
            disabled={state.currentSlide === state.totalSlides - 1}
            aria-label="次のスライド"
          >
            →
          </button>
          <button
            className={styles.controlButton}
            onClick={(e) => {
              e.stopPropagation()
              endPresentation()
            }}
            aria-label="終了"
          >
            ✕
          </button>
        </div>
      )}

      {/* キーボードショートカットのヒント（非表示、アクセシビリティ用） */}
      <div className={styles.srOnly} aria-live="polite">
        スライド {state.currentSlide + 1} / {state.totalSlides}
      </div>
    </div>
  )

  // Portalを使用してdocument.bodyに直接レンダリング
  return createPortal(presentationContent, document.body)
}

