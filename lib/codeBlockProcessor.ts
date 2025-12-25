// コードブロック処理ユーティリティ

import type { CodeBlockConfig } from '@/types'
import { findCurrentSlide } from './imageProcessor'

// HTMLエスケープ関数（クライアント側のみで使用）
function escapeHtml(text: string): string {
  if (typeof document === 'undefined') {
    // サーバーサイドの場合、手動でエスケープ
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// コードブロックのHTMLを生成
export function generateCodeBlockHTML(config: CodeBlockConfig): string {
  const { code, language, style, showLineNumbers, startLineNumber = 1, caption, maxHeight } = config

  // コードをエスケープ
  const escapedCode = escapeHtml(code)

  // スタイルクラス
  const styleClass = `slide-code-block-${style}`

  // 行番号クラス
  const lineNumbersClass = showLineNumbers ? 'line-numbers' : ''

  // 言語クラス（Prism.js用）
  const languageClass = language !== 'plaintext' ? `language-${language}` : ''

  // 最大高さスタイル
  const maxHeightStyle = maxHeight ? `max-height: ${maxHeight}px; overflow-y: auto;` : ''

  // 開始行番号のdata属性
  const dataStartAttr = showLineNumbers && startLineNumber !== 1 
    ? `data-start="${startLineNumber}"` 
    : ''

  // キャプションHTML
  const captionHTML = caption 
    ? `<div class="slide-code-block-caption">${escapeHtml(caption)}</div>` 
    : ''

  // コードブロックのHTMLを生成
  // キャプションはコードブロックの後に配置
  const codeBlockHTML = `<div class="slide-code-block-container ${styleClass}" ${maxHeightStyle ? `style="${maxHeightStyle}"` : ''}>
  <pre class="${lineNumbersClass}"><code class="${languageClass}" ${dataStartAttr}>${escapedCode}</code></pre>
  ${caption ? captionHTML : ''}
</div>`

  return codeBlockHTML
}

// エディタにコードブロックを挿入
export function insertCodeBlockToHTML(
  htmlContent: string,
  cursorPos: number,
  config: CodeBlockConfig
): { newContent: string; newCursorPos: number } {
  // 現在のスライドを検索
  const currentSlide = findCurrentSlide(htmlContent, cursorPos)

  // コードブロックのHTMLを生成
  const codeBlockHTML = generateCodeBlockHTML(config)

  if (currentSlide) {
    // スライド内にある場合、フッターの前に挿入
    const footerMatch = currentSlide.content.match(/<div class="footer">[\s\S]*?<\/div>/)
    
    if (footerMatch && footerMatch.index !== undefined) {
      // フッターの前の位置を計算（スライド内の相対位置）
      const footerPosInSlide = footerMatch.index
      const insertPos = currentSlide.start + footerPosInSlide
      
      // フッターの前にコードブロックを挿入（適切なインデントを保持）
      const newHtmlContent =
        htmlContent.substring(0, insertPos) +
        '\n        ' + codeBlockHTML + '\n        ' +
        htmlContent.substring(insertPos)

      return {
        newContent: newHtmlContent,
        newCursorPos: insertPos + codeBlockHTML.length + 18 // 改行とインデントを含む
      }
    } else {
      // フッターがない場合、スライドの終了直前（</div>の前）に挿入
      const insertPos = currentSlide.end - 6 // </div>の前
      const newHtmlContent =
        htmlContent.substring(0, insertPos) +
        '\n    ' + codeBlockHTML + '\n    ' +
        htmlContent.substring(insertPos)

      return {
        newContent: newHtmlContent,
        newCursorPos: insertPos + codeBlockHTML.length + 10 // 改行とインデントを含む
      }
    }
  } else {
    // スライド内にいない場合、カーソル位置に挿入
    const newContent = htmlContent.slice(0, cursorPos) + '\n' + codeBlockHTML + '\n' + htmlContent.slice(cursorPos)
    return {
      newContent,
      newCursorPos: cursorPos + codeBlockHTML.length + 2
    }
  }
}

