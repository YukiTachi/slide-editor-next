'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './PowerPointExporterModal.module.css'
import type { PowerPointExportConfig, SlideSizeConfig } from '@/types'

interface PowerPointExporterModalProps {
  isOpen: boolean
  onClose: () => void
  config: PowerPointExportConfig
  sizeConfig: SlideSizeConfig       // 表示のみ（サイズはエディタの設定に追従する）
  onExport: (config: PowerPointExportConfig) => void
}

// 画像品質の選択肢
const IMAGE_QUALITIES: Array<{
  value: PowerPointExportConfig['imageQuality']
  label: string
  description: string
}> = [
  { value: 'high', label: '高', description: '元の画像をそのまま埋め込む' },
  { value: 'medium', label: '中', description: '長辺1600pxに縮小して圧縮' },
  { value: 'low', label: '低', description: '長辺1000pxに縮小して圧縮' },
]

const SIZE_LABELS: Record<SlideSizeConfig['type'], string> = {
  'a4-landscape': 'A4横向き（11.69 × 8.27インチ）',
  '16-9': '16:9ワイド（13.33 × 7.5インチ）',
}

export default function PowerPointExporterModal({
  isOpen,
  onClose,
  config,
  sizeConfig,
  onExport,
}: PowerPointExporterModalProps) {
  const [localConfig, setLocalConfig] = useState<PowerPointExportConfig>(config)

  // モーダルが開いたときに現在の設定をコピー
  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config)
    }
  }, [isOpen, config])

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined' || !document.body) {
    return null
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const modalContent = (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <h3>📊 PowerPoint出力</h3>

        {/* スライドサイズ（エディタ設定に追従するため表示のみ） */}
        <div className={styles.settingSection}>
          <label className={styles.settingLabel}>
            <span className={styles.labelText}>📐 スライドサイズ</span>
          </label>
          <p className={styles.readOnlyValue}>
            {SIZE_LABELS[sizeConfig.type]}
            <span className={styles.hint}>エディタのスライドサイズ設定に追従します</span>
          </p>
        </div>

        {/* 画像品質 */}
        <div className={styles.settingSection}>
          <label className={styles.settingLabel}>
            <span className={styles.labelText}>🖼️ 画像品質</span>
          </label>
          <div className={styles.qualityButtons}>
            {IMAGE_QUALITIES.map((quality) => (
              <button
                key={quality.value}
                className={`${styles.qualityBtn} ${localConfig.imageQuality === quality.value ? styles.active : ''}`}
                onClick={() => setLocalConfig((prev) => ({ ...prev, imageQuality: quality.value }))}
                title={quality.description}
              >
                {quality.label}
              </button>
            ))}
          </div>
          <p className={styles.hint}>
            {IMAGE_QUALITIES.find((q) => q.value === localConfig.imageQuality)?.description}
          </p>
        </div>

        {/* ページ番号 */}
        <div className={styles.settingSection}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={localConfig.includePageNumbers}
              onChange={(e) =>
                setLocalConfig((prev) => ({ ...prev, includePageNumbers: e.target.checked }))
              }
            />
            <span className={styles.labelText}>🔢 ページ番号を右下に入れる</span>
          </label>
        </div>

        <p className={styles.note}>
          編集可能なpptxを生成します。デザインテンプレートの装飾は簡略化されます（見た目そのままの共有にはPDF出力をご利用ください）。
        </p>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            ❌ キャンセル
          </button>
          <button className={styles.exportBtn} onClick={() => onExport(localConfig)}>
            📊 出力
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
