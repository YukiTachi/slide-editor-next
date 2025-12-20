import { useState, useEffect, useCallback } from 'react'
import { 
  getTutorialState, 
  saveTutorialState, 
  shouldShowTutorial, 
  markTutorialCompleted, 
  markTutorialSkipped, 
  updateCurrentStep,
  resetTutorial 
} from '@/lib/tutorialStorage'
import { TUTORIAL_STEPS } from '@/lib/tutorialSteps'
import type { TutorialState } from '@/types'

export function useTutorial() {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [shouldShow, setShouldShow] = useState(false)

  // 初期化時に表示すべきかどうかをチェック
  useEffect(() => {
    // URLパラメータでチュートリアルを強制表示
    const urlParams = new URLSearchParams(window.location.search)
    const forceTutorial = urlParams.get('tutorial') === 'true'
    
    if (forceTutorial) {
      setShouldShow(true)
      setIsTutorialOpen(true)
      return
    }
    
    const state = getTutorialState()
    setShouldShow(shouldShowTutorial())
    setCurrentStep(state.currentStep)
  }, [])

  // チュートリアルを開く
  const openTutorial = useCallback(() => {
    const state = getTutorialState()
    setCurrentStep(state.currentStep)
    setIsTutorialOpen(true)
  }, [])

  // チュートリアルを閉じる
  const closeTutorial = useCallback(() => {
    setIsTutorialOpen(false)
  }, [])

  // 次のステップへ
  const nextStep = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      const newStep = currentStep + 1
      setCurrentStep(newStep)
      updateCurrentStep(newStep)
    } else {
      // 最後のステップの場合は完了
      completeTutorial()
    }
  }, [currentStep])

  // 前のステップへ
  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1
      setCurrentStep(newStep)
      updateCurrentStep(newStep)
    }
  }, [currentStep])

  // 特定のステップへ移動
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < TUTORIAL_STEPS.length) {
      setCurrentStep(step)
      updateCurrentStep(step)
    }
  }, [])

  // チュートリアルをスキップ
  const skipTutorial = useCallback(() => {
    markTutorialSkipped()
    setIsTutorialOpen(false)
    setShouldShow(false)
  }, [])

  // チュートリアルを完了
  const completeTutorial = useCallback(() => {
    markTutorialCompleted()
    setIsTutorialOpen(false)
    setShouldShow(false)
  }, [])

  // チュートリアルをリセット（再表示用）
  const reset = useCallback(() => {
    resetTutorial()
    setCurrentStep(0)
    setShouldShow(true)
    setIsTutorialOpen(true)
  }, [])

  // 初回訪問時に自動で表示
  useEffect(() => {
    if (shouldShow && !isTutorialOpen) {
      // 少し遅延して表示（ページ読み込み完了後）
      const timer = setTimeout(() => {
        setIsTutorialOpen(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [shouldShow, isTutorialOpen])

  return {
    isTutorialOpen,
    currentStep,
    totalSteps: TUTORIAL_STEPS.length,
    openTutorial,
    closeTutorial,
    nextStep,
    previousStep,
    goToStep,
    skipTutorial,
    completeTutorial,
    reset,
    shouldShowTutorial: shouldShow
  }
}

