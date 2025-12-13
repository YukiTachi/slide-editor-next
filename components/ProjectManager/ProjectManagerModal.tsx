'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './ProjectManagerModal.module.css'
import {
  getProjects,
  saveProject,
  loadProjectContent,
  deleteProject,
  type ProjectMeta
} from '@/lib/projectStorage'
import { saveVersion, getVersionCount } from '@/lib/versionStorage'
import VersionHistoryModal from '@/components/VersionHistory/VersionHistoryModal'

interface ProjectManagerModalProps {
  isOpen: boolean
  onClose: () => void
  htmlContent: string
  setHtmlContent: (content: string) => void
  onStatusUpdate?: (message: string) => void
}

export default function ProjectManagerModal({
  isOpen,
  onClose,
  htmlContent,
  setHtmlContent,
  onStatusUpdate
}: ProjectManagerModalProps) {
  const [mounted, setMounted] = useState(false)
  const [projects, setProjects] = useState<ProjectMeta[]>([])
  const [projectName, setProjectName] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false)
  const [versionHistoryProjectId, setVersionHistoryProjectId] = useState<string | null>(null)
  const [versionHistoryProjectName, setVersionHistoryProjectName] = useState<string>('')

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      refreshProjects()
      if (!projectName) {
        // デフォルトのプロジェクト名候補
        const now = new Date()
        const defaultName = `新しいスライド ${now.toLocaleString()}`
        setProjectName(defaultName)
      }
    }
  }, [isOpen])

  const refreshProjects = () => {
    const list = getProjects()
    setProjects(list)
  }

  const handleSaveNew = () => {
    const trimmed = projectName.trim()
    if (!trimmed) {
      alert('プロジェクト名を入力してください')
      return
    }
    if (!htmlContent.trim()) {
      if (!confirm('エディタが空のようです。この状態で保存しますか？')) {
        return
      }
    }
    const project = saveProject(htmlContent, trimmed)
    setSelectedProjectId(project.id)
    refreshProjects()
    if (onStatusUpdate) {
      onStatusUpdate(`プロジェクト「${project.name}」を保存しました`)
      setTimeout(() => onStatusUpdate(''), 2000)
    }
  }

  const handleOverwrite = (project: ProjectMeta) => {
    if (!htmlContent.trim()) {
      if (!confirm(`エディタが空のようです。「${project.name}」を空の内容で上書きしますか？`)) {
        return
      }
    } else {
      if (!confirm(`プロジェクト「${project.name}」を現在の内容で上書き保存しますか？`)) {
        return
      }
    }
    saveProject(htmlContent, project.name, project.id)
    setSelectedProjectId(project.id)
    refreshProjects()
    if (onStatusUpdate) {
      onStatusUpdate(`プロジェクト「${project.name}」を上書き保存しました`)
      setTimeout(() => onStatusUpdate(''), 2000)
    }
  }

  const handleSaveVersion = (projectId?: string) => {
    const targetProjectId = projectId || selectedProjectId
    if (!targetProjectId) {
      alert('プロジェクトが選択されていません')
      return
    }
    const project = projects.find(p => p.id === targetProjectId)
    if (!project) {
      alert('プロジェクトが見つかりません')
      return
    }
    
    const description = prompt('バージョンの説明を入力してください（任意）:')
    if (description === null) {
      return // キャンセルされた場合
    }
    
    try {
      saveVersion(targetProjectId, htmlContent, description || undefined)
      if (onStatusUpdate) {
        onStatusUpdate(`プロジェクト「${project.name}」のバージョンを保存しました`)
        setTimeout(() => onStatusUpdate(''), 2000)
      }
    } catch (e) {
      console.error('バージョン保存エラー:', e)
      alert('バージョンの保存に失敗しました')
    }
  }

  const handleOpenVersionHistory = (project: ProjectMeta) => {
    setVersionHistoryProjectId(project.id)
    setVersionHistoryProjectName(project.name)
    setIsVersionHistoryOpen(true)
  }

  const handleLoad = (project: ProjectMeta) => {
    const content = loadProjectContent(project.id)
    if (content == null) {
      alert('プロジェクトの内容を読み込めませんでした')
      return
    }
    if (htmlContent.trim() && !confirm(`現在のエディタ内容は失われます。\n「${project.name}」を読み込みますか？`)) {
      return
    }
    setHtmlContent(content)
    setSelectedProjectId(project.id)
    if (onStatusUpdate) {
      onStatusUpdate(`プロジェクト「${project.name}」を読み込みました`)
      setTimeout(() => onStatusUpdate(''), 2000)
    }
    onClose()
  }

  const handleDelete = (project: ProjectMeta) => {
    if (!confirm(`プロジェクト「${project.name}」を削除しますか？\n（元に戻せません）`)) {
      return
    }
    deleteProject(project.id)
    refreshProjects()
    if (onStatusUpdate) {
      onStatusUpdate(`プロジェクト「${project.name}」を削除しました`)
      setTimeout(() => onStatusUpdate(''), 2000)
    }
  }

  if (!isOpen || !mounted) return null
  if (typeof document === 'undefined' || !document.body) return null

  const modal = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📁 プロジェクトファイルの管理</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.saveSection}>
            <div className={styles.label}>現在の内容をプロジェクトとして保存</div>
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                type="text"
                placeholder="プロジェクト名（例: 2025/12 勉強会スライド）"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
              />
              <div className={styles.saveButtons}>
                <button className={styles.btn} onClick={handleSaveNew}>
                  💾 新規保存
                </button>
                {selectedProjectId && (
                  <button className={styles.btn} onClick={() => handleSaveVersion()}>
                    📌 バージョンを保存
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={styles.projectsSection}>
            <div className={styles.projectsHeader}>
              <div className={styles.projectsHeaderTitle}>保存済みプロジェクト</div>
            </div>

            {projects.length === 0 ? (
              <div className={styles.emptyState}>
                まだ保存済みのプロジェクトはありません。<br />
                上の「新規保存」からプロジェクトを作成できます。
              </div>
            ) : (
              <div className={styles.projectsList}>
                {projects.map(project => (
                  <div key={project.id} className={styles.projectRow}>
                    <div className={styles.projectInfo}>
                      <div className={styles.projectName}>{project.name}</div>
                      <div className={styles.projectMeta}>
                        最終更新: {new Date(project.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className={styles.projectActions}>
                      <button
                        className={`${styles.btn} ${styles.smallBtn}`}
                        onClick={() => handleLoad(project)}
                      >
                        📂 開く
                      </button>
                      <button
                        className={`${styles.btn} ${styles.smallBtn}`}
                        onClick={() => handleOverwrite(project)}
                      >
                        💾 上書き
                      </button>
                      <button
                        className={`${styles.btn} ${styles.smallBtn}`}
                        onClick={() => handleSaveVersion(project.id)}
                        title="現在のエディタ内容をこのプロジェクトのバージョンとして保存"
                      >
                        📌 バージョン保存
                      </button>
                      <button
                        className={`${styles.btn} ${styles.smallBtn}`}
                        onClick={() => handleOpenVersionHistory(project)}
                        title={`バージョン数: ${getVersionCount(project.id)}`}
                      >
                        📜 履歴{getVersionCount(project.id) > 0 && ` (${getVersionCount(project.id)})`}
                      </button>
                      <button
                        className={`${styles.btn} ${styles.smallBtn} ${styles.dangerBtn}`}
                        onClick={() => handleDelete(project)}
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {createPortal(modal, document.body)}
      {versionHistoryProjectId && (
        <VersionHistoryModal
          isOpen={isVersionHistoryOpen}
          onClose={() => {
            setIsVersionHistoryOpen(false)
            setVersionHistoryProjectId(null)
            setVersionHistoryProjectName('')
          }}
          projectId={versionHistoryProjectId}
          projectName={versionHistoryProjectName}
          htmlContent={htmlContent}
          setHtmlContent={setHtmlContent}
          onStatusUpdate={onStatusUpdate}
        />
      )}
    </>
  )
}


