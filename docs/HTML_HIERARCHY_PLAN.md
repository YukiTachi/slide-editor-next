# HTML階層構造機能 実装計画

## 📋 概要

HTMLドキュメントのタグの階層構造をツリービューで表示し、クリックで該当位置にジャンプできる機能を実装します。これにより、HTMLの構造を視覚的に理解し、デバッグや編集が効率化されます。

## 🎯 実装する機能

### Phase 1: 基本機能（必須）
1. **HTML階層構造の解析**
   - HTMLコンテンツからタグの階層構造を抽出
   - 親子関係をツリー構造として構築

2. **ツリービューの表示**
   - 折りたたみ可能なツリービューで階層を表示
   - 各要素にアイコンとタグ名を表示
   - クラス名やIDがあれば表示

3. **エディタへのジャンプ機能**
   - ツリーの要素をクリックすると、エディタ内の該当位置にカーソルを移動
   - 該当行が表示されるようにスクロール

4. **リアルタイム更新**
   - HTMLコンテンツが変更されると、階層構造も自動更新

### Phase 2: 拡張機能（将来）
5. 要素の検索・フィルタリング
6. 要素のハイライト表示（ホバー時）
7. 要素の統計情報表示（タグ数、ネストの深さなど）
8. カスタマイズ可能な表示オプション

## 🏗️ アーキテクチャ設計

### 1. HTMLパーサー（`lib/htmlHierarchyParser.ts`）

HTMLコンテンツを解析して階層構造を抽出するユーティリティ。

```typescript
export interface HTMLElementNode {
  tagName: string
  id?: string
  className?: string
  attributes?: Record<string, string>
  startPosition: number  // HTML内の開始位置
  endPosition: number     // HTML内の終了位置
  lineNumber: number      // 行番号
  children: HTMLElementNode[]
  isSelfClosing: boolean
}

export function parseHTMLHierarchy(htmlContent: string): HTMLElementNode[]
```

**実装方針**:
- 正規表現または簡易パーサーでHTMLタグを抽出
- 開始タグと終了タグをマッチングして階層構造を構築
- 自己完結型タグ（`<img>`, `<br>`など）を適切に処理

### 2. 階層構造パネルコンポーネント（`components/HTMLHierarchyPanel/HTMLHierarchyPanel.tsx`）

階層構造を表示するパネルコンポーネント。

**表示形式の選択肢**:
- **オプション1: ドロワー形式（サイドバー）**（推奨）
  - エディタの左側または右側にスライドインして表示
  - ボタンクリックで開閉可能
  - 閉じている時は画面スペースを節約
  - 開いている時はエディタと並行して表示されるため、常に参照可能
  - 既存のハンバーガーメニューと同様のパターン

- **オプション2: 固定サイドバー形式**
  - エディタの左側または右側に常時表示
  - 幅を調整可能
  - 常に参照可能だが、画面スペースを常に使用

- **オプション3: モーダル形式**
  - ボタンクリックで開閉
  - 既存のモーダルパターンに準拠
  - 画面スペースを節約できるが、エディタと同時に参照しにくい

**推奨**: オプション1（ドロワー形式）を採用。理由：
- 必要に応じて開閉できるため、柔軟性が高い
- 画面スペースを節約できる
- 開いている時は常時参照可能
- 既存のハンバーガーメニューと一貫性がある
- 他のエディタ（VS Code、Atomなど）でも一般的なパターン

### 3. ツリービューコンポーネント（`components/HTMLHierarchyPanel/TreeView.tsx`）

再帰的にツリー構造を表示するコンポーネント。

```typescript
interface TreeViewProps {
  node: HTMLElementNode
  level: number
  onNodeClick: (node: HTMLElementNode) => void
  expandedNodes: Set<string>
  onToggleExpand: (nodeId: string) => void
}
```

**機能**:
- 折りたたみ/展開機能
- インデント表示で階層を視覚化
- クリックでエディタにジャンプ
- ホバー時のハイライト

### 4. エディタ連携

`EditorHandle`インターフェースを使用してカーソル位置を設定。

```typescript
interface HTMLHierarchyPanelProps {
  htmlContent: string
  editorRef?: React.RefObject<EditorHandle | null>
  isOpen?: boolean  // サイドバーの表示/非表示（オプション）
  onClose?: () => void  // モーダルの場合
}
```

## 📁 ファイル構成

