/**
 * HTML検証・エラー検出ユーティリティ
 */

export interface ValidationError {
  line: number
  column?: number
  type: 'error' | 'warning'
  message: string
  code: string
}

interface TagInfo {
  name: string
  line: number
  column: number
  isSelfClosing: boolean
}

// 自己完結型タグ（閉じタグ不要）
const SELF_CLOSING_TAGS = new Set([
  'img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed',
  'source', 'track', 'wbr'
])

// 不正なネスト（親タグの中に配置できない子タグ）
const INVALID_NESTING: Record<string, Set<string>> = {
  'p': new Set(['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table']),
  'a': new Set(['a']),
  'button': new Set(['a', 'button']),
}

// 定義されているCSSクラスをCSSファイルから抽出
import { slideStylesCSS } from './slideStyles'

/**
 * CSS文字列からクラス名を抽出
 */
function extractCSSClasses(cssText: string): Set<string> {
  const classes = new Set<string>()
  
  // .class-name のパターンを検索
  const classRegex = /\.([a-zA-Z][a-zA-Z0-9_-]*)/g
  let match
  
  while ((match = classRegex.exec(cssText)) !== null) {
    const className = match[1]
    // 疑似クラス（:hover, :activeなど）を除外
    if (!className.includes(':') && !className.includes('::')) {
      classes.add(className)
    }
  }
  
  return classes
}

// 定義されているCSSクラス（slide-styles.cssから動的に抽出）
const DEFINED_CSS_CLASSES = extractCSSClasses(slideStylesCSS)

// 外部ライブラリのクラス（検証対象から除外）
const EXTERNAL_LIBRARY_CLASSES = new Set([
  // Font Awesome
  'fas', 'far', 'fal', 'fab', 'fa', 'fa-solid', 'fa-regular', 'fa-light', 'fa-brands',
  // Bootstrap 主要クラス
  'container', 'container-fluid', 'row', 'col', 'btn', 'card', 'modal', 'navbar', 'alert', 
  'badge', 'dropdown', 'nav', 'table', 'form-control', 'form-group', 'form-check', 'input-group',
  'list-group', 'breadcrumb', 'pagination', 'progress', 'spinner', 'tooltip', 'popover', 'carousel',
  'accordion', 'offcanvas', 'toast', 'collapse', 'tab', 'scrollspy'
])

