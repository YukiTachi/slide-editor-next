// PDFエクスポート（印刷ダイアログ方式）
// 設計の詳細は docs/PDF_EXPORT_PLAN.md を参照
import { processHTMLForPreviewAsync } from './htmlProcessor'
import { extractSlides, extractSingleSlideHTML } from './slideReorder'
import { getPrintPageCSS } from './slideSizeConfig'
import type { SlideSizeConfig, CSSDesignTemplate } from '@/types'

// 出力範囲（docs/PDF_EXPORT_RANGE_PLAN.md）。'current' はカーソル位置のスライド 1 枚だけ
export type PDFExportRange = 'all' | 'current'

export interface PDFExportOptions {
  fileName?: string                    // 既定: `スライド_YYYY-MM-DD`（1 枚出力時は `_pN` 付き。document.titleに設定）
  timeoutMs?: number                   // レンダリング待機全体の上限（共有deadline）
  onStatus?: (message: string) => void // ステータスバー連携
  slideIndex?: number                  // 指定時はそのスライド（0 始まり）だけを出力する。未指定は全スライド
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

  let trimmedContent = htmlContent.trim()
  if (!trimmedContent) return

  // 範囲指定: 他のスライドを取り除いた 1 枚分の HTML に差し替える（<head> やスライド外の内容はそのまま）。
  // isExporting を立てる前に行い、範囲外で失敗してもフラグが残らないようにする
  const slideIndex = options?.slideIndex
  let slideLabel = ''
  if (slideIndex !== undefined) {
    const total = extractSlides(trimmedContent).length
    const single = extractSingleSlideHTML(trimmedContent, slideIndex)
    if (single === null) {
      throw new Error(`スライド ${slideIndex + 1} が見つかりません（全 ${total} 枚）`)
    }
    trimmedContent = single
    slideLabel = `（スライド ${slideIndex + 1} / ${total}）`
  }

  isExporting = true
  const onStatus = options?.onStatus
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  let iframe: HTMLIFrameElement | null = null
  let restoreTitle: (() => void) | null = null

  try {
    onStatus?.(`PDFを準備中…${slideLabel}`)

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
    // 初期高さは「枚数 ×（スライド高さ + 画面用margin 20px×2）」の概算。
    // write中に走るChart.js初期化がクリップされないための保険で、load後にscrollHeight実測で上書きする
    const slideCount = Math.max(1, extractSlides(trimmedContent).length)
    iframe.style.height = `calc(${slideCount} * (${sizeConfig.height} + 40px))`
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

    // 「PDFに保存」のデフォルトファイル名: Chrome/Edge は iframe の print() でも印刷文書ではなく
    // 最上位（親ページ）の document.title を使う（実機で確認。docs/PDF_EXPORT_RANGE_PLAN.md 2.8）。
    // 印刷中だけ親の title をファイル名に差し替え、後片付けで元に戻す。印刷文書の title も同じ値にしておく
    const fileName = options?.fileName ?? getDefaultFileName(slideIndex)
    printDoc.title = fileName
    const originalTitle = document.title
    document.title = fileName
    restoreTitle = () => { document.title = originalTitle }

    onStatus?.('印刷ダイアログで保存先に「PDFに保存」を選択してください')
    scheduleCleanup(iframe, printWindow, restoreTitle)
    printWindow.focus()
    printWindow.print()
  } catch (error) {
    // 失敗時は即座に後片付けして再実行可能な状態に戻す
    if (iframe) {
      removeIframe(iframe)
    }
    restoreTitle?.()
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
function scheduleCleanup(iframe: HTMLIFrameElement, printWindow: Window, restoreTitle: () => void): void {
  let done = false
  let delayTimer: ReturnType<typeof setTimeout> | undefined

  const cleanup = () => {
    if (done) return
    done = true
    clearTimeout(fallbackTimer)
    if (delayTimer !== undefined) clearTimeout(delayTimer)
    removeIframe(iframe)
    restoreTitle() // 親ページの title をファイル名から元に戻す
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

/** 既定ファイル名。全スライドは `スライド_YYYY-MM-DD`、1 枚出力は `スライド_YYYY-MM-DD_p3`（1 始まりのスライド番号） */
function getDefaultFileName(slideIndex?: number): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const suffix = slideIndex !== undefined ? `_p${slideIndex + 1}` : ''
  return `スライド_${y}-${m}-${d}${suffix}`
}

/**
 * 印刷CSSを<style>として注入する。
 * 末尾に<script>が注入されるHTMLでは最後の .slide が :last-child にならないため、
 * 末尾空白ページ対策は :last-of-type で行う。
 */
function injectPrintCSS(htmlContent: string, sizeConfig: SlideSizeConfig): string {
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
${getPrintPageCSS(sizeConfig)}`
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
 * 各waitはdeadline到達で打ち切って続行する（ライブラリ読込失敗（配置ミス等）でも他要素の出力を止めない）。
 * 前提: waitForDocumentReady() 済みのiframeを受け取る。
 */
async function waitForRenderComplete(iframe: HTMLIFrameElement, deadline: number): Promise<void> {
  const doc = iframe.contentDocument
  const win = doc?.defaultView // ★ Chart.js等はiframe内に読み込まれるため、待機対象はiframe側のwindow
  if (!doc || !win) return

  await waitForImages(doc, deadline)
  await waitForCharts(win, doc, deadline)
  await waitForKaTeX(win, doc, deadline)
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
    if (chartGlobal && typeof chartGlobal.getChart === 'function') {
      if (canvases.every((canvas) => chartGlobal.getChart(canvas) !== undefined)) return true
    }
    // グラフ初期化スクリプトはパース時に同期実行されるため、文書読込が完了していれば
    // 以後インスタンスは増えない（ライブラリ読込失敗や設定JSON不正のcanvas）。deadlineまで待たずに打ち切る
    return doc.readyState === 'complete'
  }, deadline)
}

async function waitForKaTeX(win: Window, doc: Document, deadline: number): Promise<void> {
  // data-latexが空の要素はレンダラーがスキップするため待機対象にしない
  const equations = Array.from(
    doc.querySelectorAll('.slide-equation-inline[data-latex], .slide-equation-block[data-latex]')
  ).filter((el) => (el.getAttribute('data-latex') || '').trim() !== '')
  if (equations.length === 0) return

  // レンダリング成功（.katex）またはエラー表示（.slide-equation-error）まで待つ
  await pollUntil(() => {
    if (equations.every((el) => el.querySelector('.katex, .slide-equation-error') !== null)) return true
    // 文書読込完了後もKaTeX本体が存在しなければライブラリ読込失敗（配置ミス等）であり、以後描画されない
    return doc.readyState === 'complete' && !(win as any).katex
  }, deadline)
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
