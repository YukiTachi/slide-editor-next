// PDFエクスポート（印刷ダイアログ方式）
// 設計の詳細は docs/PDF_EXPORT_PLAN.md を参照
import { processHTMLForPreviewAsync } from './htmlProcessor'
import type { SlideSizeConfig, CSSDesignTemplate } from '@/types'

export interface PDFExportOptions {
  fileName?: string                    // 既定: `スライド_YYYY-MM-DD`（document.titleに設定）
  timeoutMs?: number                   // レンダリング待機全体の上限（共有deadline）
  onStatus?: (message: string) => void // ステータスバー連携
}

const DEFAULT_TIMEOUT_MS = 15000
const CLEANUP_DELAY_MS = 1000      // afterprint後、破棄までの遅延（Safariはダイアログ表示前に発火し得るため）
const CLEANUP_FALLBACK_MS = 60000  // afterprintが来ない環境向けの上限タイマー（通常経路にはしない）
const POLL_INTERVAL_MS = 50

// 多重起動防止フラグ（ボタン連打でiframe/printが多重に走らないようにする）
let isExporting = false

/**
 * スライドを印刷ダイアログ経由でPDF出力する。
 * プレビューと同一のHTML処理パイプライン（processHTMLForPreviewAsync）を通すため、見た目が一致する。
 */
export async function exportToPDF(
  htmlContent: string,
  sizeConfig: SlideSizeConfig,
  template?: CSSDesignTemplate,
  options?: PDFExportOptions
): Promise<void> {
  if (isExporting) return

  const trimmedContent = htmlContent.trim()
  if (!trimmedContent) return

  isExporting = true
  const onStatus = options?.onStatus
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  let iframe: HTMLIFrameElement | null = null

  try {
    onStatus?.('PDFを準備中…')

    // グラフのフェードインアニメーション中に印刷されると中間状態が写るため無効化する
    let processedHTML = await processHTMLForPreviewAsync(trimmedContent, sizeConfig, template, {
      disableAnimation: true,
    })
    // 印刷CSSはテンプレート由来CSSに依存せず常に独立注入する
    // （カスタムCSSテンプレートにはサイズ上書きしか乗らないため）
    processedHTML = injectPrintCSS(processedHTML, sizeConfig)

    // Chart.jsは responsive: true のため、0×0のコンテナではcanvasが空のまま印刷される。
    // 実寸のままオフスクリーンに置く。display:none も印刷内容が空になるため不可。
    iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.left = '-10000px'
    iframe.style.top = '0'
    iframe.style.width = sizeConfig.width // px換算せずCSS値をそのまま使う
    iframe.style.height = sizeConfig.height
    iframe.style.border = '0'
    iframe.setAttribute('aria-hidden', 'true')
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    if (!doc) {
      throw new Error('印刷用iframeのdocumentを取得できませんでした')
    }
    doc.open()
    doc.write(processedHTML)
    doc.close()

    const deadline = Date.now() + timeoutMs
    await waitForDocumentReady(iframe, deadline)

    const printDoc = iframe.contentDocument
    const printWindow = iframe.contentWindow
    if (!printDoc || !printWindow) {
      throw new Error('印刷用iframeの初期化に失敗しました')
    }

    // 画面用CSSの .slide { margin: 20px auto } が乗るため、全スライドの実高さを測って
    // iframeの高さを設定し直す。足りないと下方のスライドがクリップされcanvasが潰れる。
    iframe.style.height = `${printDoc.documentElement.scrollHeight}px`

    await waitForRenderComplete(iframe, deadline)

    // Chrome/Edgeは document.title を「PDFに保存」のデフォルトファイル名に使う
    printDoc.title = options?.fileName ?? getDefaultFileName()

    onStatus?.('印刷ダイアログで保存先に「PDFに保存」を選択してください')
    scheduleCleanup(iframe, printWindow)
    printWindow.focus()
    printWindow.print()
  } catch (error) {
    // 失敗時は即座に後片付けして再実行可能な状態に戻す
    if (iframe) {
      removeIframe(iframe)
    }
    isExporting = false
    onStatus?.('')
    throw error
  }
}

/**
 * 後片付けの2段構え:
 * 1. afterprint受信 → 短い遅延後にiframe破棄・フラグ解除（通常経路）
 * 2. afterprintが来ない環境向けの上限タイマー（保険。afterprint経路で解除されたらクリア）
 * ダイアログ表示中の破棄は出力を壊すため、即時破棄はしない。
 */
function scheduleCleanup(iframe: HTMLIFrameElement, printWindow: Window): void {
  let done = false
  let delayTimer: ReturnType<typeof setTimeout> | undefined

  const cleanup = () => {
    if (done) return
    done = true
    clearTimeout(fallbackTimer)
    if (delayTimer !== undefined) clearTimeout(delayTimer)
    removeIframe(iframe)
    isExporting = false
  }

  const fallbackTimer = setTimeout(cleanup, CLEANUP_FALLBACK_MS)

  printWindow.addEventListener('afterprint', () => {
    if (delayTimer === undefined) {
      delayTimer = setTimeout(cleanup, CLEANUP_DELAY_MS)
    }
  })
}

function removeIframe(iframe: HTMLIFrameElement): void {
  if (iframe.parentNode) {
    iframe.parentNode.removeChild(iframe)
  }
}

function getDefaultFileName(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `スライド_${y}-${m}-${d}`
}