// 外部ライブラリのクラスパターン（正規表現でマッチ）
const EXTERNAL_LIBRARY_PATTERNS = [
  // Font Awesome
  /^fa-/,           // Font Awesome アイコンクラス（fa-chart-line, fa-flask など）
  /^fa[a-z]*$/,     // Font Awesome スタイルクラス（fas, far, fal, fab など）
  
  // Bootstrap パターン
  /^col-/,          // Bootstrap グリッド（col-1, col-md-6, col-lg-4 など）
  /^btn-/,          // Bootstrap ボタン（btn-primary, btn-success など）
  /^card-/,         // Bootstrap カード（card-header, card-body など）
  /^modal-/,        // Bootstrap モーダル（modal-dialog, modal-content など）
  /^navbar-/,       // Bootstrap ナビゲーション（navbar-brand, navbar-nav など）
  /^alert-/,        // Bootstrap アラート（alert-success, alert-danger など）
  /^badge-/,        // Bootstrap バッジ（badge-primary, badge-secondary など）
  /^dropdown-/,     // Bootstrap ドロップダウン（dropdown-menu, dropdown-item など）
  /^nav-/,          // Bootstrap ナビ（nav-link, nav-tabs など）
  /^table-/,        // Bootstrap テーブル（table-striped, table-hover など）
  /^form-/,         // Bootstrap フォーム（form-label, form-select など）
  /^input-group-/,  // Bootstrap 入力グループ（input-group-text など）
  /^list-group-/,   // Bootstrap リストグループ（list-group-item など）
  /^text-/,         // Bootstrap テキストユーティリティ（text-center, text-primary など）
  /^bg-/,           // Bootstrap 背景色（bg-primary, bg-light など）
  /^border-/,       // Bootstrap ボーダー（border-primary, border-0 など）
  /^d-/,            // Bootstrap 表示ユーティリティ（d-none, d-flex など）
  /^m[xytsb]?-/,    // Bootstrap マージン（m-1, mt-2, mb-3 など）
  /^p[xytsb]?-/,    // Bootstrap パディング（p-1, pt-2, pb-3 など）
  /^w-/,            // Bootstrap 幅（w-25, w-50, w-100 など）
  /^h-/,            // Bootstrap 高さ（h-25, h-50, h-100 など）
  /^position-/,     // Bootstrap ポジション（position-relative, position-absolute など）
  /^shadow-/,       // Bootstrap シャドウ（shadow-sm, shadow-lg など）
  /^rounded-/,      // Bootstrap 角丸（rounded-0, rounded-circle など）
  /^g-/,            // Bootstrap ガター（g-0, g-2, g-4 など）
  /^flex-/,         // Bootstrap Flexbox（flex-row, flex-column など）
  /^justify-content-/, // Bootstrap ジャスティファイ（justify-content-center など）
  /^align-items-/,  // Bootstrap アライン（align-items-center など）
  /^order-/,        // Bootstrap オーダー（order-1, order-2 など）
  /^offset-/,       // Bootstrap オフセット（offset-1, offset-md-2 など）
  
  // Tailwind CSS パターン
  /^flex$/,         // Tailwind flex
  /^grid$/,         // Tailwind grid
  /^hidden$/,       // Tailwind hidden
  /^block$/,        // Tailwind block
  /^inline$/,       // Tailwind inline
  /^inline-block$/, // Tailwind inline-block
  /^absolute$/,     // Tailwind absolute
  /^relative$/,     // Tailwind relative
  /^fixed$/,        // Tailwind fixed
  /^sticky$/,       // Tailwind sticky
  /^(text|bg|border|ring|divide|outline|placeholder|from|via|to)-/, // Tailwind カラー系（text-red-500, bg-blue-600 など）
  /^(m|p|space|gap|w|h|max-w|max-h|min-w|min-h|top|right|bottom|left|inset)-/, // Tailwind スペーシング・サイズ（m-4, p-2, w-full など）
  /^(rounded|shadow|opacity|z|order|col-span|row-span|grid-cols|grid-rows)-/, // Tailwind その他ユーティリティ
  /^(flex|grid|items|justify|content|self|place|gap|space)-/, // Tailwind Flexbox/Grid（flex-col, items-center など）
  /^(font|text|leading|tracking|align|whitespace|break|overflow|truncate)-/, // Tailwind タイポグラフィ
  /^(border|divide|ring|outline)-/, // Tailwind ボーダー系（border-2, border-gray-300 など）
  /^(bg|from|via|to|decoration|underline|accent|caret|fill|stroke)-/, // Tailwind 背景・装飾
  /^(transition|duration|ease|delay|animate)-/, // Tailwind アニメーション
  /^(transform|scale|rotate|translate|skew|origin)-/, // Tailwind トランスフォーム
  /^(cursor|select|resize|appearance|outline|pointer-events)-/, // Tailwind インタラクション
  /^(object|overflow|overscroll|position|inset|z)-/, // Tailwind レイアウト
  /^(visible|invisible|sr-only|not-sr-only)$/, // Tailwind 表示制御
]

// 見出しタグ
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

/**
 * HTMLを検証してエラーと警告を返す
 */
export function validateHTML(htmlContent: string): ValidationError[] {
  const errors: ValidationError[] = []
  const lines = htmlContent.split('\n')

  // 1. HTML構文エラーの検出
  errors.push(...validateHTMLSyntax(htmlContent, lines))

  // 2. スライド構造エラーの検出
  errors.push(...validateSlideStructure(htmlContent, lines))

  // 3. 画像関連エラーの検出
  errors.push(...validateImages(htmlContent, lines))

  // 4. CSS関連エラーの検出
  errors.push(...validateCSSClasses(htmlContent, lines))

  // 5. コンテンツ品質の警告
  errors.push(...validateContentQuality(htmlContent, lines))

  // 6. アクセシビリティの警告
  errors.push(...validateAccessibility(htmlContent, lines))

  return errors.sort((a, b) => a.line - b.line)
}

/**
 * 1. HTML構文エラーの検出
 */
