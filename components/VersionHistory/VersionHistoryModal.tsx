'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './VersionHistoryModal.module.css'
import {
  getVersions,
  getVersion,
  deleteVersion,
  type VersionInfo
} from '@/lib/versionStorage'

interface VersionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName: string
  htmlContent: string
  setHtmlContent: (content: string) => void
  onStatusUpdate?: (message: string) => void
}

export default function VersionHistoryModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  htmlContent,
  setHtmlContent,
  onStatusUpdate
}: VersionHistoryModalProps) {
  const [mounted, setMounted] = useState(false)
  const [versions, setVersions] = useState<VersionInfo[]>([])

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen && projectId) {
      refreshVersions()
    }
  }, [isOpen, projectId])

  const refreshVersions = () => {
    const list = getVersions(projectId)
    setVersions(list)
  }

  const handleLoadVersion = (version: VersionInfo) => {
    if (htmlContent.trim() && !confirm(`現在のエディタ内容は失われます。\nバージョン「${formatDate(version.createdAt)}」を読み込みますか？`)) {
      return
    }
    setHtmlContent(version.content)
    if (onStatusUpdate) {
      onStatusUpdate(`バージョン「${formatDate(version.createdAt)}」を読み込みました`)
      setTimeout(() => onStatusUpdate(''), 2000)
    }
    onClose()
  }

  const handleCopyVersion = async (version: VersionInfo) => {
    try {
      await navigator.clipboard.writeText(version.content)
      if (onStatusUpdate) {
        onStatusUpdate('バージョンの内容をクリップボードにコピーしました')
        setTimeout(() => onStatusUpdate(''), 2000)
      }
    } catch (err) {
      console.error('コピーに失敗:', err)
      alert('クリップボードへのコピーに失敗しました')
    }
  }

  const handleDeleteVersion = (version: VersionInfo) => {
    if (!confirm(`バージョン「${formatDate(version.createdAt)}」を削除しますか？\n（元に戻せません）`)) {
      return
    }
    if (deleteVersion(projectId, version.id)) {
      refreshVersions()
      if (onStatusUpdate) {
        onStatusUpdate('バージョンを削除しました')
        setTimeout(() => onStatusUpdate(''), 2000)
      }
    } else {
      alert('バージョンの削除に失敗しました')
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen || !mounted) return null
  if (typeof document === 'undefined' || !document.body) return null

  const modal = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📜 バージョン履歴: {projectName}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {versions.length === 0 ? (
            <div className={styles.emptyState}>
              まだ保存されたバージョンはありません。<br />
              プロジェクト管理画面から「📌 バージョンを保存」でバージョンを作成できます。
            </div>
          ) : (
            <div className={styles.versionsList}>
              {versions.map((version, index) => (
                <div key={version.id} className={styles.versionRow}>
                  <div className={styles.versionInfo}>
                    <div className={styles.versionHeader}>
                      <span className={styles.versionNumber}>
                        バージョン {versions.length - index}
                        {index === 0 && <span className={styles.latestBadge}>最新</span>}
                      </span>
                    </div>
                    <div className={styles.versionMeta}>
                      📅 {formatDate(version.createdAt)}
                    </div>
                    {version.description && (
                      <div className={styles.versionDescription}>
                        📝 {version.description}
                      </div>
                    )}
                    <div className={styles.versionSize}>
                      {Math.round(version.content.length / 1024)} KB
                    </div>
                  </div>
                  <div className={styles.versionActions}>
                    <button
                      className={`${styles.btn} ${styles.smallBtn}`}
                      onClick={() => handleLoadVersion(version)}
                    >
                      📂 開く
                    </button>
                    <button
                      className={`${styles.btn} ${styles.smallBtn}`}
                      onClick={() => handleCopyVersion(version)}
                    >
                      📋 コピー
                    </button>
                    {index !== 0 && (
                      <button
                        className={`${styles.btn} ${styles.smallBtn} ${styles.dangerBtn}`}
                        onClick={() => handleDeleteVersion(version)}
                      >
                        🗑️ 削除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}


