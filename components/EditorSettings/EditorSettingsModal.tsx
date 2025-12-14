'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './EditorSettingsModal.module.css'
import type { EditorSettings } from '@/types'

interface EditorSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: EditorSettings
  onSettingsChange: (settings: EditorSettings) => void
  onReset: () => void
}

// フォントファミリーの選択肢
const FONT_FAMILIES = [
  { value: "'Courier New', monospace", label: 'Courier New' },
  { value: "'Monaco', monospace", label: 'Monaco' },
  { value: "'Consolas', monospace", label: 'Consolas' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
  { value: "'Source Code Pro', monospace", label: 'Source Code Pro' },
  { value: "'Menlo', monospace", label: 'Menlo' },
  { value: "'Roboto Mono', monospace", label: 'Roboto Mono' },
  { value: 'monospace', label: 'システム標準（等幅）' },
]

// フォントサイズの選択肢
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24]

// 行の高さの選択肢
const LINE_HEIGHTS = [
  { value: 1.2, label: '1.2（詰め）' },
  { value: 1.4, label: '1.4' },
  { value: 1.6, label: '1.6（標準）' },
  { value: 1.8, label: '1.8' },
  { value: 2.0, label: '2.0（広め）' },
]

// タブサイズの選択肢
const TAB_SIZES = [2, 4, 8]

export default function EditorSettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  onReset,
}: EditorSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<EditorSettings>(settings)

  // モーダルが開いたときに現在の設定をコピー
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings)
    }
  }, [isOpen, settings])

  if (!isOpen) {
    return null
  }

  // document.bodyが存在しない場合はレンダリングしない
  if (typeof document === 'undefined' || !document.body) {
    return null
  }

  const handleFontSizeChange = (fontSize: number) => {
    setLocalSettings((prev) => ({ ...prev, fontSize }))
  }

  const handleFontFamilyChange = (fontFamily: string) => {
    setLocalSettings((prev) => ({ ...prev, fontFamily }))
  }

  const handleLineHeightChange = (lineHeight: number) => {
    setLocalSettings((prev) => ({ ...prev, lineHeight }))
  }

  const handleTabSizeChange = (tabSize: number) => {
    setLocalSettings((prev) => ({ ...prev, tabSize }))
  }

  const handleApply = () => {
    onSettingsChange(localSettings)
    onClose()
  }

  const handleReset = () => {
    if (confirm('設定をデフォルトに戻しますか？')) {
      onReset()
      onClose()
    }
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const modalContent = (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <h3>⚙️ エディタ設定</h3>

        {/* フォントサイズ */}
        <div className={styles.settingSection}>
          <label className={styles.settingLabel}>
            <span className={styles.labelText}>📝 フォントサイズ</span>
            <span className={styles.valueDisplay}>{localSettings.fontSize}px</span>
          </label>
          <div className={styles.fontSizeButtons}>
            {FONT_SIZES.map((size) => (
              <button
                key={size}
                className={`${styles.fontSizeBtn} ${localSettings.fontSize === size ? styles.active : ''}`}
                onClick={() => handleFontSizeChange(size)}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>

        {/* フォントファミリー */}
        <div className={styles.settingSection}>
          <label className={styles.settingLabel}>
            <span className={styles.labelText}>🔤 フォントファミリー</span>
          </label>
          <select
            className={styles.select}
            value={localSettings.fontFamily}
            onChange={(e) => handleFontFamilyChange(e.target.value)}
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>

        {/* 行の高さ */}
        <div className={styles.settingSection}>
          <label className={styles.settingLabel}>
            <span className={styles.labelText}>📏 行の高さ</span>
            <span className={styles.valueDisplay}>{localSettings.lineHeight}</span>
          </label>
          <div className={styles.lineHeightButtons}>
            {LINE_HEIGHTS.map((lh) => (
              <button
                key={lh.value}
                className={`${styles.lineHeightBtn} ${localSettings.lineHeight === lh.value ? styles.active : ''}`}
                onClick={() => handleLineHeightChange(lh.value)}
              >
                {lh.label}
              </button>
            ))}
          </div>
        </div>

        {/* タブサイズ */}
        <div className={styles.settingSection}>
          <label className={styles.settingLabel}>
            <span className={styles.labelText}>⌨️ タブサイズ</span>
            <span className={styles.valueDisplay}>{localSettings.tabSize}スペース</span>
          </label>
          <div className={styles.tabSizeButtons}>
            {TAB_SIZES.map((size) => (
              <button
                key={size}
                className={`${styles.tabSizeBtn} ${localSettings.tabSize === size ? styles.active : ''}`}
                onClick={() => handleTabSizeChange(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* ボタン */}
        <div className={styles.actions}>
          <button className={styles.resetBtn} onClick={handleReset}>
            🔄 リセット
          </button>
          <button className={styles.cancelBtn} onClick={onClose}>
            ❌ キャンセル
          </button>
          <button className={styles.applyBtn} onClick={handleApply}>
            ✅ 適用
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
