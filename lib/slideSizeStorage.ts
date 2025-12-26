import { DEFAULT_SLIDE_SIZE_TYPE, getSlideSizeConfig } from './slideSizeConfig'
import type { SlideSizeType } from '@/types'

const STORAGE_KEY = 'slideEditor_slideSize'
export const SLIDE_SIZE_CHANGE_EVENT = 'slideSizeChange'

// 保存されているスライドサイズを取得
// このアプリケーションはクライアントサイドで完結するため、常にLocalStorageにアクセス可能
export function getSlideSize(): SlideSizeType {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const sizeType = stored as SlideSizeType
      // 有効な値かチェック
      if (sizeType === 'a4-landscape' || sizeType === '16-9') {
        return sizeType
      }
    }
  } catch (error) {
    console.warn('Failed to load slide size from storage:', error)
  }

  return DEFAULT_SLIDE_SIZE_TYPE
}

// スライドサイズを保存
export function setSlideSize(sizeType: SlideSizeType): void {
  try {
    localStorage.setItem(STORAGE_KEY, sizeType)
    // 他のフックインスタンスに変更を通知
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SLIDE_SIZE_CHANGE_EVENT, { detail: sizeType }))
    }
  } catch (error) {
    console.warn('Failed to save slide size to storage:', error)
  }
}

// スライドサイズをリセット
export function resetSlideSize(): void {
  setSlideSize(DEFAULT_SLIDE_SIZE_TYPE)
}

