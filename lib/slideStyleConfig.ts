// スライドスタイルの共通設定
// このファイルを変更すると、CSSとPDFエクスポーターの両方に反映されます

export const slideStyleConfig = {
  // フォントサイズ
  fontSize: {
    h1: 48,
    h2: 36,
    p: 24,
    ul: 22,
    li: 22,
    footer: 18,
    // 分割レイアウト用
    splitH1: 36,
    splitH2: 28,
    splitP: 20,
    splitUl: 18,
    splitLi: 18,
  },
  
  // 色
  colors: {
    h1: '#2c3e50',
    h2: '#34495e',
    text: '#2c3e50',
    footer: '#7f8c8d',
    h1Border: '#3498db',
    h2Border: '#e74c3c',
    liBullet: '#3498db',
    highlight: '#fff59d',
  },
  
  // マージン・パディング
  spacing: {
    h1: {
      marginBottom: 30,
      paddingBottom: 20,
      borderBottom: 4,
    },
    h2: {
      marginBottom: 25,
      paddingLeft: 20,
      borderLeft: 6,
    },
    p: {
      marginBottom: 20,
      paddingLeft: 20,
      lineHeight: 1.8,
    },
    ul: {
      marginLeft: 40,
      marginBottom: 15,
      lineHeight: 1.8,
    },
    li: {
      marginBottom: 15,
      lineHeight: 1.8,
      bulletOffset: 25,
    },
    footer: {
      bottom: 20,
      right: 30,
    },
    slide: {
      padding: 40,
      margin: 20,
    },
    split: {
      gap: 40,
      h1MarginBottom: 20,
      h2MarginBottom: 15,
      liMarginBottom: 12,
    },
  },
  
  // レイアウト
  layout: {
    slide: {
      width: '297mm',
      height: '210mm',
    },
  },
}