```
slide-editor-nextjs/
├── lib/
│   └── htmlHierarchyParser.ts          # 新規作成（HTML解析）
├── components/
│   └── HTMLHierarchyPanel/              # 新規ディレクトリ
│       ├── HTMLHierarchyPanel.tsx       # メインコンポーネント
│       ├── HTMLHierarchyPanel.module.css
│       ├── TreeView.tsx                 # ツリービューコンポーネント
│       └── TreeView.module.css
├── app/
│   └── page.tsx                         # パネルを追加
└── components/
    └── Menu/
        └── HamburgerMenu.tsx             # メニューに追加（モーダルの場合）
```

## 🔧 実装詳細

### HTMLパーサーの実装

```typescript
// lib/htmlHierarchyParser.ts

const SELF_CLOSING_TAGS = new Set([
  'img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed',
  'source', 'track', 'wbr'
])

export function parseHTMLHierarchy(htmlContent: string): HTMLElementNode[] {
  const nodes: HTMLElementNode[] = []
  const stack: HTMLElementNode[] = []
  
  // 正規表現でタグを抽出
  const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*)>/g
  const lines = htmlContent.split('\n')
  
  let match
  let currentLine = 1
  let currentPos = 0
  
  while ((match = tagRegex.exec(htmlContent)) !== null) {
    const isClosing = match[1] === '/'
    const tagName = match[2].toLowerCase()
    const attributes = match[3]
    const tagStart = match.index
    const tagEnd = tagStart + match[0].length
    
    // 行番号を計算
    while (currentLine <= lines.length && 
           currentPos + lines[currentLine - 1].length < tagStart) {
      currentPos += lines[currentLine - 1].length + 1
      currentLine++
    }
    
    if (isClosing) {
      // 終了タグ: スタックから対応する開始タグを探す
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tagName === tagName) {
          const node = stack[i]
          node.endPosition = tagEnd
          stack.splice(i)
          break
        }
      }
    } else {
      // 開始タグ
      const isSelfClosing = SELF_CLOSING_TAGS.has(tagName) || 
                            attributes.trim().endsWith('/')
      
      const node: HTMLElementNode = {
        tagName,
        startPosition: tagStart,
        endPosition: isSelfClosing ? tagEnd : -1,
        lineNumber: currentLine,
        children: [],
        isSelfClosing,
        ...parseAttributes(attributes)
      }
      
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node)
      } else {
        nodes.push(node)
      }
      
      if (!isSelfClosing) {
        stack.push(node)
      }
    }
  }
  
  return nodes
}

function parseAttributes(attrString: string): {
  id?: string
  className?: string
  attributes?: Record<string, string>
} {
  const result: {
    id?: string
    className?: string
    attributes?: Record<string, string>
  } = {}
  
  // id属性を抽出
  const idMatch = attrString.match(/\bid\s*=\s*["']([^"']+)["']/i)
  if (idMatch) {
    result.id = idMatch[1]
  }
  
  // class属性を抽出
  const classMatch = attrString.match(/\bclass\s*=\s*["']([^"']+)["']/i)
  if (classMatch) {
    result.className = classMatch[1]
  }
  
  return result
}
```

### ツリービューコンポーネントの実装

