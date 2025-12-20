'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styles from './TutorialModal.module.css'
import { TUTORIAL_STEPS } from '@/lib/tutorialSteps'
import type { TutorialStep } from '@/types'

interface TutorialModalProps {
  isOpen: boolean
  currentStep: number
  onClose: () => void
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
  onComplete: () => void
}

interface HighlightInfo {
  element: HTMLElement
  rect: DOMRect
}

export default function TutorialModal({
  isOpen,
  currentStep,
  onClose,
  onNext,
  onPrevious,
  onSkip,
  onComplete
}: TutorialModalProps) {
  const [highlightInfo, setHighlightInfo] = useState<HighlightInfo | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null)
  const [isWaitingForAction, setIsWaitingForAction] = useState(false)
  const highlightRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const step = TUTORIAL_STEPS[currentStep]
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100

  // 説明ボックスの位置を計算
  const calculateTooltipPosition = useCallback((rect: DOMRect, position: 'top' | 'bottom' | 'left' | 'right' | 'center') => {
    const padding = 20
    // プログレスバーの実際の高さを計算（bottom: 20px + padding 12px * 2 + コンテンツ高さ）
    const progressBarActualHeight = 70 // プログレスバーの実際の高さ
    const progressBarBottom = 20 // プログレスバーのbottom位置
    const tooltipEstimatedHeight = 280 // 説明ボックスの推定高さ（余裕を持たせる）
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    // プログレスバーの上端位置
    const progressBarTop = viewportHeight - progressBarBottom - progressBarActualHeight
    let top = 0
    let left = 0

    switch (position) {
      case 'top':
        // 上部に配置する場合、説明ボックスの高さを考慮
        top = rect.top - padding - tooltipEstimatedHeight
        // 画面外に出る場合は、要素の下に配置
        if (top < padding) {
          top = rect.bottom + padding
          // プログレスバーと重ならないように調整
          const maxTopForBottom = progressBarTop - tooltipEstimatedHeight - padding
          if (top > maxTopForBottom) {
            top = Math.max(padding, maxTopForBottom)
          }
        }
        left = rect.left + rect.width / 2
        break
      case 'bottom':
        // 下部に配置する場合、プログレスバーと説明ボックスの高さを考慮
        top = rect.bottom + padding
        // 説明ボックスがプログレスバーの上端より下に出ないようにする
        const maxTopForBottom = progressBarTop - tooltipEstimatedHeight - padding
        if (top > maxTopForBottom) {
          // 要素の上に配置を試みる
          top = rect.top - padding - tooltipEstimatedHeight
          // それでも画面外に出る場合は、プログレスバーの上に安全に配置
          if (top < padding) {
            top = progressBarTop - tooltipEstimatedHeight - padding
            // それでも画面外の場合は、画面内に収まる位置に固定
            if (top < padding) {
              top = padding
            }
          }
        }
        // 最終チェック: プログレスバーと重ならないことを確認
        if (top + tooltipEstimatedHeight > progressBarTop - padding) {
          top = Math.max(padding, progressBarTop - tooltipEstimatedHeight - padding)
        }
        left = rect.left + rect.width / 2
        break
      case 'left':
        top = rect.top + rect.height / 2
        left = rect.left - padding
        break
      case 'right':
        top = rect.top + rect.height / 2
        left = rect.right + padding
        break
      case 'center':
        top = viewportHeight / 2 - tooltipEstimatedHeight / 2
        left = viewportWidth / 2
        break
    }

    // 左右の画面外チェック
    if (left < padding) {
      left = padding
    } else if (left > viewportWidth - 300) { // 最小幅300pxを想定
      left = viewportWidth - 320 // 少し余白を持たせる
    }

    // モバイルでは下部固定（プログレスバーの上）
    if (viewportWidth <= 768) {
      top = progressBarTop - tooltipEstimatedHeight - padding
      left = viewportWidth / 2
    }

    // 最終的な位置が画面内に収まり、プログレスバーと重ならないことを確認
    if (top < padding) {
      top = padding
    }
    // プログレスバーとの重なりをチェック
    if (top + tooltipEstimatedHeight > progressBarTop - padding) {
      top = Math.max(padding, progressBarTop - tooltipEstimatedHeight - padding)
    }

    setTooltipPosition({ top, left })
  }, [])

  // 要素を検索してハイライト情報を更新
  const updateHighlight = useCallback(() => {
    if (!step?.highlightElement) {
      setHighlightInfo(null)
      // ハイライト要素がない場合は画面中央に表示
      setTooltipPosition({ 
        top: window.innerHeight / 2, 
        left: window.innerWidth / 2 
      })
      return
    }

    // 要素を検索（複数の方法を試す）
    let element: HTMLElement | null = null
    
    try {
      element = document.querySelector(step.highlightElement) as HTMLElement
      
      // 見つからない場合は、属性セレクタで再試行
      if (!element && step.highlightElement.includes('[')) {
        try {
          element = document.querySelector(step.highlightElement) as HTMLElement
        } catch (e) {
          // 無視
        }
      }
    } catch (e) {
      console.warn('要素の検索に失敗しました:', e)
    }
    
    if (!element) {
      setHighlightInfo(null)
      // 要素が見つからない場合も画面中央に表示
      setTooltipPosition({ 
        top: window.innerHeight / 2, 
        left: window.innerWidth / 2 
      })
      return
    }

    const rect = element.getBoundingClientRect()
    
    // 前の要素のスタイルを復元（現在はz-indexを設定しないため、不要）
    
    // 要素はそのまま表示（z-indexを設定しない）
    // オーバーレイの背後にある要素は、ハイライトオーバーレイで囲まれるため
    // z-indexを設定する必要はない
    
    setHighlightInfo({ element, rect })

    // 説明ボックスの位置を計算
    calculateTooltipPosition(rect, step.highlightPosition || 'bottom')
  }, [step, calculateTooltipPosition])


  // ステップ変更時にハイライトを更新
  useEffect(() => {
    if (isOpen && step) {
      // 少し遅延してから検索（DOM更新を待つ）
      const timer = setTimeout(() => {
        updateHighlight()
      }, 100)

      // スクロールやリサイズ時に再計算
      const handleResize = () => {
        updateHighlight()
      }
      const handleScroll = () => {
        updateHighlight()
      }

      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll, true)

      return () => {
        clearTimeout(timer)
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [isOpen, currentStep, step, updateHighlight])

  // アクション待ちの処理
  useEffect(() => {
    if (!step?.action || step.action === 'none' || !step.actionTarget) {
      setIsWaitingForAction(false)
      return
    }

    setIsWaitingForAction(true)
    const targetElement = document.querySelector(step.actionTarget)
    
    if (!targetElement) {
      setIsWaitingForAction(false)
      return
    }

    const handleAction = (e: Event) => {
      e.stopPropagation()
      setIsWaitingForAction(false)
      // アクション完了後、少し遅延して次へ
      setTimeout(() => {
        if (isLastStep) {
          onComplete()
        } else {
          onNext()
        }
      }, 300)
    }

    if (step.action === 'click') {
      targetElement.addEventListener('click', handleAction, { once: true })
      return () => {
        targetElement.removeEventListener('click', handleAction)
      }
    } else if (step.action === 'input') {
      const handleInput = (e: Event) => {
        const input = e.target as HTMLInputElement | HTMLTextAreaElement
        if (input.value.trim() !== '') {
          handleAction(e)
        }
      }
      targetElement.addEventListener('input', handleInput, { once: true })
      return () => {
        targetElement.removeEventListener('input', handleInput)
      }
    }
  }, [step, isLastStep, onNext, onComplete])

  // キーボード操作
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && !isWaitingForAction) {
        if (isLastStep) {
          onComplete()
        } else {
          onNext()
        }
      } else if (e.key === 'ArrowRight' && !isWaitingForAction && !isLastStep) {
        onNext()
      } else if (e.key === 'ArrowLeft' && !isWaitingForAction && currentStep > 0) {
        onPrevious()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isLastStep, isWaitingForAction, currentStep, onClose, onNext, onPrevious, onComplete])

  // オーバーレイクリックで閉じるのを防止
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    // 説明ボックス以外をクリックしても閉じない
    e.stopPropagation()
  }, [])

  if (!isOpen || !step) {
    return null
  }

  // document.bodyが存在しない場合はレンダリングしない
  if (typeof document === 'undefined' || !document.body) {
    return null
  }

  const tooltipClassName = step.highlightPosition
    ? styles[`tooltip${step.highlightPosition.charAt(0).toUpperCase() + step.highlightPosition.slice(1)}`] || styles.tooltipBottom
    : styles.tooltipCenter

  const modalContent = (
    <div 
      className={styles.overlay} 
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-content"
    >
      {/* ハイライトオーバーレイ */}
      {highlightInfo && (
        <div
          ref={highlightRef}
          className={styles.highlightOverlay}
          style={{
            top: `${highlightInfo.rect.top + window.scrollY}px`,
            left: `${highlightInfo.rect.left + window.scrollX}px`,
            width: `${highlightInfo.rect.width}px`,
            height: `${highlightInfo.rect.height}px`
          }}
          aria-hidden="true"
        />
      )}

      {/* 説明ボックス */}
      {tooltipPosition && (
        <div
          ref={tooltipRef}
          className={`${styles.tooltip} ${tooltipClassName}`}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="tutorial-title" className={styles.title}>{step.title}</h3>
          <div 
            id="tutorial-content" 
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: step.content }}
          />
          
          {isWaitingForAction && (
            <div className={styles.content} style={{ color: 'var(--accent-color)', fontWeight: 500 }}>
              {step.action === 'click' ? 'ボタンをクリックしてください' : '入力してください'}
            </div>
          )}

          <div className={styles.navigation}>
            <div className={styles.buttonGroup}>
              <button
                className={`${styles.button} ${styles.prevButton}`}
                onClick={onPrevious}
                disabled={currentStep === 0}
                aria-label="前のステップへ"
              >
                戻る
              </button>
              {isLastStep ? (
                <button
                  className={`${styles.button} ${styles.completeButton}`}
                  onClick={onComplete}
                  disabled={isWaitingForAction}
                  aria-label="チュートリアルを完了"
                >
                  完了
                </button>
              ) : (
                <button
                  className={`${styles.button} ${styles.nextButton}`}
                  onClick={onNext}
                  disabled={isWaitingForAction}
                  aria-label="次のステップへ"
                >
                  次へ
                </button>
              )}
            </div>
            {step.skipable && (
              <button
                className={styles.skipButton}
                onClick={onSkip}
                aria-label="チュートリアルをスキップ"
              >
                スキップ
              </button>
            )}
          </div>
        </div>
      )}

      {/* プログレスバー */}
      <div className={styles.progressBar}>
        <span className={styles.progressText}>
          ステップ {currentStep + 1} / {TUTORIAL_STEPS.length}
        </span>
        <div className={styles.progressBarInner}>
          <div 
            className={styles.progressBarFill}
            style={{ width: `${progress}%` }}
            aria-valuenow={currentStep + 1}
            aria-valuemin={1}
            aria-valuemax={TUTORIAL_STEPS.length}
            role="progressbar"
          />
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

