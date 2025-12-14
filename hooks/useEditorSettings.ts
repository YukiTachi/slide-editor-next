'use client'

import { useState, useEffect } from 'react'
import { getEditorSettings, setEditorSettings as saveEditorSettings, resetEditorSettings as resetSavedSettings, DEFAULT_EDITOR_SETTINGS } from '@/lib/editorSettingsStorage'
import type { EditorSettings } from '@/types'

export function useEditorSettings() {
  const [settings, setSettingsState] = useState<EditorSettings>(() => getEditorSettings())

  // 初期化時に設定を読み込む
  useEffect(() => {
    const saved = getEditorSettings()
    setSettingsState(saved)
  }, [])

  // 設定を変更
  const setEditorSettings = (newSettings: EditorSettings | ((prev: EditorSettings) => EditorSettings)) => {
    setSettingsState((prev) => {
      const updated = typeof newSettings === 'function' ? newSettings(prev) : newSettings
      saveEditorSettings(updated)
      return updated
    })
  }

  // 個別の設定を更新
  const updateFontSize = (fontSize: number) => {
    setEditorSettings((prev) => ({ ...prev, fontSize }))
  }

  const updateFontFamily = (fontFamily: string) => {
    setEditorSettings((prev) => ({ ...prev, fontFamily }))
  }

  const updateLineHeight = (lineHeight: number) => {
    setEditorSettings((prev) => ({ ...prev, lineHeight }))
  }

  const updateTabSize = (tabSize: number) => {
    setEditorSettings((prev) => ({ ...prev, tabSize }))
  }

  // 設定をデフォルトにリセット
  const resetEditorSettings = () => {
    resetSavedSettings()
    setSettingsState(DEFAULT_EDITOR_SETTINGS)
  }

  return {
    settings,
    setEditorSettings,
    updateFontSize,
    updateFontFamily,
    updateLineHeight,
    updateTabSize,
    resetEditorSettings,
  }
}
