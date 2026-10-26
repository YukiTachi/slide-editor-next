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
    // PowerPoint 既定のワイド画面（13.333in × 7.5in）。96dpi で 1280px × 720px
    pageSize: '1280px 720px',
    // 1920 × 1080 の画面レイアウトを 1280 × 720 のページに収める倍率。
    // 小数に丸めると 1px はみ出して空白ページが増えるため、CSS には calc(2 / 3) として渡す（getPrintPageCSS）
    printScale: 2 / 3,
  },
}

// デフォルトサイズ
export const DEFAULT_SLIDE_SIZE_TYPE: SlideSizeType = 'a4-landscape'

/**
 * 倍率を CSS の calc(分子 / 分母) に変換する。
 * 0.6667 のような丸めた小数を書くと .slide がページを 1px 未満はみ出して空白ページが増えるため、
 * 分母 1000 以下の既約分数で表せる値は分数のまま渡す。表せない場合は JS の最大精度の小数を使う
 */
function toCSSFraction(value: number): string {
  for (let d = 1; d <= 1000; d++) {
    const n = Math.round(value * d)
    if (Math.abs(n / d - value) < 1e-12) return `calc(${n} / ${d})`
  }
  return String(value)
}

/**
 * @page と印刷時の .slide 縮小をセットで出力する。@page を出す箇所は必ずこの関数を使う。
 * printScale がある場合は @supports (zoom: <実際の値>) で分岐し、zoom（またはその値）を解釈できない環境では
 * 画面レイアウト寸法（width × height）をそのままページ寸法にする（従来どおりの出力）。
 * 設計の詳細は docs/PDF_16_9_PAGE_SIZE_PLAN.md を参照
 */
export function getPrintPageCSS(sizeConfig?: SlideSizeConfig): string {
  const pageSize = sizeConfig?.pageSize ?? 'A4 landscape'
  const scale = sizeConfig?.printScale
  if (!sizeConfig || !scale || scale === 1) {
    return `@page {
  size: ${pageSize};
  margin: 0;
}
`
  }
  const fallbackPageSize = `${sizeConfig.width} ${sizeConfig.height}`
  const zoomValue = toCSSFraction(scale) // 条件式と宣言で同じ文字列を使う
  return `@supports (zoom: ${zoomValue}) {
  @page {
    size: ${pageSize};
    margin: 0;
  }
  @media print {
    .slide {
      zoom: ${zoomValue} !important;
    }
  }
}
@supports not (zoom: ${zoomValue}) {
  @page {
    size: ${fallbackPageSize};
    margin: 0;
  }
}
`
}

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