function validateHTMLSyntax(htmlContent: string, lines: string[]): ValidationError[] {
  const errors: ValidationError[] = []
  const tagStack: TagInfo[] = []
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g

  let match
  let currentLine = 1
  let lastIndex = 0

  // 行番号を計算するためのヘルパー
  const getLineNumber = (index: number): number => {
    return htmlContent.substring(0, index).split('\n').length
  }

  const getColumnNumber = (index: number): number => {
    const lastNewline = htmlContent.lastIndexOf('\n', index)
    return index - lastNewline
  }

  while ((match = tagRegex.exec(htmlContent)) !== null) {
    const fullMatch = match[0]
    const tagName = match[1].toLowerCase()
    const isClosing = fullMatch.startsWith('</')
    const isSelfClosing = fullMatch.endsWith('/>') || SELF_CLOSING_TAGS.has(tagName)
    const matchIndex = match.index
    const line = getLineNumber(matchIndex)
    const column = getColumnNumber(matchIndex)

    if (isSelfClosing && !isClosing) {
      continue // 自己完結型タグはスキップ
    }

    if (isClosing) {
      // 閉じタグの検証
      if (tagStack.length === 0) {
        errors.push({
          line,
          column,
          type: 'error',
          message: `閉じタグ</${tagName}>に対応する開始タグが見つかりません`,
          code: 'CLOSING_TAG_WITHOUT_OPENING'
        })
        continue
      }

      const lastTag = tagStack[tagStack.length - 1]
      if (lastTag.name !== tagName) {
        // 1.1 閉じタグの不一致
        errors.push({
          line,
          column,
          type: 'error',
          message: `<${lastTag.name}>タグが</${tagName}>で閉じられています（行${lastTag.line}で開始）`,
          code: 'MISMATCHED_CLOSING_TAG'
        })
        // スタックから削除（不一致でも処理を続ける）
        tagStack.pop()
      } else {
        tagStack.pop()
      }
    } else {
      // 開始タグの検証
      // 1.3 不正なネストの検証
      if (tagStack.length > 0) {
        const parentTag = tagStack[tagStack.length - 1]
        if (INVALID_NESTING[parentTag.name]?.has(tagName)) {
          errors.push({
            line,
            column,
            type: 'error',
            message: `<${parentTag.name}>タグの中に<${tagName}>タグを配置できません（行${parentTag.line}で開始）`,
            code: 'INVALID_NESTING'
          })
        }
      }

      if (!isSelfClosing) {
        tagStack.push({
          name: tagName,
          line,
          column,
          isSelfClosing: false
        })
      }
    }
  }

  // 1.2 閉じタグの欠如
  for (const tag of tagStack) {
    errors.push({
      line: tag.line,
      column: tag.column,
      type: 'error',
      message: `<${tag.name}>タグが閉じられていません`,
      code: 'UNCLOSED_TAG'
    })
  }

  return errors
}

/**
 * 2. スライド構造エラーの検出
 */
function validateSlideStructure(htmlContent: string, lines: string[]): ValidationError[] {
  const errors: ValidationError[] = []
  const slideRegex = /<div\s+class="slide"[^>]*(?:id="([^"]*)")?[^>]*>/g
  const slides: Array<{ line: number; id?: string }> = []
  let match

  while ((match = slideRegex.exec(htmlContent)) !== null) {
    const line = htmlContent.substring(0, match.index).split('\n').length
    const id = match[1]
    slides.push({ line, id })
  }

  // 2.1 スライド要素の欠如
  if (slides.length === 0) {
    errors.push({
      line: 1,
      type: 'error',
      message: 'スライド要素（<div class="slide">）が見つかりません',
      code: 'NO_SLIDE_ELEMENTS'
    })
    return errors
  }

  // 2.2 重複IDのチェック（すべてのタグのid属性をチェック）
  const idRegex = /\bid="([^"]*)"/g
  const idMap = new Map<string, Array<{ line: number; tag: string }>>()
  let idMatch

  while ((idMatch = idRegex.exec(htmlContent)) !== null) {
    const id = idMatch[1]
    const line = htmlContent.substring(0, idMatch.index).split('\n').length
    const column = idMatch.index - htmlContent.lastIndexOf('\n', idMatch.index)
    
    // タグ名を取得（id属性の前のタグ名を探す）
    const beforeId = htmlContent.substring(Math.max(0, idMatch.index - 50), idMatch.index)
    const tagMatch = beforeId.match(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*$/)
    const tagName = tagMatch ? tagMatch[1] : 'unknown'

    if (!idMap.has(id)) {
      idMap.set(id, [])
    }
    idMap.get(id)!.push({ line, tag: tagName })
  }

  for (const [id, occurrences] of idMap.entries()) {
    if (occurrences.length > 1) {
      const lines = occurrences.map(o => o.line)
      const tags = [...new Set(occurrences.map(o => o.tag))].join('、')
      errors.push({
        line: occurrences[0].line,
        type: 'error',
        message: `ID "${id}" が重複しています（行${lines.join(', ')}、タグ: ${tags}）`,
        code: 'DUPLICATE_ID'
      })
    }
  }

  // 2.3 スライド内の必須要素の欠如
  // 各スライドの範囲を正確に検出するために、slideRegexの結果を再利用
  const slideStartRegex2 = /<div\s+class="slide"[^>]*>/g
  const slideMatches: Array<{ index: number; line: number }> = []
  let match2

  while ((match2 = slideStartRegex2.exec(htmlContent)) !== null) {
    const line = htmlContent.substring(0, match2.index).split('\n').length
    slideMatches.push({ index: match2.index, line })
  }

  for (let i = 0; i < slideMatches.length; i++) {
    const slideMatch = slideMatches[i]
    const slideStartIndex = slideMatch.index

    // 次のスライドの開始位置を探す
    let searchEndIndex = htmlContent.length
    if (i < slideMatches.length - 1) {
      searchEndIndex = slideMatches[i + 1].index
    }

    // このスライド内のコンテンツを取得
    const slideContent = htmlContent.substring(slideStartIndex, searchEndIndex)

    // h1タグの存在を確認
    if (!/<h1[^>]*>/.test(slideContent)) {
      errors.push({
        line: slideMatch.line,
        type: 'warning',
        message: `スライド${i + 1}: タイトル（<h1>）が見つかりません`,
        code: 'MISSING_SLIDE_TITLE'
      })
    }
  }

  return errors
}

