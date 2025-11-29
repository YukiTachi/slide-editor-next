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

