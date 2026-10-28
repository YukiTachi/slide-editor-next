// 画像処理ユーティリティ
import { createSlideStartRegex, findSlideEnd } from './slideTemplates'

const IMAGES_FOLDER = 'images/'

interface Slide {
  start: number
  end: number
  content: string
}

// 現在のスライドを検索（開始タグの定義と終了位置の計測は slideTemplates の共通実装を使う）
export function findCurrentSlide(htmlContent: string, cursorPos: number): Slide | null {
  const slideStartRegex = createSlideStartRegex()
  const slides: Slide[] = []
  let match

  // すべてのスライドの開始位置を取得
  while ((match = slideStartRegex.exec(htmlContent)) !== null) {
    const start = match.index
    const end = findSlideEnd(htmlContent, start)
    if (end !== -1) {
      slides.push({
        start: start,
        end: end,
        content: htmlContent.substring(start, end)
      })
    }
  }

  // カーソル位置がどのスライド内にあるかを判定
  for (const slide of slides) {
    if (cursorPos >= slide.start && cursorPos <= slide.end) {
      return slide
    }
  }

  return null
}

// スライドを2分割レイアウトに変換
export function convertToSplitLayout(
  slideContent: string,
  imageSrc: string,
  imageName: string,
  fileName: string | null = null
): string {
  // スライドの内容を解析
  const slideMatch = slideContent.match(/<div class="slide"[^>]*>([\s\S]*)<\/div>$/)
  if (!slideMatch) return slideContent

  const innerContent = slideMatch[1]

  // フッターを抽出
  const footerMatch = innerContent.match(/<div class="footer">[\s\S]*?<\/div>/)
  const footer = footerMatch ? footerMatch[0] : ''

  // h1タイトルを抽出
  const titleMatch = innerContent.match(/<h1[^>]*>[\s\S]*?<\/h1>/)
  const title = titleMatch ? titleMatch[0] : ''

  // タイトルとフッターを除いたコンテンツを取得
  let contentWithoutTitleAndFooter = innerContent
  if (footerMatch) {
    contentWithoutTitleAndFooter = contentWithoutTitleAndFooter.replace(footerMatch[0], '')
  }
  if (titleMatch) {
    contentWithoutTitleAndFooter = contentWithoutTitleAndFooter.replace(titleMatch[0], '')
  }

  // 画像のsrc属性を決定
  const imageSrcAttr = fileName ? `${IMAGES_FOLDER}${fileName}` : imageSrc

  // 2分割レイアウトのHTMLを生成
  return `<div class="slide slide-split">
        ${title}
        <div class="slide-split-content">
            <div class="slide-content">
${contentWithoutTitleAndFooter.trim()}
            </div>
            <div class="slide-image">
                <img class="slide-img" src="${imageSrcAttr}" alt="${imageName}">
            </div>
        </div>
        ${footer}
    </div>`
}

// .slide-image の中身は <img> だけで入れ子の div を持たない前提で、最初の </div> をそのコンテナの閉じタグとみなす
const SPLIT_IMAGE_CONTAINER = /(<div class="slide-image">)([\s\S]*?)(<\/div>)/

function isSplitSlide(slideContent: string): boolean {
  return /^<div class="slide(?:\s[^"]*)?\bslide-split\b/.test(slideContent)
}

/**
 * カーソル位置のスライドが「既に画像を持つ2分割スライド」かどうか。
 * 画像挿入の前に「置き換えますか？」の確認を出すかの判定に使う
 */
export function hasSplitSlideImage(htmlContent: string, cursorPos: number): boolean {
  const currentSlide = findCurrentSlide(htmlContent, cursorPos)
  if (!currentSlide || !isSplitSlide(currentSlide.content)) return false
  const container = currentSlide.content.match(SPLIT_IMAGE_CONTAINER)
  return container !== null && /<img\b/i.test(container[2])
}

/**
 * 既に2分割レイアウトのスライドの画像を差し替える。
 * 右カラム（.slide-image）は画像 1 枚を前提にした横並び flex のため、追加ではなく置き換える
 * （docs/PDF_EXPORT_RANGE_PLAN.md 2.9）。画像が無い右カラムには新しく入れる。
 * .slide-image が無い場合は null（呼び出し側でカーソル位置への挿入にフォールバック）
 */
export function replaceImageInSplitSlide(slideContent: string, imageSrcAttr: string, imageName: string): string | null {
  if (!SPLIT_IMAGE_CONTAINER.test(slideContent)) return null
  const newImg = `
                <img class="slide-img" src="${imageSrcAttr}" alt="${imageName}">
            `
  return slideContent.replace(SPLIT_IMAGE_CONTAINER, (_m, open: string, _inner: string, close: string) => `${open}${newImg}${close}`)
}

// 画像をエディタに挿入
export function insertImageToHTML(
  htmlContent: string,
  cursorPos: number,
  imageSrc: string,
  imageName: string,
  fileName: string | null = null
): { newContent: string; newCursorPos: number } {
  const imageSrcAttr = fileName ? `${IMAGES_FOLDER}${fileName}` : imageSrc

  // 現在のスライドを検索
  const currentSlide = findCurrentSlide(htmlContent, cursorPos)

  if (currentSlide) {
    // 既に2分割のスライドなら右カラムの画像を差し替え（呼び出し側で確認済み）、そうでなければ2分割レイアウトに変換する
    // （2分割スライドを convertToSplitLayout に通すと一致せず元のまま返り、何も挿入されない。docs/PDF_EXPORT_RANGE_PLAN.md 2.9）
    const updatedSlide = isSplitSlide(currentSlide.content)
      ? replaceImageInSplitSlide(currentSlide.content, imageSrcAttr, imageName)
      : convertToSplitLayout(currentSlide.content, imageSrc, imageName, fileName)

    if (updatedSlide !== null && updatedSlide !== currentSlide.content) {
      // 元のスライドを新しいスライドに置換
      const newHtmlContent =
        htmlContent.substring(0, currentSlide.start) +
        updatedSlide +
        htmlContent.substring(currentSlide.end)

      return {
        newContent: newHtmlContent,
        newCursorPos: currentSlide.start + updatedSlide.length
      }
    }
    // 変換できないスライド構造の場合は、下のカーソル位置への挿入にフォールバックする
  }

  // スライド内にいない場合（または変換できない場合）は、カーソル位置に画像ブロックを挿入
  const imageTag = `<img class="slide-img" src="${imageSrcAttr}" alt="${imageName}"`

  const imageHTML = `
        <div style="text-align: center; margin: 30px 0;">
            ${imageTag}
                 style="max-width: 600px; max-height: 400px; width: auto; height: auto;
                        border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
            <p class="slide-text" style="font-size: 16px; color: #7f8c8d; margin-top: 10px; font-style: italic;">${imageName}</p>
        </div>`

  const newContent = htmlContent.slice(0, cursorPos) + imageHTML + htmlContent.slice(cursorPos)
  return {
    newContent,
    newCursorPos: cursorPos + imageHTML.length
  }
}


