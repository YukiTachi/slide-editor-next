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