```typescript
// components/HTMLHierarchyPanel/TreeView.tsx

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
  
  const displayName = node.id 
    ? `${node.tagName}#${node.id}`
    : node.className
    ? `${node.tagName}.${node.className.split(' ')[0]}`
    : node.tagName
  
  return (
    <div className={styles.treeNode}>
      <div 
        className={styles.treeNodeContent}
        style={{ paddingLeft: `${level * 16}px` }}
        onClick={handleClick}
      >
        {hasChildren && (
          <button
            className={styles.expandButton}
            onClick={handleToggle}
            aria-label={isExpanded ? '折りたたむ' : '展開する'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
        {!hasChildren && <span className={styles.spacer} />}
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
```

### メインパネルコンポーネントの実装

```typescript
// components/HTMLHierarchyPanel/HTMLHierarchyPanel.tsx

'use client'

import { useState, useEffect, useMemo } from 'react'
import { parseHTMLHierarchy, type HTMLElementNode } from '@/lib/htmlHierarchyParser'
import type { EditorHandle } from '@/components/Editor/Editor'
import TreeView from './TreeView'
import styles from './HTMLHierarchyPanel.module.css'

interface HTMLHierarchyPanelProps {
  htmlContent: string
  editorRef?: React.RefObject<EditorHandle | null>
  isOpen?: boolean  // サイドバーの場合
  onClose?: () => void  // モーダルの場合
}

export default function HTMLHierarchyPanel({
  htmlContent,
  editorRef,
  isOpen = true,  // デフォルトで表示
  onClose
}: HTMLHierarchyPanelProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [hierarchy, setHierarchy] = useState<HTMLElementNode[]>([])

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

  // モーダル形式の場合
  if (onClose) {
    if (!isOpen) return null
    
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.header}>
            <h3>📊 HTML階層構造</h3>
            <button className={styles.closeBtn} onClick={onClose}>
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
      </div>
    )
  }

  // サイドバー形式の場合
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
```

## 🎨 UI/UX 設計

### ドロワー形式（推奨）

**レイアウト**:
- エディタの左側にスライドインして表示（または右側）
- 幅: 250px〜300px（固定または調整可能）
- 高さ: エディタと同じ高さ
- スクロール可能
- 閉じている時は完全に非表示（画面外）

**開閉制御**:
- ハンバーガーメニューから「📊 HTML階層構造」を選択して開閉
- または、エディタパネルのヘッダーにトグルボタンを配置
- 開閉時にスライドアニメーション（transition）
- ESCキーで閉じる（オプション）

**ヘッダー**:
- タイトル: "📊 HTML階層構造"
- 閉じるボタン（×）

**コンテンツ**:
- ツリービュー
- 各ノード:
  - 展開/折りたたみボタン（子要素がある場合）
  - タグアイコン（📄）
  - タグ名（idやclassがあれば表示）
  - 行番号（オプション）
- ホバー時: 背景色を変更してハイライト
- クリック時: エディタの該当位置にジャンプ

**アニメーション**:
- 開く時: 左から右へスライドイン（または右から左へ）
- 閉じる時: 逆方向にスライドアウト
- アニメーション時間: 0.3秒程度

### 固定サイドバー形式（オプション）

**レイアウト**:
- エディタの左側に常時表示（または右側）
- 幅: 250px〜300px（調整可能、リサイザーで変更）
- 高さ: エディタと同じ高さ
- スクロール可能

**ヘッダー**:
- タイトル: "📊 HTML階層構造"
- 折りたたみボタン（オプション）

**コンテンツ**:
- ツリービュー（ドロワー形式と同じ）

### モーダル形式（オプション）

**レイアウト**:
- 既存のモーダルパターンに準拠
- 幅: 600px〜800px
- 高さ: 最大80vh（スクロール可能）

**操作**:
- ハンバーガーメニューから「HTML階層構造」を選択
- ESCキーまたは閉じるボタンで閉じる

## 📝 実装手順

### Phase 1: 基盤の構築
1. ✅ HTMLパーサーの実装（`lib/htmlHierarchyParser.ts`）
2. ✅ ツリービューコンポーネントの実装（`components/HTMLHierarchyPanel/TreeView.tsx`）
3. ✅ メインパネルコンポーネントの実装（`components/HTMLHierarchyPanel/HTMLHierarchyPanel.tsx`）
4. ✅ スタイルファイルの作成（`HTMLHierarchyPanel.module.css`, `TreeView.module.css`）

### Phase 2: 統合
5. ✅ ドロワー形式で`app/page.tsx`に統合
6. ✅ エディタとの連携（ジャンプ機能）
7. ✅ リアルタイム更新の実装
8. ✅ キーボードショートカットの追加（`Ctrl+B`）
9. ✅ ハンバーガーメニューへの追加

### Phase 3: 拡張機能（将来）
8. 要素の検索・フィルタリング
9. 要素のハイライト表示
10. 統計情報の表示
11. カスタマイズ可能な表示オプション

## 🔄 既存機能との統合

### app/page.tsxへの統合

ドロワー形式の場合：

```typescript
// app/page.tsx に追加

const [isHierarchyPanelOpen, setIsHierarchyPanelOpen] = useState(false)

// コンテナのスタイルを調整（ドロワーが開いている時）
const containerStyle = {
  position: 'relative' as const,
  display: 'flex',
  height: '100%'
}

<div className="container" style={containerStyle}>
  {/* HTML階層構造パネル（ドロワー、左側） */}
  <HTMLHierarchyPanel
    htmlContent={htmlContent}
    editorRef={editorRef}
    isOpen={isHierarchyPanelOpen}
    onClose={() => setIsHierarchyPanelOpen(false)}
  />
  
  {/* エディタパネル */}
  <div ref={editorPanelRef} style={{ width: `${editorWidth}%`, ... }}>
    <Editor ... />
  </div>
  
  {/* リサイザー */}
  <div className="resizer" onMouseDown={startResize}></div>
  
  {/* プレビューパネル */}
  <div style={{ width: `${100 - editorWidth}%`, ... }}>
    <Preview ... />
  </div>
</div>
```

**CSS実装（ドロワー形式）**:

```css
/* HTMLHierarchyPanel.module.css */

.drawer {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 300px;
  background: var(--bg-panel);
  border-right: 1px solid var(--border-color);
  z-index: 1000;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
}

.drawer.open {
  transform: translateX(0);
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--shadow);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 999;
}

.overlay.open {
  opacity: 0.5;
  pointer-events: all;
}
```

### ハンバーガーメニューへの追加

```typescript
// components/Menu/HamburgerMenu.tsx に追加

const [isHierarchyPanelOpen, setIsHierarchyPanelOpen] = useState(false)

// メニュー項目に追加（表示カテゴリ）
<div className={styles.menuSection}>
  <h3>👁️ 表示</h3>
  <button onClick={() => setIsHierarchyPanelOpen(!isHierarchyPanelOpen)}>
    📊 HTML階層構造
  </button>
  {/* 他の表示関連メニュー */}
</div>
```

### キーボードショートカットの追加

既存のキーボードショートカットシステムに統合します。

#### 1. デフォルトショートカット定義に追加

```typescript
// lib/keyboardShortcutsConfig.ts に追加

{
  id: 'toggle-hierarchy',
  action: 'toggle-hierarchy',
  label: 'HTML階層構造の表示/非表示',
  defaultKey: 'Ctrl+B',  // または 'Ctrl+Shift+H'
  enabled: true,
  category: 'view'
}
```

**推奨キー**: `Ctrl+B` または `Ctrl+Shift+H`
- `Ctrl+B`: シンプルで覚えやすい（VS Codeのサイドバー表示/非表示と同じ）
- `Ctrl+Shift+H`: より明確だが、少し長い

#### 2. ショートカットアクションの追加

```typescript
// hooks/useKeyboardShortcuts.ts の ShortcutActions に追加

export interface ShortcutActions {
  // ... 既存のアクション
  'toggle-hierarchy': () => void
}
```

#### 3. app/page.tsxでの統合

```typescript
// app/page.tsx

const [isHierarchyPanelOpen, setIsHierarchyPanelOpen] = useState(false)

const keyboardShortcuts = useKeyboardShortcuts({
  // ... 既存のアクション
  'toggle-hierarchy': () => {
    setIsHierarchyPanelOpen(prev => !prev)
  }
})
```

#### 4. ショートカットキーの候補

| キー | 説明 | 推奨度 |
|------|------|--------|
| `Ctrl+B` | シンプル、VS Codeのサイドバーと同じ | ⭐⭐⭐⭐⭐ |
| `Ctrl+Shift+H` | 明確（HierarchyのH） | ⭐⭐⭐⭐ |
| `Ctrl+Shift+O` | OutlineのO | ⭐⭐⭐ |
| `Ctrl+` ` ` | バッククォート（あまり使われない） | ⭐⭐ |

**推奨**: `Ctrl+B` を採用
- シンプルで覚えやすい
- VS Codeユーザーには馴染みがある
- 他の一般的なエディタでもサイドバー表示に使用される

## ✨ 実装のポイント

1. **パフォーマンス**
   - 大きなHTMLファイルでも動作するよう、パーサーを最適化
   - 必要に応じて仮想スクロールを実装

2. **エラーハンドリング**
   - 不正なHTMLでもエラーにならないよう、フォールバック処理を実装
   - パースエラー時は空の階層を表示

3. **アクセシビリティ**
   - キーボード操作に対応
   - ARIA属性を適切に設定

4. **テーマ対応**
   - ダークモード/ライトモードに対応
   - CSS変数を使用

## 🎯 期待される効果

- **構造理解**: HTMLの階層構造を視覚的に把握できる
- **デバッグ支援**: 構造エラーの特定が容易になる
- **作業効率化**: 目的の要素に素早くジャンプできる
- **学習支援**: HTMLの構造を理解するのに役立つ