// CSS文字列を生成する関数
export function generateSlideStylesCSS(sizeConfig?: import('@/types').SlideSizeConfig): string {
  const c = slideStyleConfig
  
  // サイズ設定が指定されていない場合はデフォルトを使用
  const slideWidth = sizeConfig?.width ?? c.layout.slide.width
  const slideHeight = sizeConfig?.height ?? c.layout.slide.height
  const pageSize = sizeConfig?.pageSize ?? 'A4 landscape'
  const sizeTypeLabel = sizeConfig?.type === '16-9' ? '16:9' : 'A4横向き'
  
  return `/* ${sizeTypeLabel}スライド用スタイル */
body {
    margin: 0;
    padding: 0;
    font-family: 'Hiragino Kaku Gothic Pro', 'Meiryo', sans-serif;
    background: #f0f0f0;
}

.slide {
    width: ${slideWidth};
    height: ${slideHeight};
    min-height: ${slideHeight};
    max-height: ${slideHeight};
    background: white;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    margin: ${c.spacing.slide.margin}px auto;
    padding: ${c.spacing.slide.padding}px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    page-break-after: always;
    page-break-inside: avoid;
    break-after: always;
    break-inside: avoid;
    overflow: hidden;
}

.slide.slide-split {
    flex-direction: column !important;
    justify-content: flex-start !important;
}

.slide-split-content {
    display: flex !important;
    flex-direction: row !important;
    align-items: stretch !important;
    gap: ${c.spacing.split.gap}px !important;
    flex: 1 !important;
}

.slide:last-child {
    page-break-after: auto;
    break-after: auto;
}

/* タイトル（h1タグの代替） */
.slide-title {
    font-size: ${c.fontSize.h1}px;
    color: ${c.colors.h1};
    text-align: center;
    margin-bottom: ${c.spacing.h1.marginBottom}px;
    border-bottom: ${c.spacing.h1.borderBottom}px solid ${c.colors.h1Border};
    padding-bottom: ${c.spacing.h1.paddingBottom}px;
}

/* サブタイトル（h2タグの代替） */
.slide-subtitle {
    font-size: ${c.fontSize.h2}px;
    color: ${c.colors.h2};
    margin-bottom: ${c.spacing.h2.marginBottom}px;
    padding-left: ${c.spacing.h2.paddingLeft}px;
    border-left: ${c.spacing.h2.borderLeft}px solid ${c.colors.h2Border};
}

/* テキスト（pタグの代替） */
.slide-text {
    font-size: ${c.fontSize.p}px;
    line-height: ${c.spacing.p.lineHeight};
    color: ${c.colors.text};
    margin-bottom: ${c.spacing.p.marginBottom}px;
    padding-left: ${c.spacing.p.paddingLeft}px;
}

/* リスト（ulタグの代替） */
.slide-list {
    font-size: ${c.fontSize.ul}px;
    line-height: ${c.spacing.ul.lineHeight};
    color: ${c.colors.text};
    padding-left: ${c.spacing.ul.marginLeft}px;
}

/* リスト項目（liタグの代替） */
.slide-list-item {
    margin-bottom: ${c.spacing.li.marginBottom}px;
    position: relative;
}

.slide-list-item:before {
    content: "▶";
    color: ${c.colors.liBullet};
    font-weight: bold;
    position: absolute;
    left: -${c.spacing.li.bulletOffset}px;
}

.highlight {
    background: linear-gradient(transparent 60%, ${c.colors.highlight} 60%);
    padding: 2px 4px;
}

.center {
    text-align: center;
}

.footer {
    position: absolute;
    bottom: ${c.spacing.footer.bottom}px;
    right: ${c.spacing.footer.right}px;
    font-size: ${c.fontSize.footer}px;
    color: ${c.colors.footer};
}

@media print {
    body { 
        background: white !important;
        margin: 0 !important;
        padding: 0 !important;
    }
    .slide {
        box-shadow: none !important;
        margin: 0 !important;
        width: ${slideWidth} !important;
        height: ${slideHeight} !important;
        min-height: ${slideHeight} !important;
        max-height: ${slideHeight} !important;
        page-break-after: always !important;
        page-break-inside: avoid !important;
        break-after: always !important;
        break-inside: avoid !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        position: relative !important;
        overflow: visible !important;
    }
    
    .slide.slide-split {
        flex-direction: column !important;
        justify-content: flex-start !important;
    }
    
    .slide-split-content {
        display: flex !important;
        flex-direction: row !important;
        align-items: stretch !important;
        gap: ${c.spacing.split.gap}px !important;
        flex: 1 !important;
    }
    .slide:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
    }
}

@page {
    size: ${pageSize};
    margin: 0;
}

.slide-content {
    flex: 1 !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    min-width: 0 !important;
}

.slide-image {
    flex: 1 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    min-width: 0 !important;
}

/* 画像（imgタグの代替） */
.slide-img {
    max-width: 100% !important;
    max-height: 100% !important;
    width: auto !important;
    height: auto !important;
    object-fit: contain !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
}

.slide-image .slide-img {
    max-width: 100% !important;
    max-height: 100% !important;
    width: auto !important;
    height: auto !important;
    object-fit: contain !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
}

/* 分割レイアウトでのテキスト調整 */
.slide-split .slide-title {
    font-size: ${c.fontSize.splitH1}px !important;
    margin-bottom: ${c.spacing.split.h1MarginBottom}px !important;
}

.slide-split .slide-subtitle {
    font-size: ${c.fontSize.splitH2}px !important;
    margin-bottom: ${c.spacing.split.h2MarginBottom}px !important;
}

.slide-split .slide-text {
    font-size: ${c.fontSize.splitP}px !important;
    line-height: 1.6 !important;
}

.slide-split .slide-list {
    font-size: ${c.fontSize.splitUl}px !important;
}

.slide-split .slide-list-item {
    margin-bottom: ${c.spacing.split.liMarginBottom}px !important;
}`
}

