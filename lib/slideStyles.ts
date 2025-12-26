// スライドスタイルCSS（インライン埋め込み用）
// サーバー側では実際のCSSファイルを読み込み、クライアント側ではフォールバックを使用
import { generateSlideStylesCSS } from './slideStyleConfig'
import type { SlideSizeConfig } from '@/types'

// テンプレート用のCSS（generateSlideStylesCSSには含まれていない）
function getTemplateCSS(): string {
  return `

/* テンプレート用のユーティリティクラス */

/* 標準テンプレート用 */
.template-description {
    margin-top: 40px;
    font-size: 24px;
    padding-left: 20px;
}

.template-hint {
    color: #7f8c8d;
}

/* タイトルページテンプレート用 */
.title-page-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
}

.title-page-title {
    font-size: 48px;
    margin-bottom: 20px;
}

.title-page-subtitle {
    font-size: 32px;
    color: #7f8c8d;
    margin-bottom: 40px;
}

.title-page-meta {
    font-size: 20px;
    color: #95a5a6;
}

/* 画像+テキストテンプレート用 */
.image-placeholder {
    text-align: center;
    color: #95a5a6;
}

/* 2カラムレイアウト用 */
.split {
    display: flex;
    flex-direction: row;
    gap: 40px;
    align-items: flex-start;
    flex: 1;
    margin-top: 20px;
}

.split .left,
.split .right {
    flex: 1;
    min-width: 0;
}

/* クォートテンプレート用 */
.quote-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 80%;
    padding: 40px;
}

.quote-text {
    font-size: 36px;
    font-style: italic;
    text-align: center;
    line-height: 1.6;
    color: #2c3e50;
}

.quote-author {
    font-size: 24px;
    margin-top: 40px;
    color: #7f8c8d;
    text-align: right;
    width: 100%;
}

@media print {
    /* 2カラムレイアウト（印刷時） */
    .split {
        display: flex !important;
        flex-direction: row !important;
        gap: 40px !important;
        align-items: flex-start !important;
        flex: 1 !important;
        margin-top: 20px !important;
    }
    
    .split .left,
    .split .right {
        flex: 1 !important;
        min-width: 0 !important;
    }
}
`
}

// デフォルトCSS: 生成されたCSSにテンプレート用クラスを追加
// クライアント側ではこれを使用し、サーバー側では実際のファイルを読み込む（htmlProcessorで処理）
const slideStylesCSS: string = generateSlideStylesCSS() + getTemplateCSS()

// サイズ設定を受け取れる関数
export function getSlideStylesCSS(sizeConfig?: SlideSizeConfig): string {
  return generateSlideStylesCSS(sizeConfig) + getTemplateCSS()
}

export { slideStylesCSS }

