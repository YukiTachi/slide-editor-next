'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { parseHTMLHierarchy, type HTMLElementNode } from '@/lib/htmlHierarchyParser'
import type { EditorHandle } from '@/components/Editor/Editor'
import TreeView from './TreeView'
import styles from './HTMLHierarchyPanel.module.css'

interface HTMLHierarchyPanelProps {
  htmlContent: string
  editorRef?: React.RefObject<EditorHandle | null>
  isOpen?: boolean  // ドロワーの場合
  onClose?: () => void  // ドロワーの場合
}

export default function HTMLHierarchyPanel({
  htmlContent,
  editorRef,
  isOpen = true,  // デフォルトで表示
  onClose
}: HTMLHierarchyPanelProps) {
  const [mounted, setMounted] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [hierarchy, setHierarchy] = useState<HTMLElementNode[]>([])

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // HTMLコンテンツから階層構造を解析
  useEffect(() => {
    try {
      const parsed = parseHTMLHierarchy(htmlContent)
      setHierarchy(parsed)
      // 最初の階層は自動展開
      if (parsed.length > 0) {
        const firstNodeId = `${parsed[0].tagName}-${parsed[0].startPosition}`
        setExpandedNodes(new Set([firstNodeId]))
      }
    } catch (error) {
      console.error('HTML階層解析エラー:', error)
      setHierarchy([])
    }
  }, [htmlContent])

  // ESCキーで閉じる（ドロワーの場合）
  useEffect(() => {
    if (!isOpen || !onClose) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleNodeClick = (node: HTMLElementNode) => {
    if (editorRef?.current) {
      editorRef.current.setCursorPosition(node.startPosition)
      editorRef.current.focus()
    }
  }

  const handleToggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  if (!mounted) {
    return null
  }

  if (typeof document === 'undefined' || !document.body) {
    return null
  }

  // ドロワー形式の場合
  if (onClose) {
    const drawerContent = (
      <>
        <div 
          className={`${styles.overlay} ${isOpen ? styles.open : ''}`}
          onClick={onClose}
        />
        <div className={`${styles.drawer} ${isOpen ? styles.open : ''}`}>
          <div className={styles.header}>
            <h3>📊 HTML階層構造</h3>
            <button 
              className={styles.closeBtn} 
              onClick={onClose}
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
          <div className={styles.content}>
            {hierarchy.length === 0 ? (
              <div className={styles.emptyMessage}>
                HTMLコンテンツがありません
              </div>
            ) : (
              hierarchy.map((node, index) => (
                <TreeView
                  key={`${node.tagName}-${node.startPosition}-${index}`}
                  node={node}
                  level={0}
                  onNodeClick={handleNodeClick}
                  expandedNodes={expandedNodes}
                  onToggleExpand={handleToggleExpand}
                />
              ))
            )}
          </div>
        </div>
      </>
    )

    return createPortal(drawerContent, document.body)
  }

  // 固定サイドバー形式の場合（将来の拡張用）
  if (!isOpen) return null

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h3>📊 HTML階層構造</h3>
      </div>
      <div className={styles.content}>
        {hierarchy.length === 0 ? (
          <div className={styles.emptyMessage}>
            HTMLコンテンツがありません
          </div>
        ) : (
          hierarchy.map((node, index) => (
            <TreeView
              key={`${node.tagName}-${node.startPosition}-${index}`}
              node={node}
              level={0}
              onNodeClick={handleNodeClick}
              expandedNodes={expandedNodes}
              onToggleExpand={handleToggleExpand}
            />
          ))
        )}
      </div>
    </div>
  )
}

