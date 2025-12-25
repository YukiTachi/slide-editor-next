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

// プレゼンテーションモードの設定
export interface PresentationConfig {
  startSlide: number              // 開始スライド番号（0ベース）
  showProgress: boolean           // 進捗表示の有無
  showControls: boolean            // コントロール表示の有無
  transition: 'none' | 'fade' | 'slide'  // トランジション効果
  backgroundColor: string          // 背景色（デフォルト: '#000000'）
}

// プレゼンテーションモードの状態
export interface PresentationState {
  isActive: boolean                // プレゼンテーションモードが有効か
  currentSlide: number             // 現在のスライド番号（0ベース）
  totalSlides: number              // 総スライド数
  isFullscreen: boolean            // フルスクリーン状態か
}

// グラフタイプ
export type ChartType = 
  | 'bar'           // 棒グラフ
  | 'line'          // 折れ線グラフ
  | 'pie'           // 円グラフ
  | 'doughnut'      // ドーナツチャート
  | 'radar'         // レーダーチャート
  | 'polarArea'     // 極座標エリアチャート
  | 'bubble'        // バブルチャート
  | 'scatter'       // 散布図

// グラフデータセット
export interface ChartDataset {
  label: string               // データセットのラベル
  data: number[]              // データ値
  backgroundColor?: string | string[]  // 背景色
  borderColor?: string | string[]      // 境界線の色
  borderWidth?: number        // 境界線の太さ
}

// グラフデータ
export interface ChartData {
  labels: string[]            // X軸ラベル（またはカテゴリ）
  datasets: ChartDataset[]    // データセット
}

// グラフオプション（Chart.jsのオプションを簡略化）
export interface ChartOptions {
  responsive?: boolean        // レスポンシブ
  maintainAspectRatio?: boolean  // アスペクト比を維持
  plugins?: {
    legend?: {
      display?: boolean       // 凡例の表示
      position?: 'top' | 'bottom' | 'left' | 'right'
    }
    title?: {
      display?: boolean       // タイトルの表示
      text?: string          // タイトルテキスト
    }
  }
  scales?: {
    x?: {
      title?: {
        display?: boolean
        text?: string
      }
    }
    y?: {
      title?: {
        display?: boolean
        text?: string
      }
    }
  }
}

// グラフの設定
export interface ChartConfig {
  type: ChartType
  title?: string              // グラフタイトル
  data: ChartData             // グラフデータ
  options?: ChartOptions      // Chart.jsのオプション
  width?: number              // グラフの幅（px）
  height?: number             // グラフの高さ（px）
}

// データ入力方法
export type DataInputMethod = 'manual' | 'csv' | 'json'

// コードブロックのスタイル
export type CodeBlockStyle = 
  | 'default'       // デフォルト（背景色付き）
  | 'minimal'       // ミニマル（ボーダーのみ）
  | 'dark'          // ダークテーマ
  | 'transparent'   // 透明背景

// プログラミング言語
export type CodeLanguage = 
  | 'javascript' | 'typescript' | 'jsx' | 'tsx'
  | 'python' | 'java' | 'cpp' | 'c' | 'csharp'
  | 'html' | 'css' | 'scss' | 'sass'
  | 'json' | 'xml' | 'markdown'
  | 'go' | 'rust' | 'php' | 'ruby' | 'swift'
  | 'sql' | 'bash' | 'shell' | 'yaml'
  | 'plaintext'  // プレーンテキスト（ハイライトなし）

// コードブロックの設定
export interface CodeBlockConfig {
  code: string              // コード内容
  language: CodeLanguage    // プログラミング言語
  style: CodeBlockStyle     // スタイル
  showLineNumbers: boolean  // 行番号を表示するか
  startLineNumber?: number  // 開始行番号（デフォルト: 1）
  caption?: string          // キャプション（任意）
  maxHeight?: number        // 最大高さ（px、スクロール表示用）
}

