'use client'

import styles from './StatusBar.module.css'
import { type ValidationError } from '@/lib/htmlValidator'

interface StatusBarProps {
  htmlContent: string
  statusMessage?: string
  validationErrors?: ValidationError[]
  onValidationErrorsClick?: () => void
}

export default function StatusBar({ htmlContent, statusMessage, validationErrors = [], onValidationErrorsClick }: StatusBarProps) {
  const lineCount = htmlContent.split('\n').length
  const charCount = htmlContent.length

  const errorCount = validationErrors.filter(e => e.type === 'error').length
  const warningCount = validationErrors.filter(e => e.type === 'warning').length

  const defaultStatusText = htmlContent.trim()
    ? `${lineCount}行, ${charCount}文字 - スライド更新済み`
    : '準備完了 - スライドテンプレート読み込み済み'

  const displayText = statusMessage || defaultStatusText

  return (
    <div className={styles.statusBar}>
      <span className={styles.statusText}>{displayText}</span>
      {(errorCount > 0 || warningCount > 0) && (
        <span 
          className={styles.validationStatus}
          onClick={onValidationErrorsClick}
          style={{ cursor: onValidationErrorsClick ? 'pointer' : 'default' }}
        >
          {errorCount > 0 && <span className={styles.errorCount}>エラー: {errorCount}件</span>}
          {errorCount > 0 && warningCount > 0 && <span className={styles.separator}>、</span>}
          {warningCount > 0 && <span className={styles.warningCount}>警告: {warningCount}件</span>}
        </span>
      )}
      <span className={styles.autoSaveStatus}></span>
    </div>
  )
}

