'use client'

import { useState, useEffect } from 'react'
import { getSlideSize, setSlideSize as saveSlideSize, resetSlideSize as resetSavedSize } from '@/lib/slideSizeStorage'
import { getSlideSizeConfig, DEFAULT_SLIDE_SIZE_TYPE } from '@/lib/slideSizeConfig'
import type { SlideSizeType, SlideSizeConfig } from '@/types'

export function useSlideSize() {
  const [sizeType, setSizeTypeState] = useState<SlideSizeType>(() => getSlideSize())

  // 初期化時に設定を読み込む
  useEffect(() => {
    const saved = getSlideSize()
    setSizeTypeState(saved)
  }, [])

  // スライドサイズを変更
  const setSlideSize = (newSizeType: SlideSizeType) => {
    setSizeTypeState(newSizeType)
    saveSlideSize(newSizeType)
  }

  // 現在のサイズ設定を取得
  const currentSizeConfig: SlideSizeConfig = getSlideSizeConfig(sizeType)

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

