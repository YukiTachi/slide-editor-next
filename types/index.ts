// 画像データの型定義
export interface ImageData {
  data: string // Base64データまたはURL
  originalName: string
  size: number
  type: string
  timestamp: number
}

// スライドの型定義
export interface Slide {
  id: string
  content: string
  pageNumber: number
}

// 自動保存の状態
export interface AutoSaveState {
  content: string
  timestamp: string
  hasUnsavedChanges: boolean
}

// エディタ設定の型定義
export interface EditorSettings {
  fontSize: number        // px単位（10-24）
  fontFamily: string      // フォント名
  lineHeight: number      // 倍率（1.2-2.0）
  tabSize: number         // スペース数（2, 4, 8）
}

// スライドテンプレートの型定義
export interface SlideTemplate {
  id: string              // テンプレートID（一意）
  name: string            // テンプレート名（表示用）
  description: string     // 説明文
  icon: string            // アイコン（絵文字またはアイコン名）
  category: 'basic' | 'layout' | 'special'  // カテゴリ
  html: string            // HTMLテンプレート
  preview?: string        // プレビュー用の短縮版（任意）
}

// キーボードショートカットの型定義
export interface KeyboardShortcut {
  id: string                    // ショートカットID（一意）
  action: string                // アクション名（例: 'undo', 'redo'）
  label: string                 // 表示名（例: '元に戻す'）
  defaultKey: string            // デフォルトキー（例: 'Ctrl+Z'）
  customKey?: string            // カスタムキー（未設定の場合はdefaultKeyを使用）
  enabled: boolean              // 有効/無効
  category: 'edit' | 'file' | 'view' | 'insert' | 'other'  // カテゴリ
}

export interface KeyboardShortcutsConfig {
  shortcuts: KeyboardShortcut[]
  version: number               // 設定のバージョン（将来の互換性のため）
}

// チュートリアルステップの型定義
export interface TutorialStep {
  id: string                    // ステップID（例: 'welcome', 'layout', 'menu'）
  title: string                 // ステップタイトル
  content: string               // 説明文（HTML可）
  highlightElement?: string     // ハイライト対象のセレクタ（例: '.hamburger-btn'）
  highlightPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center'  // 説明ボックスの位置
  action?: 'none' | 'click' | 'input'  // 必要なアクション（任意）
  actionTarget?: string         // アクション対象のセレクタ
  skipable?: boolean            // スキップ可能かどうか（デフォルト: true）
}

// チュートリアルの状態
export interface TutorialState {
  completed: boolean            // 完了フラグ
  skipped: boolean              // スキップフラグ
  currentStep: number           // 現在のステップ番号
  completedSteps: number[]      // 完了したステップの番号
  lastShown?: string            // 最後に表示した日時（ISO文字列）
}

// チュートリアル設定
export interface TutorialConfig {
  steps: TutorialStep[]
  autoStart?: boolean           // 初回訪問時に自動開始（デフォルト: true）
  allowRestart?: boolean        // 再表示を許可（デフォルト: true）
}

// 表スタイルの型定義
export type TableStyle = 
  | 'simple'        // シンプル（ボーダーなし）
  | 'bordered'      // ボーダー付き
  | 'striped'       // ストライプ（交互の背景色）
  | 'highlight'     // ヘッダー強調
  | 'minimal'       // ミニマル（細いボーダー）

// 表の設定
export interface TableConfig {
  rows: number              // 行数（1-20）
  columns: number           // 列数（1-10）
  style: TableStyle         // スタイル
  hasHeader: boolean        // ヘッダー行があるか
  caption?: string          // 表のキャプション（任意）
}

