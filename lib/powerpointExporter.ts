// PowerPointエクスポート（pptxgenjsによる編集可能なpptx生成）
// 設計の詳細は docs/POWERPOINT_EXPORT_PLAN.md を参照
// 対応コンテンツ: テキスト（title/subtitle/text/list）・画像・表・グラフ・数式・コードブロック
// テンプレート色の反映はPhase 4で対応予定
import { getImageFromStorage } from './imageStorage'
import type {
  SlideSizeConfig,
  CSSDesignTemplate,
  ChartConfig,
  CodeBlockStyle,
  PowerPointExportConfig,
  PptxRegion,
  PptxSlideElement,
  PptxPageGeometry,
  TableStyle,
} from '@/types'

// pptxgenjs既定のArialでは日本語が崩れるため、全addTextで必ず指定する
const FONT_FACE = 'Yu Gothic'

// 役割ごとの既定フォントサイズ（pt）
const FONT_SIZE = {
  title: 32,
  subtitle: 24,
  body: 18,
  table: 14,
  caption: 14,
} as const

const ELEMENT_GAP = 0.15  // 要素間の縦マージン（インチ）
const IMAGE_FETCH_TIMEOUT_MS = 10000  // 外部URL画像の取得タイムアウト
const TABLE_ROW_H = 0.35  // 表1行の高さ概算（インチ、14pt + パディング）
const MASTER_NAME = 'SLIDE_MASTER'

// slide-table-{style} のCSS（lib/slideComponentStyles.ts）に対応するpptx表スタイル
const TABLE_STYLE_DEFS: Record<TableStyle, {
  border: { type: 'solid' | 'none'; pt: number; color: string }
  headerFill?: string   // ヘッダー行の背景色
  headerColor?: string  // ヘッダー行の文字色
  stripeFill?: string   // 偶数行の背景色（striped）
}> = {
  simple:    { border: { type: 'none', pt: 0, color: 'FFFFFF' } },
  bordered:  { border: { type: 'solid', pt: 1, color: 'BDC3C7' } },
  striped:   { border: { type: 'solid', pt: 0.5, color: 'BDC3C7' }, stripeFill: 'F8F9FA' },
  highlight: { border: { type: 'solid', pt: 0.5, color: 'BDC3C7' }, headerFill: '3498DB', headerColor: 'FFFFFF' },
  minimal:   { border: { type: 'solid', pt: 0.5, color: 'E0E0E0' } },
}
const TABLE_STYLE_NAMES = Object.keys(TABLE_STYLE_DEFS) as TableStyle[]

const CODE_FONT_FACE = 'Consolas'  // コードは等幅フォント
const CODE_FONT_SIZE = 12

// slide-code-block-{style} のCSS（lib/slideComponentStyles.ts）に対応するpptxスタイル
// シンタックスハイライトの配色は再現しない（計画書7.6の制約）
const CODE_STYLE_DEFS: Record<CodeBlockStyle, {
  fill?: string     // 背景色
  color: string     // 文字色
  border?: string   // 枠線色
}> = {
  default:     { fill: 'F5F5F5', color: '333333', border: 'DDDDDD' },
  minimal:     { color: '333333', border: 'DDDDDD' },
  dark:        { fill: '2D2D2D', color: 'F8F8F2' },
  transparent: { color: '333333' },
}
const CODE_STYLE_NAMES = Object.keys(CODE_STYLE_DEFS) as CodeBlockStyle[]

// 多重起動防止フラグ（ボタン連打で生成が多重に走らないようにする）
let isExporting = false

/**
 * sizeConfigからページ寸法（インチ）を計算する。全座標計算の基準
 */
export function getPageGeometry(sizeConfig: SlideSizeConfig): PptxPageGeometry {
  return sizeConfig.type === '16-9'
    ? { w: 13.33, h: 7.5, margin: 0.5 }   // PowerPoint既定のLAYOUT_WIDE
    : { w: 11.69, h: 8.27, margin: 0.5 }  // A4横向き
}

// 配置先の判定（slide-splitとtwo-columnの2系統）
// .slide-split / .slide-split-content 自体は領域判定に使わない
// （.slide-split-contentは左右両方を包む親。タイトルはその外＝full）
function regionOf(el: Element): PptxRegion {
  if (el.closest('.slide-content, .left')) return 'left'   // splitテキスト側 / two-column左
  if (el.closest('.slide-image, .right')) return 'right'   // split画像側 / two-column右
  return 'full'
}

