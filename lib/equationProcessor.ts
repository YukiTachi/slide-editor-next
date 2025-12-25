// 数式処理ユーティリティ

import type { EquationConfig } from '@/types'
import { findCurrentSlide } from './imageProcessor'

// HTMLエスケープ関数
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

// HTML属性値のエスケープ（data-latex属性用）
function escapeAttribute(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// KaTeXのエラーメッセージをユーザーフレンドリーに変換
export function formatKaTeXError(error: Error): string {
  const message = error.message || String(error)
  
  // よくあるエラーを分かりやすく変換
  if (message.includes('Unknown symbol')) {
    return '不明な記号が含まれています。サポートされている記号を確認してください。'
  }
  if (message.includes('Expected')) {
    return '構文エラー: ' + message
  }
  if (message.includes('Unsupported')) {
    return 'サポートされていないコマンドが含まれています。'
  }
  
  return 'LaTeX構文エラー: ' + message
}

// LaTeXコードの基本的な検証
export function validateLatex(latex: string): { isValid: boolean; error?: string } {
  if (!latex || !latex.trim()) {
    return { isValid: false, error: 'LaTeXコードを入力してください' }
  }
  
  // 基本的な構文チェック（中括弧のバランスなど）
  const openBraces = (latex.match(/\{/g) || []).length
  const closeBraces = (latex.match(/\}/g) || []).length
  
  if (openBraces !== closeBraces) {
    return { isValid: false, error: '中括弧の数が一致していません' }
  }
  
  // より詳細な検証は、実際にKaTeXでレンダリングを試みて行う
  return { isValid: true }
}

// 数式のHTMLを生成
export function generateEquationHTML(config: EquationConfig): string {
  const { latex, displayType, alignment = 'center', caption, label } = config
  
  // data-latex属性用にエスケープ（HTML属性なので特別なエスケープが必要）
  const escapedLatex = escapeAttribute(latex)
  
  // 配置クラス
  const alignmentClass = displayType === 'block' 
    ? `slide-equation-block-${alignment}` 
    : ''
  
  // data属性
  const dataAttrs = [
    `data-latex="${escapedLatex}"`,
    displayType === 'block' && alignment ? `data-alignment="${alignment}"` : '',
    label ? `data-label="${escapeAttribute(label)}"` : ''
  ].filter(Boolean).join(' ')
  
  if (displayType === 'inline') {
    // インライン数式
    return `<span class="slide-equation-inline" ${dataAttrs}></span>`
  } else {
    // ブロック数式
    const captionHTML = caption 
      ? `<div class="slide-equation-caption slide-equation-caption-${alignment}">${escapeHtml(caption)}</div>` 
      : ''
    
    return `<div class="slide-equation-block ${alignmentClass}" ${dataAttrs}>
  <!-- KaTeXでレンダリングされた数式がここに表示されます -->
</div>${caption ? captionHTML : ''}`
  }
}

// エディタに数式を挿入
export function insertEquationToHTML(
  htmlContent: string,
  cursorPos: number,
  config: EquationConfig
): { newContent: string; newCursorPos: number } {
  // 数式のHTMLを生成
  const equationHTML = generateEquationHTML(config)
  
  if (config.displayType === 'inline') {
    // インライン数式はカーソル位置に直接挿入
    const newContent = htmlContent.slice(0, cursorPos) + equationHTML + htmlContent.slice(cursorPos)
    return {
      newContent,
      newCursorPos: cursorPos + equationHTML.length
    }
  } else {
    // ブロック数式は、スライドのフッターの前に挿入（コードブロックと同じパターン）
    const currentSlide = findCurrentSlide(htmlContent, cursorPos)
    
    if (currentSlide) {
      // スライド内にある場合、フッターの前に挿入
      const footerMatch = currentSlide.content.match(/<div class="footer">[\s\S]*?<\/div>/)
      
      if (footerMatch && footerMatch.index !== undefined) {
        // フッターの前の位置を計算（スライド内の相対位置）
        const footerPosInSlide = footerMatch.index
        const insertPos = currentSlide.start + footerPosInSlide
        
        // フッターの前に数式を挿入（適切なインデントを保持）
        const newHtmlContent =
          htmlContent.substring(0, insertPos) +
          '\n        ' + equationHTML + '\n        ' +
          htmlContent.substring(insertPos)
        
        return {
          newContent: newHtmlContent,
          newCursorPos: insertPos + equationHTML.length + 18 // 改行とインデントを含む
        }
      } else {
        // フッターがない場合、スライドの終了直前（</div>の前）に挿入
        const insertPos = currentSlide.end - 6 // </div>の前
        const newHtmlContent =
          htmlContent.substring(0, insertPos) +
          '\n    ' + equationHTML + '\n    ' +
          htmlContent.substring(insertPos)
        
        return {
          newContent: newHtmlContent,
          newCursorPos: insertPos + equationHTML.length + 10 // 改行とインデントを含む
        }
      }
    } else {
      // スライド内にいない場合、カーソル位置に挿入
      const newContent = htmlContent.slice(0, cursorPos) + '\n' + equationHTML + '\n' + htmlContent.slice(cursorPos)
      return {
        newContent,
        newCursorPos: cursorPos + equationHTML.length + 2
      }
    }
  }
}

