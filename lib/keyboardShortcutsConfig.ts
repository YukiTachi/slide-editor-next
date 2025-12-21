// デフォルトキーボードショートカット定義
import type { KeyboardShortcut } from '@/types'

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // 編集カテゴリ
  {
    id: 'undo',
    action: 'undo',
    label: '元に戻す',
    defaultKey: 'Ctrl+Z',
    enabled: true,
    category: 'edit'
  },
  {
    id: 'redo',
    action: 'redo',
    label: 'やり直す',
    defaultKey: 'Ctrl+Y',
    enabled: true,
    category: 'edit'
  },
  {
    id: 'search-replace',
    action: 'search-replace',
    label: '検索・置換',
    defaultKey: 'Ctrl+F',
    enabled: true,
    category: 'edit'
  },
  // ファイルカテゴリ
  {
    id: 'copy-to-clipboard',
    action: 'copy-to-clipboard',
    label: 'HTMLコピー',
    defaultKey: 'Ctrl+S',
    enabled: true,
    category: 'file'
  },
  {
    id: 'clear-editor',
    action: 'clear-editor',
    label: 'エディタクリア',
    defaultKey: 'Ctrl+K',
    enabled: true,
    category: 'file'
  },
  {
    id: 'restore',
    action: 'restore',
    label: '復元',
    defaultKey: 'Ctrl+R',
    enabled: true,
    category: 'file'
  },
  // 表示カテゴリ
  {
    id: 'preview-window',
    action: 'preview-window',
    label: '別ウィンドウでプレビュー',
    defaultKey: 'Ctrl+O',
    enabled: true,
    category: 'view'
  },
  {
    id: 'toggle-hierarchy',
    action: 'toggle-hierarchy',
    label: 'HTML階層構造の表示/非表示',
    defaultKey: 'Ctrl+B',
    enabled: true,
    category: 'view'
  },
  {
    id: 'presentation-mode',
    action: 'presentation-mode',
    label: 'プレゼンテーションモード',
    defaultKey: 'F5',
    enabled: true,
    category: 'view'
  },
  // 挿入カテゴリ
  {
    id: 'add-slide',
    action: 'add-slide',
    label: 'スライド追加',
    defaultKey: 'Ctrl+M',
    enabled: true,
    category: 'insert'
  },
  {
    id: 'insert-image',
    action: 'insert-image',
    label: '画像挿入',
    defaultKey: 'Ctrl+I',
    enabled: true,
    category: 'insert'
  }
]

// カテゴリの表示名
export const CATEGORY_LABELS: Record<KeyboardShortcut['category'], string> = {
  edit: '📝 編集',
  file: '📁 ファイル',
  view: '👁️ 表示',
  insert: '➕ 挿入',
  other: '🔧 その他'
}

// 設定のバージョン
export const CONFIG_VERSION = 1
