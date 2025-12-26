'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { getSlideSize, setSlideSize as saveSlideSize, resetSlideSize as resetSavedSize, SLIDE_SIZE_CHANGE_EVENT } from '@/lib/slideSizeStorage'
import { getSlideSizeConfig, DEFAULT_SLIDE_SIZE_TYPE } from '@/lib/slideSizeConfig'
import type { SlideSizeType, SlideSizeConfig } from '@/types'

export function useSlideSize() {
  const [sizeType, setSizeTypeState] = useState<SlideSizeType>(() => getSlideSize())

  // 初期化時に設定を読み込む + 他のインスタンスからの変更を監視
  useEffect(() => {
    // 初期化時に最新の値を読み込む
    const saved = getSlideSize()
    setSizeTypeState(saved)

    // 他のフックインスタンスからの変更を監視
    const handleSizeChange = (event: Event) => {
      const customEvent = event as CustomEvent<SlideSizeType>
      setSizeTypeState(customEvent.detail)
    }

    window.addEventListener(SLIDE_SIZE_CHANGE_EVENT, handleSizeChange)
    return () => {
      window.removeEventListener(SLIDE_SIZE_CHANGE_EVENT, handleSizeChange)
    }
  }, [])

  // スライドサイズを変更
  const setSlideSize = (newSizeType: SlideSizeType) => {
    setSizeTypeState(newSizeType)
    saveSlideSize(newSizeType)
  }

  // 現在のサイズ設定を取得（sizeTypeが変わるたびに新しいオブジェクト参照を返す）
  const currentSizeConfig: SlideSizeConfig = useMemo(() => {
    return getSlideSizeConfig(sizeType)
  }, [sizeType])

  // スライドサイズをリセット
  const resetSlideSize = () => {
    resetSavedSize()
    setSizeTypeState(DEFAULT_SLIDE_SIZE_TYPE)
  }

  return {
    sizeType,
    sizeConfig: currentSizeConfig,
    setSlideSize,
    resetSlideSize,
  }
}

