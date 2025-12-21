'use client'

import { type HTMLElementNode } from '@/lib/htmlHierarchyParser'
import styles from './TreeView.module.css'

interface TreeViewProps {
  node: HTMLElementNode
  level: number
  onNodeClick: (node: HTMLElementNode) => void
  expandedNodes: Set<string>
  onToggleExpand: (nodeId: string) => void
}

export default function TreeView({
  node,
  level,
  onNodeClick,
  expandedNodes,
  onToggleExpand
}: TreeViewProps) {
  const nodeId = `${node.tagName}-${node.startPosition}`
  const isExpanded = expandedNodes.has(nodeId)
  const hasChildren = node.children.length > 0
  
  const handleClick = () => {
    onNodeClick(node)
  }
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleExpand(nodeId)
  }
  
  // 表示名を生成
  let displayName = node.tagName
  if (node.id) {
    displayName = `${node.tagName}#${node.id}`
  } else if (node.className) {
    const firstClass = node.className.split(' ')[0]
    displayName = `${node.tagName}.${firstClass}`
  }
  
  return (
    <div className={styles.treeNode}>
      <div 
        className={styles.treeNodeContent}
        style={{ paddingLeft: `${level * 16}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            className={styles.expandButton}
            onClick={handleToggle}
            aria-label={isExpanded ? '折りたたむ' : '展開する'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className={styles.spacer} />
        )}
        <span className={styles.tagIcon}>📄</span>
        <span className={styles.tagName}>{displayName}</span>
        {node.lineNumber && (
          <span className={styles.lineNumber}>行 {node.lineNumber}</span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className={styles.treeChildren}>
          {node.children.map((child, index) => (
            <TreeView
              key={`${child.tagName}-${child.startPosition}-${index}`}
              node={child}
              level={level + 1}
              onNodeClick={onNodeClick}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