/**
 * 印刷CSSを<style>として注入する。
 * 末尾に<script>が注入されるHTMLでは最後の .slide が :last-child にならないため、
 * 末尾空白ページ対策は :last-of-type で行う。
 */
function injectPrintCSS(htmlContent: string, sizeConfig: SlideSizeConfig): string {
  const pageSize = sizeConfig.pageSize ?? `${sizeConfig.width} ${sizeConfig.height}`
  const printCSS = `
@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    margin: 0 !important;
    padding: 0 !important;
  }
  .slide {
    margin: 0 !important;
    box-shadow: none !important;
    overflow: visible !important;
    break-after: page !important;
    page-break-after: always !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  .slide:last-of-type {
    break-after: auto !important;
    page-break-after: auto !important;
  }
  /* スクロールバーの描画をPDFに写さない（はみ出しコンテンツのクリップ自体はプレビューと同じ挙動を維持） */
  ::-webkit-scrollbar {
    display: none !important;
  }
}
@page {
  size: ${pageSize};
  margin: 0;
}
`
  const styleTag = `<style data-pdf-export-print>${printCSS}</style>`

  if (/<\/head>/i.test(htmlContent)) {
    return htmlContent.replace(/<\/head>/i, `${styleTag}</head>`)
  }
  if (/<\/body>/i.test(htmlContent)) {
    return htmlContent.replace(/<\/body>/i, `${styleTag}</body>`)
  }
  return htmlContent + styleTag
}

/**
 * document.write後のパース・同期スクリプト完了（readyState === 'complete'）を待つ。
 * about:blankのloadは二重発火し得るため、イベントではなくreadyStateのポーリングで判定する。
 */
async function waitForDocumentReady(iframe: HTMLIFrameElement, deadline: number): Promise<void> {
  await pollUntil(() => iframe.contentDocument?.readyState === 'complete', deadline)
}

/**
 * リッチ要素のレンダリング完了を待つ（共有deadline方式）。
 * 各waitはdeadline到達で打ち切って続行する（CDN不達などでも他要素の出力を止めない）。
 * 前提: waitForDocumentReady() 済みのiframeを受け取る。
 */
async function waitForRenderComplete(iframe: HTMLIFrameElement, deadline: number): Promise<void> {
  const doc = iframe.contentDocument
  const win = doc?.defaultView // ★ Chart.js等はiframe内に読み込まれるため、待機対象はiframe側のwindow
  if (!doc || !win) return

  await waitForImages(doc, deadline)
  await waitForCharts(win, doc, deadline)
  await waitForKaTeX(doc, deadline)
  await waitForPrism(win, doc, deadline)
  // KaTeXのwebfontは描画後に読み込みが始まるため、fonts.readyはリッチ要素の後に待つ
  await race(doc.fonts.ready.then(() => undefined), deadline)
  // 描画反映の保険
  await delay(300)
}

async function waitForImages(doc: Document, deadline: number): Promise<void> {
  const images = Array.from(doc.querySelectorAll('img'))
  const pending = images.filter((img) => !img.complete)
  if (pending.length === 0) return

  await race(
    Promise.all(
      pending.map(
        (img) =>
          new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true }) // エラーでも続行
          })
      )
    ).then(() => undefined),
    deadline
  )
}

async function waitForCharts(win: Window, doc: Document, deadline: number): Promise<void> {
  const canvases = Array.from(doc.querySelectorAll<HTMLCanvasElement>('.slide-chart-container canvas'))
  if (canvases.length === 0) return

  await pollUntil(() => {
    const chartGlobal = (win as any).Chart
    if (!chartGlobal || typeof chartGlobal.getChart !== 'function') return false
    return canvases.every((canvas) => chartGlobal.getChart(canvas) !== undefined)
  }, deadline)
}

async function waitForKaTeX(doc: Document, deadline: number): Promise<void> {
  const equations = Array.from(
    doc.querySelectorAll('.slide-equation-inline[data-latex], .slide-equation-block[data-latex]')
  )
  if (equations.length === 0) return

  // レンダリング成功（.katex）またはエラー表示（.slide-equation-error）まで待つ
  await pollUntil(
    () => equations.every((el) => el.querySelector('.katex, .slide-equation-error') !== null),
    deadline
  )
}

async function waitForPrism(win: Window, doc: Document, deadline: number): Promise<void> {
  const codeBlocks = doc.querySelectorAll('.slide-code-block-container code')
  if (codeBlocks.length === 0) return

  // .token 子要素は plaintext 指定や autoloader の言語遅延ロードで現れないことがあるため待たない。
  // Prism本体の読み込みと初期ハイライト（DOMContentLoaded + 100ms後）の分だけ短い猶予を取る。
  const grace = Math.min(deadline, Date.now() + 3000)
  await pollUntil(() => Boolean((win as any).Prism), grace)
  await delay(Math.min(300, remaining(deadline)))
}

// --- 待機ユーティリティ ---

function remaining(deadline: number): number {
  return Math.max(0, deadline - Date.now())
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** deadline到達で打ち切るpromise race（打ち切り時もresolveして続行する） */
function race(promise: Promise<void>, deadline: number): Promise<void> {
  return Promise.race([promise, delay(remaining(deadline))])
}

/** 条件成立までポーリングする。deadline到達で打ち切りfalseを返す */
async function pollUntil(condition: () => boolean, deadline: number): Promise<boolean> {
  while (!condition()) {
    if (Date.now() >= deadline) return false
    await delay(Math.min(POLL_INTERVAL_MS, remaining(deadline)))
  }
  return true
}
