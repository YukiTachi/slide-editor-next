import type { SlideSizeConfig, SlideSizeType } from '@/types'

// 各サイズの定義
export const SLIDE_SIZE_PRESETS: Record<SlideSizeType, SlideSizeConfig> = {
  'a4-landscape': {
    type: 'a4-landscape',
    width: '297mm',
    height: '210mm',
    pageSize: 'A4 landscape',
  },
  '16-9': {
    type: '16-9',
    width: '1920px',
    height: '1080px',
    pageSize: '1920px 1080px',
  },
}

// デフォルトサイズ
export const DEFAULT_SLIDE_SIZE_TYPE: SlideSizeType = 'a4-landscape'

// サイズ取得ヘルパー
export function getSlideSizeConfig(type: SlideSizeType): SlideSizeConfig {
  return SLIDE_SIZE_PRESETS[type]
}

// プレビュー表示用のスケールを計算するヘルパー
// 16:9サイズ（1920x1080px）はプレビューパネルに収まらないため、スケーリングが必要
export function calculatePreviewScale(
  sizeConfig: SlideSizeConfig,
  containerWidth: number
): number {
  // A4横向き: 297mm = 約1122px（96dpi想定）
  // 16:9: 1920px
  const slideWidthPx = sizeConfig.type === '16-9'
    ? 1920
    : 297 * 3.78  // mm to px (約1122px)
  
  // コンテナ幅に収まるようにスケールを計算（最大1.0）
  return Math.min(containerWidth / slideWidthPx, 1)
}

