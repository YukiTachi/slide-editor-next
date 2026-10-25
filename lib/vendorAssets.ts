import { VENDOR_VERSIONS } from './vendorManifest.generated'

/**
 * ローカル配信ライブラリ（Chart.js / KaTeX / Prism.js）のURL解決
 *
 * ファイル本体は scripts/copy-vendor-assets.mjs が public/vendor/<パッケージ名>@<バージョン>/ に配置する。
 * 設計の詳細は docs/CDN_LOCAL_BUNDLE_PLAN.md を参照。
 */

/**
 * 配信ベースURL（末尾スラッシュ付きの絶対URL）
 *
 * 処理済みHTMLは src なしの iframe や window.open('') の別ウィンドウに document.write() されるため、
 * 生成元ページの baseURI を基準に絶対化しておく。将来サブパス配信になっても baseURI 基準なら追従できる。
 * document が無い環境（SSG のプリレンダリング時）は root 相対にフォールバックする。
 */
export function getVendorBaseURL(): string {
  if (typeof document === 'undefined') return '/vendor/'
  return new URL('vendor/', document.baseURI).href
}

/** 注入HTMLが参照する各ファイルの絶対URL */
export function getVendorAssetURLs() {
  const base = getVendorBaseURL()
  const chart = `${base}chart.js@${VENDOR_VERSIONS.chartjs}/`
  const katex = `${base}katex@${VENDOR_VERSIONS.katex}/`
  const prism = `${base}prismjs@${VENDOR_VERSIONS.prismjs}/`
  return {
    chartJs: `${chart}chart.umd.min.js`,
    katexJs: `${katex}katex.min.js`,
    katexCss: `${katex}katex.min.css`,
    prismCore: `${prism}components/prism-core.min.js`,
    prismAutoloader: `${prism}plugins/autoloader/prism-autoloader.min.js`,
    prismLineNumbersJs: `${prism}plugins/line-numbers/prism-line-numbers.min.js`,
    prismLineNumbersCss: `${prism}plugins/line-numbers/prism-line-numbers.min.css`,
    prismTheme: `${prism}themes/prism-tomorrow.min.css`,
    /** autoloader が言語定義を遅延ロードするディレクトリ（末尾スラッシュ付き） */
    prismLanguagesPath: `${prism}components/`,
  }
}

/**
 * 注入する <script> / <link> に付ける onerror 属性
 * CDNフォールバックを設けない代わりに、配置ミス・パス解決ミスを Console で気付けるようにする
 */
export const VENDOR_ONERROR_ATTR =
  `onerror="console.error('[vendor] 読み込み失敗:', this.src || this.href)"`