// regionからx / wを計算（full: 全幅、left / right: 半幅）
function regionBox(region: PptxRegion, geo: PptxPageGeometry): { x: number; w: number } {
  const innerW = geo.w - geo.margin * 2
  if (region === 'left') return { x: geo.margin, w: innerW / 2 - 0.1 }
  if (region === 'right') return { x: geo.margin + innerW / 2 + 0.1, w: innerW / 2 - 0.1 }
  return { x: geo.margin, w: innerW }
}

/**
 * スライドHTMLを解析してPowerPoint用の要素リストを抽出する。
 * 役割はテンプレートのクラス名（.slide-title等）で判定し、クラスなしのタグはフォールバック。
 * 要素はドキュメント順で返す
 */
export function parseSlideHTML(slideHTML: string): PptxSlideElement[] {
  const elements: PptxSlideElement[] = []
  const doc = new DOMParser().parseFromString(slideHTML, 'text/html')

  // 本文として扱わない要素を除去（フッターのページ番号はslideNumberで出す）
  // ※ グラフ設定JSON（script.chart-config）は抽出に使うため除去対象から外す
  doc.querySelectorAll('script:not(.chart-config), style, .footer').forEach(el => el.remove())

  // インライン数式はエディタHTML上では空のspan（KaTeX描画はプレビュー側で行われる）。
  // removeすると段落が分断されるため、LaTeXソースを流し込んで段落の一部として残す
  doc.querySelectorAll('span.slide-equation-inline[data-latex]').forEach(span => {
    if (!span.textContent?.trim()) {
      span.textContent = ` ${span.getAttribute('data-latex') ?? ''} `
    }
  })

  doc.querySelectorAll(
    'h1, h2, p, ul, ol, img, table, .slide-chart-container, .slide-code-block-container, .slide-equation-block, .slide-equation-caption'
  ).forEach(el => {
    const region = regionOf(el)

    if (el.matches('.slide-chart-container')) {
      const config = el.querySelector('script.chart-config')?.textContent?.trim()
      if (config) elements.push({ type: 'chart', region, content: config })
      return
    }

    if (el.matches('.slide-code-block-container')) {
      // エディタHTML上のコードはエスケープ済みテキスト（Prismのハイライトはプレビュー側）。
      // textContentでプレーンテキストとして取得する
      const code = (el.querySelector('pre')?.textContent ?? '').replace(/\s+$/, '')
      if (code) {
        const codeStyle = CODE_STYLE_NAMES.find(name => el.classList.contains(`slide-code-block-${name}`)) ?? 'default'
        elements.push({ type: 'code', region, content: code, codeStyle })
      }
      // キャプションはコードの直後のテキストとして出力（HTMLでもpreの後に置かれる）
      const caption = el.querySelector('.slide-code-block-caption')?.textContent?.trim()
      if (caption) {
        elements.push({ type: 'text', region, content: caption, style: { fontSize: FONT_SIZE.caption, italic: true } })
      }
      return
    }

    if (el.matches('.slide-equation-block')) {
      // ブロック数式もエディタHTML上は空div。元のLaTeXソースがdata-latex属性に保存済み
      const latex = el.getAttribute('data-latex')?.trim()
      if (latex) {
        const alignment = (el.getAttribute('data-alignment') as 'left' | 'center' | 'right' | null) ?? 'center'
        elements.push({ type: 'equation', region, content: latex, style: { alignment } })
      }
      return
    }

    if (el.matches('.slide-equation-caption')) {
      // 数式キャプションはブロック数式の兄弟要素として置かれる
      const caption = el.textContent?.trim()
      if (caption) {
        const alignment = (['left', 'center', 'right'] as const)
          .find(a => el.classList.contains(`slide-equation-caption-${a}`)) ?? 'center'
        elements.push({ type: 'text', region, content: caption, style: { fontSize: FONT_SIZE.caption, italic: true, alignment } })
      }
      return
    }

    if (el.matches('img')) {
      const src = el.getAttribute('src') ?? ''
      if (src) elements.push({ type: 'image', region, content: src })
      return
    }

    if (el.matches('table')) {
      // 抽出時点でstring[][]に構造化する（HTMLの持ち回り・再パースを避ける）
      const rows = Array.from(el.querySelectorAll('tr'))
        .map(tr => Array.from(tr.querySelectorAll('th, td')).map(cell => cell.textContent?.trim() ?? ''))
        .filter(cells => cells.length > 0)
      if (rows.length === 0) return

      // キャプションは表の直前のテキストとして出力
      const caption = el.querySelector('caption')?.textContent?.trim()
      if (caption) {
        elements.push({ type: 'text', region, content: caption, style: { fontSize: FONT_SIZE.caption, italic: true } })
      }

      const hasHeaderRow = el.querySelector('thead th, thead td, tr:first-child th') !== null
      const tableStyle = TABLE_STYLE_NAMES.find(name => el.classList.contains(`slide-table-${name}`)) ?? 'bordered'
      elements.push({ type: 'table', region, content: '', rows, tableStyle, hasHeaderRow })
      return
    }

    // 表のセル内テキストは表として取得済みのため二重に拾わない
    if (el.closest('table')) return

    if (el.matches('ul, ol')) {
      const items = Array.from(el.querySelectorAll('li'))
        .map(li => li.textContent?.trim() ?? '')
        .filter(Boolean)
      if (items.length > 0) {
        elements.push({ type: 'list', region, content: '', items })
      }
      return
    }

    // リスト内の段落はリスト項目として取得済みのため二重に拾わない
    if (el.closest('ul, ol')) return

    const content = el.textContent?.trim() ?? ''
    if (!content) return

    if (el.matches('.slide-title, h1')) {
      // .slide-titleのCSSはtext-align: center（lib/slideStyleConfig.ts）
      elements.push({ type: 'text', region, content, style: { fontSize: FONT_SIZE.title, bold: true, alignment: 'center' } })
    } else if (el.matches('.slide-subtitle, h2')) {
      elements.push({ type: 'text', region, content, style: { fontSize: FONT_SIZE.subtitle } })
    } else {
      elements.push({ type: 'text', region, content, style: { fontSize: FONT_SIZE.body } })
    }
  })

  return elements
}