/**
 * 3. 画像関連エラーの検出
 */
function validateImages(htmlContent: string, lines: string[]): ValidationError[] {
  const errors: ValidationError[] = []
  const imgRegex = /<img[^>]*src="([^"]*)"[^>]*>/g
  let match

  while ((match = imgRegex.exec(htmlContent)) !== null) {
    const src = match[1]
    const line = htmlContent.substring(0, match.index).split('\n').length
    const column = match.index - htmlContent.lastIndexOf('\n', match.index)

    // 3.1 画像パスのエラー
    // data URI、http/https URL、ローカルストレージの画像は有効
    if (!src.startsWith('data:') && 
        !src.startsWith('http://') && 
        !src.startsWith('https://') &&
        !src.startsWith('image_')) {
      // ローカルストレージの画像（image_で始まる）以外はエラー
      errors.push({
        line,
        column,
        type: 'error',
        message: `画像パスが無効です: ${src}`,
        code: 'INVALID_IMAGE_PATH'
      })
    }
  }

  return errors
}

/**
 * 4. CSS関連エラーの検出
 */
function validateCSSClasses(htmlContent: string, lines: string[]): ValidationError[] {
  const errors: ValidationError[] = []
  const classRegex = /class="([^"]*)"/g
  let match

  // レーベンシュタイン距離を使って最も近いクラス名を検索
  const findClosestClass = (target: string): string | null => {
    let minDistance = Infinity
    let closest: string | null = null

    for (const definedClass of DEFINED_CSS_CLASSES) {
      const distance = levenshteinDistance(target, definedClass)
      if (distance < minDistance && distance <= 2) { // 距離が2以下なら提案
        minDistance = distance
        closest = definedClass
      }
    }

    return closest
  }

  while ((match = classRegex.exec(htmlContent)) !== null) {
    const classes = match[1].split(/\s+/).filter(c => c.trim())
    const line = htmlContent.substring(0, match.index).split('\n').length
    const column = match.index - htmlContent.lastIndexOf('\n', match.index)

    for (const className of classes) {
      // 外部ライブラリのクラスは検証対象から除外
      if (EXTERNAL_LIBRARY_CLASSES.has(className)) {
        continue
      }
      
      // 外部ライブラリのクラスパターンに一致する場合は除外
      if (EXTERNAL_LIBRARY_PATTERNS.some(pattern => pattern.test(className))) {
        continue
      }
      
      // 4.1 存在しないクラス名の使用
      if (!DEFINED_CSS_CLASSES.has(className)) {
        const closest = findClosestClass(className)
        const message = closest
          ? `クラス "${className}" が定義されていません。もしかして "${closest}" ですか？`
          : `クラス "${className}" が定義されていません`
        
        errors.push({
          line,
          column,
          type: 'warning',
          message,
          code: 'UNDEFINED_CSS_CLASS'
        })
      }
    }
  }

  return errors
}

/**
 * レーベンシュタイン距離を計算（文字列の類似度）
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length
  const dp: number[][] = []

  for (let i = 0; i <= m; i++) {
    dp[i] = [i]
  }

  for (let j = 0; j <= n; j++) {
    dp[0][j] = j
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // 削除
          dp[i][j - 1] + 1,     // 挿入
          dp[i - 1][j - 1] + 1  // 置換
        )
      }
    }
  }

  return dp[m][n]
}

/**
 * 5. コンテンツ品質の警告
 */
