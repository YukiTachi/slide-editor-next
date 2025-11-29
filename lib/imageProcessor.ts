// 画像処理ユーティリティ

const IMAGES_FOLDER = 'images/'

interface Slide {
  start: number
  end: number
  content: string
}

// 現在のスライドを検索
export function findCurrentSlide(htmlContent: string, cursorPos: number): Slide | null {
  const slideStartRegex = /<div class="slide">/g
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

// スライドの終了位置を検索
function findSlideEnd(htmlContent: string, slideStart: number): number {
  let depth = 1
  let pos = slideStart + '<div class="slide">'.length

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
        return nextDivEnd + 6
      }
      pos = nextDivEnd + 6
    }
  }

  return -1
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
                <img src="${imageSrcAttr}" alt="${imageName}">
            </div>
        </div>
        ${footer}
    </div>`
}

// 画像をエディタに挿入
export function insertImageToHTML(
  htmlContent: string,
  cursorPos: number,
  imageSrc: string,
  imageName: string,
  fileName: string | null = null
): { newContent: string; newCursorPos: number } {
  // 現在のスライドを検索
  const currentSlide = findCurrentSlide(htmlContent, cursorPos)

  if (currentSlide) {
    // 現在のスライドを2分割レイアウトに変換
    const splitSlide = convertToSplitLayout(currentSlide.content, imageSrc, imageName, fileName)

    // 元のスライドを新しいスライドに置換
    const newHtmlContent =
      htmlContent.substring(0, currentSlide.start) +
      splitSlide +
      htmlContent.substring(currentSlide.end)

    return {
      newContent: newHtmlContent,
      newCursorPos: currentSlide.start + splitSlide.length
    }
  } else {
    // スライド内にいない場合は、従来通りの方法で挿入
    const imageTag = fileName
      ? `<img src="${IMAGES_FOLDER}${fileName}" alt="${imageName}"`
      : `<img src="${imageSrc}" alt="${imageName}"`

    const imageHTML = `
        <div style="text-align: center; margin: 30px 0;">
            ${imageTag} 
                 style="max-width: 600px; max-height: 400px; width: auto; height: auto; 
                        border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
            <p style="font-size: 16px; color: #7f8c8d; margin-top: 10px; font-style: italic;">${imageName}</p>
        </div>`

    const newContent = htmlContent.slice(0, cursorPos) + imageHTML + htmlContent.slice(cursorPos)
    return {
      newContent,
      newCursorPos: cursorPos + imageHTML.length
    }
  }
}