// 画像srcをdata URIに解決する。解決できない場合はnull（呼び出し側で警告してスキップ）
async function resolveImageData(src: string): Promise<string | null> {
  if (src.startsWith('data:image/')) return src
  if (src.startsWith('images/')) {
    return getImageFromStorage(src.slice('images/'.length))
  }
  // 外部URL: CORS制限で取得できないことがある（計画書7.2の方針どおり警告してスキップ）。
  // 応答しないURLでエクスポートが固まらないようタイムアウトを設ける
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS) })
    if (!res.ok) return null
    const blob = await res.blob()
    if (!blob.type.startsWith('image/')) return null
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// data URI画像の実寸（px）を取得。デコードできない場合はnull
function measureImage(dataUri: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve(null)
    img.src = dataUri
  })
}

// 方式Aでネイティブ変換できるグラフタイプ（それ以外はchartRendererで画像化する方式B）
const NATIVE_CHART_TYPES = ['bar', 'line', 'pie', 'doughnut', 'radar'] as const
type NativeChartType = (typeof NATIVE_CHART_TYPES)[number]

function isNativeChartType(type: ChartConfig['type']): type is NativeChartType {
  return (NATIVE_CHART_TYPES as readonly string[]).includes(type)
}

// CSS色をpptxgenjsのRRGGBB形式へ変換。変換できない場合はnull
function toPptxColor(color: string | undefined): string | null {
  if (!color) return null
  const hex = color.trim().match(/^#?([0-9a-fA-F]{6})$/)
  if (hex) return hex[1].toUpperCase()
  const rgb = color.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgb) {
    return rgb.slice(1).map(v => Number(v).toString(16).padStart(2, '0')).join('').toUpperCase()
  }
  return null
}

// Chart.jsの設定から系列色を取り出す。1つでも変換できない色があればnull（pptx既定色に任せる）
function extractChartColors(config: ChartConfig): string[] | null {
  const { type, data } = config
  const raw: (string | undefined)[] = (type === 'pie' || type === 'doughnut')
    // 円系は1系列で、要素ごとの色が先頭データセットのbackgroundColor配列に入っている
    ? (Array.isArray(data.datasets[0]?.backgroundColor) ? data.datasets[0].backgroundColor : [])
    : data.datasets.map(ds => {
        const bg = Array.isArray(ds.backgroundColor) ? ds.backgroundColor[0] : ds.backgroundColor
        const border = Array.isArray(ds.borderColor) ? ds.borderColor[0] : ds.borderColor
        return type === 'line' ? (border ?? bg) : (bg ?? border)
      })
  if (raw.length === 0) return null
  const colors = raw.map(toPptxColor)
  return colors.every((c): c is string => c !== null) ? colors : null
}

