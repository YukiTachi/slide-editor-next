// スライド内コンポーネント（表・グラフ・コードブロック・数式）の基本スタイル
// 元は public/css/slide-styles.css にのみ存在し、プレビュー/PDF出力用のインラインCSSに
// 含まれていなかったため、ここに切り出して両方へ注入する。
// 変更する場合は public/css/slide-styles.css と同期を保つこと。
// カスタムCSSテンプレートが同名クラスを定義した場合に上書きできるよう、
// このCSSは常にテンプレートCSSより前に配置する（getSlideStylesCSS参照）。

export const slideComponentStylesCSS = `
/* ===== 表スタイル ===== */
.slide-table-container {
    margin: 20px 0;
    overflow-x: auto;
}

.slide-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 18px;
    margin: 0 auto;
}

/* シンプルスタイル */
.slide-table-simple {
    border: none;
}

.slide-table-simple th,
.slide-table-simple td {
    padding: 12px;
    text-align: left;
    border: none;
}

/* ボーダー付きスタイル */
.slide-table-bordered {
    border: 2px solid #34495e;
}

.slide-table-bordered th,
.slide-table-bordered td {
    padding: 12px;
    border: 1px solid #bdc3c7;
    text-align: left;
}

/* ストライプスタイル */
.slide-table-striped {
    border: 1px solid #bdc3c7;
}

.slide-table-striped th,
.slide-table-striped td {
    padding: 12px;
    border: 1px solid #bdc3c7;
    text-align: left;
}

.slide-table-striped tbody tr:nth-child(even) {
    background-color: #f8f9fa;
}

/* ヘッダー強調スタイル */
.slide-table-highlight {
    border: 1px solid #bdc3c7;
}

.slide-table-highlight th,
.slide-table-highlight td {
    padding: 12px;
    border: 1px solid #bdc3c7;
    text-align: left;
}

.slide-table-highlight thead {
    background-color: #3498db;
    color: white;
}

.slide-table-highlight thead th {
    font-weight: bold;
    padding: 15px;
}

/* ミニマルスタイル */
.slide-table-minimal {
    border: 1px solid #e0e0e0;
}

.slide-table-minimal th,
.slide-table-minimal td {
    padding: 10px;
    border-bottom: 1px solid #e0e0e0;
}

.slide-table-minimal th {
    border-top: 1px solid #e0e0e0;
}

/* 表のキャプション */
.slide-table-caption {
    font-size: 16px;
    color: #7f8c8d;
    margin-bottom: 10px;
    text-align: center;
    font-style: italic;
}

/* ヘッダーセル（共通） */
.slide-table th {
    font-weight: bold;
    background-color: #ecf0f1;
}

/* データセル（共通） */
.slide-table td {
    background-color: white;
}

/* 分割レイアウトでの表の調整 */
.slide-split .slide-table {
    font-size: 16px;
}

.slide-split .slide-table th,
.slide-split .slide-table td {
    padding: 8px;
}

/* ===== グラフ ===== */
.slide-chart-container {
    margin: 20px 0;
    text-align: center;
    overflow: hidden;
}

.slide-chart-container canvas {
    max-width: 100%;
    height: auto;
}

/* グラフ設定スクリプト（非表示） */
.chart-config {
    display: none;
}

/* 分割レイアウトでのグラフの調整 */
.slide-split .slide-chart-container {
    margin: 10px 0;
}

.slide-split .slide-chart-container canvas {
    max-width: 100%;
    max-height: 300px;
}

/* ===== コードブロック ===== */
.slide-code-block-container {
    margin: 20px 0;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
}

.slide-code-block-default {
    background-color: #f5f5f5;
    border: 1px solid #ddd;
}

.slide-code-block-minimal {
    background-color: transparent;
    border: 1px solid #ddd;
}

.slide-code-block-dark {
    background-color: #2d2d2d;
    color: #f8f8f2;
}

.slide-code-block-transparent {
    background-color: transparent;
    border: none;
}

.slide-code-block-container pre {
    margin: 0;
    padding: 16px;
    overflow-x: auto;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.5;
    border-radius: 6px;
}

.slide-code-block-container code {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 14px;
}

/* 行番号表示 */
.slide-code-block-container pre.line-numbers {
    position: relative;
    padding-left: 3.8em;
    counter-reset: linenumber;
}

.slide-code-block-container pre.line-numbers > code {
    position: relative;
    white-space: inherit;
}

.slide-code-block-container pre.line-numbers .line-numbers-rows {
    position: absolute;
    pointer-events: none;
    top: 0;
    font-size: 100%;
    left: -3.8em;
    width: 3em;
    letter-spacing: -1px;
    border-right: 1px solid #999;
    user-select: none;
    counter-reset: linenumber;
}

.slide-code-block-container pre.line-numbers .line-numbers-rows > span {
    display: block;
    counter-increment: linenumber;
    padding-right: 0.8em;
    text-align: right;
}

.slide-code-block-container pre.line-numbers .line-numbers-rows > span:before {
    content: counter(linenumber);
    color: #999;
    display: block;
    padding-right: 0.8em;
    text-align: right;
}

/* スクロール可能なコードブロック */
.slide-code-block-container[style*="max-height"] pre {
    max-height: inherit;
    overflow-y: auto;
}

/* キャプション */
.slide-code-block-caption {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #666;
    text-align: center;
    padding: 0 16px;
}

.slide-code-block-dark .slide-code-block-caption {
    color: #aaa;
}

/* 分割レイアウトでのコードブロックの調整 */
.slide-split .slide-code-block-container {
    margin: 10px 0;
}

.slide-split .slide-code-block-container pre {
    font-size: 12px;
    padding: 12px;
}

/* ===== 数式（KaTeX） ===== */
.slide-equation-inline {
    display: inline;
    margin: 0 0.2em;
}

.slide-equation-block {
    margin: 1.5rem 0;
    text-align: center;
}

.slide-equation-block-center { text-align: center; }
.slide-equation-block-left   { text-align: left; }
.slide-equation-block-right  { text-align: right; }

.slide-equation-caption {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #7f8c8d;
    text-align: center;
    font-style: italic;
}

.slide-equation-caption-center { text-align: center; }
.slide-equation-caption-left   { text-align: left; }
.slide-equation-caption-right  { text-align: right; }

.slide-equation-error {
    padding: 0.5rem;
    color: #cc0000;
    font-size: 0.875rem;
}
`
