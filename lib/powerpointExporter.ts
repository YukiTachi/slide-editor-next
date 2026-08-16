// PowerPointエクスポート（pptxgenjsによる編集可能なpptx生成）
// 設計の詳細は docs/POWERPOINT_EXPORT_PLAN.md を参照
// Phase 1: テキスト要素（title / subtitle / text / list）
// Phase 2: 画像（base64 / ローカルストレージ / 外部URL）。表・グラフはPhase 3以降
import { getImageFromStorage } from './imageStorage'
import type {
  SlideSizeConfig,
  CSSDesignTemplate,
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

  // グラフはPhase 3.5で対応。設定JSONを本文として拾わないよう先にコンテナごと除去
  doc.querySelectorAll('.slide-chart-container').forEach(el => el.remove())
  // コードブロックはPhase 3.6で対応。ハイライト用マークアップを本文として拾わない
  doc.querySelectorAll('.slide-code-block-container').forEach(el => el.remove())
  // 本文として扱わない要素を除去（フッターのページ番号はslideNumberで出す）
  // ※ インラインのdata-latex要素はremoveしない（段落が分断されるため、描画テキストごと残す）
  doc.querySelectorAll('script, style, .footer').forEach(el => el.remove())

  doc.querySelectorAll('h1, h2, p, ul, ol, img, table').forEach(el => {
    const region = regionOf(el)

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
  // 外部URL: CORS制限で取得できないことがある（計画書7.2の方針どおり警告してスキップ）
  try {
    const res = await fetch(src)
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
            align: el.style?.alignment ?? 'left',
            valign: 'top',
            fontFace: FONT_FACE,
            ...(el.type === 'list' ? { bullet: true } : {}),
          })
        } else if (el.type === 'table') {
          const rows = el.rows ?? []
          if (rows.length === 0) continue

          const styleDef = TABLE_STYLE_DEFS[el.tableStyle ?? 'bordered']
          const colCount = Math.max(...rows.map(r => r.length))
          const tableRows = rows.map((cells, ri) => {
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
          h = TABLE_ROW_H * rows.length
        } else {
          // グラフ・数式・コードはPhase 3.5以降
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