// 方式B: chartRenderer（プレビューと同じChart.js）でオフスクリーン描画してPNG化する
async function renderChartToImage(config: ChartConfig): Promise<string | null> {
  try {
    const { renderChart } = await import('./chartRenderer')
    const canvas = document.createElement('canvas')
    canvas.width = config.width ?? 800
    canvas.height = config.height ?? 500
    // Chart.jsのレイアウト計算が動くよう、画面外でDOMに一時追加する
    canvas.style.cssText = 'position:fixed;left:-10000px;top:0;'
    document.body.appendChild(canvas)
    try {
      // disableAnimation必須: 生成時にanimation:falseの場合のみ同期描画される
      const chart = renderChart(
        canvas,
        { ...config, options: { ...config.options, responsive: false, maintainAspectRatio: false } },
        { disableAnimation: true }
      )
      if (!chart) return null
      const dataUri = canvas.toDataURL('image/png')
      chart.destroy()
      return dataUri
    } finally {
      canvas.remove()
    }
  } catch (error) {
    console.warn('PowerPoint出力: グラフのオフスクリーン描画に失敗:', error)
    return null
  }
}

// テキストボックスの高さ概算（インチ）。明示的な改行に加え、ボックス幅と
// フォントサイズから折り返し行数を見積もる（全角1文字≒fontSize幅として概算。
// 半角混じりでは行数を多めに見積もるが、重なりを防ぐ方向なので許容）
function estimateHeight(text: string, fontSize: number, boxW: number): number {
  const charW = fontSize / 72
  const charsPerLine = Math.max(1, Math.floor(boxW / charW))
  const lines = text
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0)
  return (fontSize / 72) * 1.5 * lines + 0.1
}

/**
 * HTMLスライドをPowerPoint（.pptx）としてダウンロードする。
 * スライドサイズはエディタの現在の設定（sizeConfig）に追従する
 */
