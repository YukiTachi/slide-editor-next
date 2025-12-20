// チュートリアル状態管理ユーティリティ

import type { TutorialState } from '@/types'

const TUTORIAL_STATE_KEY = 'slideEditor_tutorialState'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

/**
 * デフォルトのチュートリアル状態を返す
 */
function getDefaultState(): TutorialState {
  return {
    completed: false,
    skipped: false,
    currentStep: 0,
    completedSteps: []
  }
}

/**
 * 保存されたチュートリアル状態を取得
 */
export function getTutorialState(): TutorialState {
  if (!isBrowser()) return getDefaultState()
  
  try {
    const saved = localStorage.getItem(TUTORIAL_STATE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // 基本的な検証
      if (parsed && typeof parsed === 'object') {
        return {
          completed: parsed.completed === true,
          skipped: parsed.skipped === true,
          currentStep: typeof parsed.currentStep === 'number' ? parsed.currentStep : 0,
          completedSteps: Array.isArray(parsed.completedSteps) ? parsed.completedSteps : [],
          lastShown: typeof parsed.lastShown === 'string' ? parsed.lastShown : undefined
        }
      }
    }
  } catch (e) {
    console.error('チュートリアル状態の読み込みに失敗しました:', e)
  }
  
  return getDefaultState()
}

/**
 * チュートリアル状態を保存
 */
export function saveTutorialState(state: TutorialState): void {
  if (!isBrowser()) return
  
  try {
    localStorage.setItem(TUTORIAL_STATE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('チュートリアル状態の保存に失敗しました:', e)
  }
}

/**
 * チュートリアルを表示すべきかどうかを判定
 */
export function shouldShowTutorial(): boolean {
  if (!isBrowser()) return false
  
  const state = getTutorialState()
  // 完了済みまたはスキップ済みの場合は表示しない
  return !state.completed && !state.skipped
}

/**
 * チュートリアル完了をマーク
 */
export function markTutorialCompleted(): void {
  const state = getTutorialState()
  state.completed = true
  state.lastShown = new Date().toISOString()
  saveTutorialState(state)
}

/**
 * チュートリアルスキップをマーク
 */
export function markTutorialSkipped(): void {
  const state = getTutorialState()
  state.skipped = true
  state.lastShown = new Date().toISOString()
  saveTutorialState(state)
}

/**
 * 現在のステップを更新
 */
export function updateCurrentStep(step: number): void {
  const state = getTutorialState()
  state.currentStep = step
  if (!state.completedSteps.includes(step)) {
    state.completedSteps.push(step)
  }
  saveTutorialState(state)
}

/**
 * チュートリアル状態をリセット（再表示用）
 */
export function resetTutorial(): void {
  const defaultState = getDefaultState()
  saveTutorialState(defaultState)
}


