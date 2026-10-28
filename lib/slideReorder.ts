import { SlideTemplates, createSlideStartRegex, findSlideEnd } from './slideTemplates'

/**
 * スライドを抽出する
 * 開始タグの定義と終了位置の計測は slideTemplates の共通実装を使う（class="slide slide-split" も対象）
 */
export function extractSlides(htmlContent: string): Array<{ html: string; start: number; end: number }> {
  const slides: Array<{ html: string; start: number; end: number }> = []
  const slideStartRegex = createSlideStartRegex()

  let match
  while ((match = slideStartRegex.exec(htmlContent)) !== null) {
    const start = match.index
    const end = findSlideEnd(htmlContent, start)

    if (end !== -1) {
      const slideHtml = htmlContent.substring(start, end)
      slides.push({ html: slideHtml, start, end })
    }
  }

  return slides
}

/**
 * カーソル位置から「現在のスライド」のインデックスを返す（PDF の「現在のスライドのみ」出力用）。
 * - カーソルがスライドの内側（開始タグ〜終了タグ、両端含む）→ そのスライド
 * - スライドの外側（<head>内・スライド間・最後のスライドの後）→ カーソルより前にある直近のスライド
 * - 前にスライドがない（先頭の <head> 内など）→ 0
 * - スライドが 1 枚もない → -1
 * cursorPos は htmlContent（trim 前）のオフセットであること。
 */
export function findSlideIndexAtCursor(htmlContent: string, cursorPos: number): number {
  const slides = extractSlides(htmlContent)
  if (slides.length === 0) return -1

  const inside = slides.findIndex((slide) => cursorPos >= slide.start && cursorPos <= slide.end)
  if (inside !== -1) return inside

  let preceding = -1
  slides.forEach((slide, index) => {
    if (slide.end <= cursorPos) preceding = index
  })
  return preceding === -1 ? 0 : preceding
}

/**
 * 指定インデックスのスライドだけを残した HTML を返す。
 * 他のスライド（開始タグ〜終了タグ）を後ろから順に取り除くだけで、<head>・スライド間のコメント・<script>・
 * その他の要素はすべて元の位置に残る。整数でない・範囲外のインデックスは null。元の文字列は変更しない。
 */
export function extractSingleSlideHTML(htmlContent: string, slideIndex: number): string | null {
  // 1.5 や NaN が通ると「どのスライドも残らない」HTML になるため、整数以外も弾く
  if (!Number.isInteger(slideIndex)) return null
  const slides = extractSlides(htmlContent)
  if (slideIndex < 0 || slideIndex >= slides.length) return null

  let result = htmlContent
  // 後ろから削ると、まだ削っていない前方のオフセットがずれない
  for (let i = slides.length - 1; i >= 0; i--) {
    if (i === slideIndex) continue
    result = result.slice(0, slides[i].start) + result.slice(slides[i].end)
  }
  return result
}

/**
 * スライドの順序を変更
 */
export function reorderSlides(htmlContent: string, fromIndex: number, toIndex: number): string {
  const slides = extractSlides(htmlContent)
  
  if (fromIndex < 0 || fromIndex >= slides.length || toIndex < 0 || toIndex >= slides.length) {
    return htmlContent
  }

  if (slides.length === 0) {
    return htmlContent
  }

  // 元のHTMLから最初のスライドの前と最後のスライドの後を取得（並び替え前の位置情報を使用）
  const originalFirstSlide = slides[0]
  const originalLastSlide = slides[slides.length - 1]
  
  const beforeSlides = htmlContent.substring(0, originalFirstSlide.start)
  const afterSlides = htmlContent.substring(originalLastSlide.end)

  // スライドを並び替え
  const [movedSlide] = slides.splice(fromIndex, 1)
  slides.splice(toIndex, 0, movedSlide)

  // 新しいHTMLを構築（並び替え後のスライドを使用）
  const newSlidesHtml = slides.map(slide => slide.html).join('\n\n    ')
  const newHtmlContent = beforeSlides + newSlidesHtml + afterSlides

  // ページ番号を更新
  return SlideTemplates.updatePageNumbers(newHtmlContent)
}

/**
 * スライドのタイトルを取得（プレビュー表示用）
 */
export function getSlideTitle(slideHtml: string): string {
  const h1Match = slideHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
  if (h1Match) {
    // HTMLタグを除去してテキストのみ取得
    return h1Match[1].replace(/<[^>]*>/g, '').trim()
  }
  return 'タイトルなし'
}

/**
 * スライドを削除
 */
export function deleteSlide(htmlContent: string, slideIndex: number): string {
  const slides = extractSlides(htmlContent)
  
  if (slideIndex < 0 || slideIndex >= slides.length) {
    return htmlContent
  }

  if (slides.length === 0) {
    return htmlContent
  }

  // 元のHTMLから最初のスライドの前と最後のスライドの後を取得
  const originalFirstSlide = slides[0]
  const originalLastSlide = slides[slides.length - 1]
  
  const beforeSlides = htmlContent.substring(0, originalFirstSlide.start)
  const afterSlides = htmlContent.substring(originalLastSlide.end)

  // 指定されたスライドを削除
  const newSlides = slides.filter((_, index) => index !== slideIndex)

  if (newSlides.length === 0) {
    // すべてのスライドを削除した場合、空のHTMLを返す
    return beforeSlides + afterSlides
  }

  // 新しいHTMLを構築
  const newSlidesHtml = newSlides.map(slide => slide.html).join('\n\n    ')
  const newHtmlContent = beforeSlides + newSlidesHtml + afterSlides

  // ページ番号を更新
  return SlideTemplates.updatePageNumbers(newHtmlContent)
}

/**
 * スライドを複製
 */
export function duplicateSlide(htmlContent: string, slideIndex: number): string {
  const slides = extractSlides(htmlContent)
  
  if (slideIndex < 0 || slideIndex >= slides.length) {
    return htmlContent
  }

  if (slides.length === 0) {
    return htmlContent
  }

  // 元のHTMLから最初のスライドの前と最後のスライドの後を取得
  const originalFirstSlide = slides[0]
  const originalLastSlide = slides[slides.length - 1]
  
  const beforeSlides = htmlContent.substring(0, originalFirstSlide.start)
  const afterSlides = htmlContent.substring(originalLastSlide.end)

  // 指定されたスライドを複製
  const slideToDuplicate = slides[slideIndex]
  const newSlides = [...slides]
  newSlides.splice(slideIndex + 1, 0, slideToDuplicate)

  // 新しいHTMLを構築
  const newSlidesHtml = newSlides.map(slide => slide.html).join('\n\n    ')
  const newHtmlContent = beforeSlides + newSlidesHtml + afterSlides

  // ページ番号を更新
  return SlideTemplates.updatePageNumbers(newHtmlContent)
}