export async function exportToPowerPoint(
  htmlContent: string,
  sizeConfig: SlideSizeConfig,
  template?: CSSDesignTemplate,
  config?: PowerPointExportConfig
): Promise<void> {
  if (isExporting) return

  const trimmedContent = htmlContent.trim()
  if (!trimmedContent) return

  // templateはPhase 4（テンプレート色の反映）で使用する
  void template

  isExporting = true
  try {
    // クリック時にdynamic import（初期バンドルを肥やさない）
    const { default: PptxGenJS } = await import('pptxgenjs')
    const pptx = new PptxGenJS()
    const geo = getPageGeometry(sizeConfig)

    if (sizeConfig.type === '16-9') {
      pptx.layout = 'LAYOUT_WIDE'
    } else {
      pptx.defineLayout({ name: 'A4_LANDSCAPE', width: geo.w, height: geo.h })
      pptx.layout = 'A4_LANDSCAPE'
    }

    // ページ番号はフッターのテキストではなくスライドマスターのslideNumberで出す
    const includePageNumbers = config?.includePageNumbers ?? true
    pptx.defineSlideMaster({
      title: MASTER_NAME,
      background: { color: 'FFFFFF' },
      ...(includePageNumbers
        ? {
            slideNumber: {
              x: geo.w - 1.0,
              y: geo.h - 0.4,
              fontFace: FONT_FACE,
              fontSize: 10,
              color: '7F8C8D',
            },
          }
        : {}),
    })

    // スライド分割はDOMParserで行う（extractSlidesのregexはclass="slide slide-split"にマッチしないため）
    const doc = new DOMParser().parseFromString(trimmedContent, 'text/html')
    const slideNodes = Array.from(doc.querySelectorAll('div.slide'))
    if (slideNodes.length === 0) {
      throw new Error('スライド（<div class="slide">）が見つかりません')
    }

    for (const slideNode of slideNodes) {
      const pptxSlide = pptx.addSlide({ masterName: MASTER_NAME })

      // regionごとの縦位置カーソル（縦積みパッキング）
      const yCursor: Record<PptxRegion, number> = {
        full: geo.margin,
        left: geo.margin,
        right: geo.margin,
      }

      for (const el of parseSlideHTML(slideNode.outerHTML)) {
        const box = regionBox(el.region, geo)
        let h: number

        if (el.type === 'image') {
          const data = await resolveImageData(el.content)
          if (!data) {
            console.warn('PowerPoint出力: 画像を取得できないためスキップしました:', el.content)
            continue
          }
          // 96dpi換算の原寸を基準に、カラム幅と残り高さに収まるよう縮小（拡大はしない）
          const px = await measureImage(data)
          const naturalW = px ? px.w / 96 : box.w
          const naturalH = px ? px.h / 96 : box.w * 0.75
          const availH = Math.max(geo.h - geo.margin - yCursor[el.region], 0.5)
          const scale = Math.min(box.w / naturalW, availH / naturalH, 1)
          const w = naturalW * scale
          h = naturalH * scale
          pptxSlide.addImage({
            data,
            x: box.x + (box.w - w) / 2,  // カラム内で中央寄せ
            y: yCursor[el.region],
            w,
            h,
          })
        } else if (el.type === 'text' || el.type === 'list') {
          const text = el.type === 'list' ? (el.items ?? []).join('\n') : el.content
          if (!text) continue

          const fontSize = el.style?.fontSize ?? FONT_SIZE.body
          h = estimateHeight(text, fontSize, box.w)

          pptxSlide.addText(text, {
            x: box.x,
            y: yCursor[el.region],
            w: box.w,
            h,
            fontSize,
            bold: el.style?.bold ?? false,
            italic: el.style?.italic ?? false,
            align: el.style?.alignment ?? 'left',
            valign: 'top',
            fontFace: FONT_FACE,
            ...(el.type === 'list' ? { bullet: true } : {}),
          })
        } else if (el.type === 'chart') {
          let chartConfig: ChartConfig
          try {
            chartConfig = JSON.parse(el.content) as ChartConfig
          } catch {
            console.warn('PowerPoint出力: グラフ設定JSONを解析できないためスキップしました')
            continue
          }

          // 表示サイズ: 元のcanvas比率をカラム幅に当てはめ、残り高さに収まるよう縮小
          const aspect = (chartConfig.height ?? 500) / (chartConfig.width ?? 800)
          const availH = Math.max(geo.h - geo.margin - yCursor[el.region], 1.5)
          h = Math.min(box.w * aspect, availH)
          const chartW = Math.min(box.w, h / aspect)
          const chartX = box.x + (box.w - chartW) / 2

          const chartType = chartConfig.type
          if (isNativeChartType(chartType)) {
            // 方式A: 設定JSON → addChart（PowerPoint上でデータ編集可能なネイティブグラフ）
            const isCircular = chartType === 'pie' || chartType === 'doughnut'
            // データ形の変換: Chart.jsの{labels, datasets[].data} → pptxgenjsの{name, labels, values}[]
            const series = isCircular
              ? [{
                  name: chartConfig.data.datasets[0]?.label ?? 'データ',
                  labels: chartConfig.data.labels,
                  values: chartConfig.data.datasets[0]?.data ?? [],
                }]
              : chartConfig.data.datasets.map(ds => ({
                  name: ds.label,
                  labels: chartConfig.data.labels,
                  values: ds.data,
                }))
            const legendPos = ({ top: 't', bottom: 'b', left: 'l', right: 'r' } as const)[
              chartConfig.options?.plugins?.legend?.position ?? 'top'
            ]
            const chartColors = extractChartColors(chartConfig)
            const title = chartConfig.options?.plugins?.title?.text ?? chartConfig.title

            pptxSlide.addChart(pptx.ChartType[chartType], series, {
              x: chartX,
              y: yCursor[el.region],
              w: chartW,
              h,
              showLegend: chartConfig.options?.plugins?.legend?.display ?? true,
              legendPos,
              ...(title ? { showTitle: true, title, titleFontSize: 14 } : {}),
              ...(chartColors ? { chartColors } : {}),
              ...(chartType === 'bar' ? { barDir: 'col' as const } : {}),
            })
          } else {
            // 方式B: polarAreaはpptxgenjsに存在せず、bubble / scatterはデータ形が異なる
            // （本アプリはnumber[]）ため、プレビューと同じChart.js描画の画像を貼る
            const dataUri = await renderChartToImage(chartConfig)
            if (!dataUri) {
              console.warn('PowerPoint出力: グラフを画像化できないためスキップしました:', chartConfig.type)
              continue
            }
            pptxSlide.addImage({ data: dataUri, x: chartX, y: yCursor[el.region], w: chartW, h })
          }
        } else if (el.type === 'equation') {
          // 最低限対応: LaTeXソースをテキストとして挿入（KaTeXの画像化は将来の拡張）
          const text = `$ ${el.content} $`
          h = estimateHeight(text, FONT_SIZE.body, box.w)
          pptxSlide.addText(text, {
            x: box.x,
            y: yCursor[el.region],
            w: box.w,
            h,
            fontSize: FONT_SIZE.body,
            italic: true,
            align: el.style?.alignment ?? 'center',
            valign: 'top',
            fontFace: FONT_FACE,
          })
        } else if (el.type === 'code') {
          const styleDef = CODE_STYLE_DEFS[el.codeStyle ?? 'default']
          // 等幅・半角前提の折り返し概算（半角1文字≒fontSizeの0.6倍幅）
          const charsPerLine = Math.max(1, Math.floor(box.w / ((CODE_FONT_SIZE / 72) * 0.6)))
          const lines = el.content.split('\n')
            .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0)
          h = (CODE_FONT_SIZE / 72) * 1.45 * lines + 0.2

          pptxSlide.addText(el.content, {
            x: box.x,
            y: yCursor[el.region],
            w: box.w,
            h,
            fontSize: CODE_FONT_SIZE,
            fontFace: CODE_FONT_FACE,
            color: styleDef.color,
            align: 'left',
            valign: 'top',
            ...(styleDef.fill ? { fill: { color: styleDef.fill } } : {}),
            ...(styleDef.border ? { line: { color: styleDef.border, width: 1 } } : {}),
          })
        } else if (el.type === 'table') {
          const rows = el.rows ?? []
          if (rows.length === 0) continue

          const styleDef = TABLE_STYLE_DEFS[el.tableStyle ?? 'bordered']
          const colCount = Math.max(...rows.map(r => r.length))
          // 列数が揃っていない行は空セルで埋める（欠けたセルがあると列がずれる）
          const normalizedRows = rows.map(cells =>
            cells.length < colCount ? [...cells, ...Array<string>(colCount - cells.length).fill('')] : cells
          )
          const tableRows = normalizedRows.map((cells, ri) => {
            const isHeader = (el.hasHeaderRow ?? false) && ri === 0
            // stripedの偶数行判定はtbody基準（CSSのnth-child(even)と一致させる）
            const bodyIndex = ri - (el.hasHeaderRow ? 1 : 0)
            const stripe = styleDef.stripeFill && bodyIndex >= 0 && bodyIndex % 2 === 1
            return cells.map(text => ({
              text,
              options: {
                bold: isHeader,
                color: isHeader && styleDef.headerColor ? styleDef.headerColor : '000000',
                ...(isHeader && styleDef.headerFill
                  ? { fill: { color: styleDef.headerFill } }
                  : stripe
                    ? { fill: { color: styleDef.stripeFill! } }
                    : {}),
              },
            }))
          })

          pptxSlide.addTable(tableRows, {
            x: box.x,
            y: yCursor[el.region],
            w: box.w,
            colW: Array(colCount).fill(box.w / colCount),
            fontSize: FONT_SIZE.table,
            fontFace: FONT_FACE,
            border: styleDef.border,
            valign: 'middle',
            autoPage: false,
          })
          // セルの折り返しを考慮した高さ概算: 行内で最も折り返すセルの行数を基準にする
          // （全角1文字≒fontSize幅。行数だけの概算だと折り返し時に次の要素と重なる）
          const colW = box.w / colCount
          const cellCharsPerLine = Math.max(1, Math.floor(colW / (FONT_SIZE.table / 72)))
          h = normalizedRows.reduce((sum, cells) => {
            const wrapped = Math.max(...cells.map(c => Math.max(1, Math.ceil(c.length / cellCharsPerLine))))
            return sum + Math.max(TABLE_ROW_H, wrapped * (FONT_SIZE.table / 72) * 1.5 + 0.12)
          }, 0)
        } else {
          // 未対応の要素タイプはスキップ
          continue
        }

        yCursor[el.region] += h + ELEMENT_GAP
        if (el.region === 'full') {
          // 全幅要素（タイトル等）の下から左右カラムを開始させ、重なりを防ぐ
          yCursor.left = Math.max(yCursor.left, yCursor.full)
          yCursor.right = Math.max(yCursor.right, yCursor.full)
        }
      }
    }

    // toISOString()はUTCのため日本時間では日付がずれる。ローカル日付で組み立てる
    const d = new Date()
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    await pptx.writeFile({ fileName: `スライド_${date}.pptx` })
  } finally {
    isExporting = false
  }
}