function validateContentQuality(htmlContent: string, lines: string[]): ValidationError[] {
  const errors: ValidationError[] = []
  const slideRegex = /<div\s+class="slide"[^>]*>([\s\S]*?)<\/div>/g
  let match
  let slideIndex = 0

  while ((match = slideRegex.exec(htmlContent)) !== null) {
    const slideContent = match[1]
    const slideStartIndex = match.index
    const line = htmlContent.substring(0, slideStartIndex).split('\n').length

    // HTMLタグを除去してテキストのみ取得
    const textContent = slideContent.replace(/<[^>]*>/g, '').trim()

    // 5.1 空のスライド
    if (textContent.length === 0) {
      errors.push({
        line,
        type: 'warning',
        message: `スライド${slideIndex + 1}: コンテンツが空です`,
        code: 'EMPTY_SLIDE'
      })
    }

    // 5.2 長すぎるテキスト
    if (textContent.length > 1000) {
      errors.push({
        line,
        type: 'warning',
        message: `スライド${slideIndex + 1}: テキストが長すぎます（${textContent.length}文字）。スライドを分割することを推奨します`,
        code: 'TEXT_TOO_LONG'
      })
    }

    // 5.3 フォントサイズの問題
    const fontSizeRegex = /font-size:\s*(\d+(?:\.\d+)?)px/g
    let fontSizeMatch
    while ((fontSizeMatch = fontSizeRegex.exec(slideContent)) !== null) {
      const fontSize = parseFloat(fontSizeMatch[1])
      const fontSizeLine = line + slideContent.substring(0, fontSizeMatch.index).split('\n').length - 1

      if (fontSize < 10) {
        errors.push({
          line: fontSizeLine,
          type: 'warning',
          message: `フォントサイズが小さすぎます（${fontSize}px）。可読性に影響する可能性があります`,
          code: 'FONT_SIZE_TOO_SMALL'
        })
      } else if (fontSize > 72) {
        errors.push({
          line: fontSizeLine,
          type: 'warning',
          message: `フォントサイズが大きすぎます（${fontSize}px）`,
          code: 'FONT_SIZE_TOO_LARGE'
        })
      }
    }

    slideIndex++
  }

  return errors
}

/**
 * 6. アクセシビリティの警告
 */
function validateAccessibility(htmlContent: string, lines: string[]): ValidationError[] {
  const errors: ValidationError[] = []

  // 6.1 コントラスト比の問題（簡易版：色の明度を計算）
  const colorRegex = /(?:color|background-color):\s*#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})/g
  let match

  while ((match = colorRegex.exec(htmlContent)) !== null) {
    const hex = match[1]
    const line = htmlContent.substring(0, match.index).split('\n').length
    const column = match.index - htmlContent.lastIndexOf('\n', match.index)

    // 16進数をRGBに変換
    const rgb = hex.length === 3
      ? hex.split('').map(c => parseInt(c + c, 16))
      : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map(c => parseInt(c, 16))

    // 相対輝度を計算（WCAG 2.1の公式）
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255

    // 明度が中間付近（0.4-0.6）の場合は警告
    if (luminance > 0.4 && luminance < 0.6) {
      errors.push({
        line,
        column,
        type: 'warning',
        message: `テキストと背景のコントラスト比が低い可能性があります（色: #${hex}）`,
        code: 'LOW_CONTRAST'
      })
    }
  }

  // 6.2 見出しの階層の問題
  const headingRegex = /<(h[1-6])[^>]*>/g
  const headings: Array<{ tag: string; line: number }> = []

  while ((match = headingRegex.exec(htmlContent)) !== null) {
    const tag = match[1]
    const line = htmlContent.substring(0, match.index).split('\n').length
    headings.push({ tag, line })
  }

  for (let i = 1; i < headings.length; i++) {
    const prevLevel = parseInt(headings[i - 1].tag[1])
    const currentLevel = parseInt(headings[i].tag[1])

    // 階層が2以上飛んでいる場合は警告
    if (currentLevel > prevLevel + 1) {
      errors.push({
        line: headings[i].line,
        type: 'warning',
        message: `見出しの階層が飛んでいます（${headings[i - 1].tag}の次が${headings[i].tag}）。h${prevLevel + 1}を使用することを推奨します`,
        code: 'SKIPPED_HEADING_LEVEL'
      })
    }
  }

  return errors
}

