// 表処理ユーティリティ

import type { TableConfig } from '@/types'
import { findCurrentSlide } from './imageProcessor'

// 表のHTMLを生成
export function generateTableHTML(config: TableConfig): string {
  const { rows, columns, style, hasHeader, caption } = config

  // ヘッダー行を生成
  let headerRow = ''
  if (hasHeader) {
    const headerCells = Array.from({ length: columns }, (_, i) => 
      `        <th>列${i + 1}</th>`
    ).join('\n')
    headerRow = `    <thead>
      <tr>
${headerCells}
      </tr>
    </thead>`
  }

  // データ行を生成
  const dataRows = Array.from({ length: hasHeader ? rows - 1 : rows }, (_, rowIndex) => {
    const actualRowIndex = hasHeader ? rowIndex + 1 : rowIndex
    const cells = Array.from({ length: columns }, (_, colIndex) => 
      `        <td>データ${actualRowIndex + 1}-${colIndex + 1}</td>`
    ).join('\n')
    return `      <tr>
${cells}
      </tr>`
  }).join('\n')

  // キャプション
  const captionHTML = caption 
    ? `    <caption class="slide-table-caption">${caption}</caption>\n`
    : ''

  // 表のHTMLを生成
  const tableHTML = `<div class="slide-table-container">
  <table class="slide-table slide-table-${style}">
${captionHTML}${headerRow}${headerRow ? '\n' : ''}    <tbody>
${dataRows}
    </tbody>
  </table>
</div>`

  return tableHTML
}

// エディタに表を挿入
export function insertTableToHTML(
  htmlContent: string,
  cursorPos: number,
  config: TableConfig
): { newContent: string; newCursorPos: number } {
  // 現在のスライドを検索
  const currentSlide = findCurrentSlide(htmlContent, cursorPos)

  // 表のHTMLを生成
  const tableHTML = generateTableHTML(config)

  if (currentSlide) {
    // スライド内にある場合、フッターの前に挿入
    const footerMatch = currentSlide.content.match(/<div class="footer">[\s\S]*?<\/div>/)
    
    if (footerMatch && footerMatch.index !== undefined) {
      // フッターの前の位置を計算（スライド内の相対位置）
      const footerPosInSlide = footerMatch.index
      const insertPos = currentSlide.start + footerPosInSlide
      
      // フッターの前に表を挿入（適切なインデントを保持）
      const newHtmlContent =
        htmlContent.substring(0, insertPos) +
        '\n        ' + tableHTML + '\n        ' +
        htmlContent.substring(insertPos)

      return {
        newContent: newHtmlContent,
        newCursorPos: insertPos + tableHTML.length + 18 // 改行とインデントを含む
      }
    } else {
      // フッターがない場合、スライドの終了直前（</div>の前）に挿入
      const insertPos = currentSlide.end - 6 // </div>の前
      const newHtmlContent =
        htmlContent.substring(0, insertPos) +
        '\n    ' + tableHTML + '\n    ' +
        htmlContent.substring(insertPos)

      return {
        newContent: newHtmlContent,
        newCursorPos: insertPos + tableHTML.length + 10 // 改行とインデントを含む
      }
    }
  } else {
    // スライド内にいない場合、カーソル位置に挿入
    const newContent = htmlContent.slice(0, cursorPos) + '\n' + tableHTML + '\n' + htmlContent.slice(cursorPos)
    return {
      newContent,
      newCursorPos: cursorPos + tableHTML.length + 2
    }
  }
}

