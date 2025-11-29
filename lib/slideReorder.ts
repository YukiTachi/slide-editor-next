import { SlideTemplates } from './slideTemplates'

/**
 * スライドを抽出する
 */
export function extractSlides(htmlContent: string): Array<{ html: string; start: number; end: number }> {
  const slides: Array<{ html: string; start: number; end: number }> = []
  const slideStartRegex = /<div class="slide"[^>]*>/g

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
 * スライドの終了位置を検索
 */
function findSlideEnd(htmlContent: string, slideStart: number): number {
  let depth = 1
  let pos = slideStart + htmlContent.substring(slideStart).indexOf('>') + 1

  while (pos < htmlContent.length && depth > 0) {
    const nextDivStart = htmlContent.indexOf('<div', pos)
    const nextDivEnd = htmlContent.indexOf('</div>', pos)

    if (nextDivEnd === -1) break

    if (nextDivStart !== -1 && nextDivStart < nextDivEnd) {
      depth++
      pos = nextDivStart + 4
    } else {
      depth--
      if (depth === 0) {
        return nextDivEnd + 6 // </div>の長さ
      }
      pos = nextDivEnd + 6
    }
  }

  return -1
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

