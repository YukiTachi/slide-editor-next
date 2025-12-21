// グラフ処理ユーティリティ

import type { ChartConfig } from '@/types'
import { findCurrentSlide } from './imageProcessor'

// ユニークIDを生成
function generateChartId(): string {
  return `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// グラフのHTMLを生成
export function generateChartHTML(config: ChartConfig): string {
  const chartId = generateChartId()
  const width = config.width || 600
  const height = config.height || 400
  
  // グラフ設定をJSONとして埋め込む
  const configJSON = JSON.stringify(config)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')

  const chartHTML = `<div class="slide-chart-container" data-chart-id="${chartId}">
    <canvas id="chart-${chartId}" width="${width}" height="${height}"></canvas>
    <script type="application/json" class="chart-config">${configJSON}</script>
</div>`

  return chartHTML
}

// エディタにグラフを挿入
export function insertChartToHTML(
  htmlContent: string,
  cursorPos: number,
  config: ChartConfig
): { newContent: string; newCursorPos: number } {
  // 現在のスライドを検索
  const currentSlide = findCurrentSlide(htmlContent, cursorPos)

  // グラフのHTMLを生成
  const chartHTML = generateChartHTML(config)

  if (currentSlide) {
    // スライド内にある場合、フッターの前に挿入
    const footerMatch = currentSlide.content.match(/<div class="footer">[\s\S]*?<\/div>/)
    
    if (footerMatch && footerMatch.index !== undefined) {
      // フッターの前の位置を計算（スライド内の相対位置）
      const footerPosInSlide = footerMatch.index
      const insertPos = currentSlide.start + footerPosInSlide
      
      // フッターの前にグラフを挿入（適切なインデントを保持）
      const newHtmlContent =
        htmlContent.substring(0, insertPos) +
        '\n        ' + chartHTML + '\n        ' +
        htmlContent.substring(insertPos)

      return {
        newContent: newHtmlContent,
        newCursorPos: insertPos + chartHTML.length + 18 // 改行とインデントを含む
      }
    } else {
      // フッターがない場合、スライドの終了直前（</div>の前）に挿入
      const insertPos = currentSlide.end - 6 // </div>の前
      const newHtmlContent =
        htmlContent.substring(0, insertPos) +
        '\n    ' + chartHTML + '\n    ' +
        htmlContent.substring(insertPos)

      return {
        newContent: newHtmlContent,
        newCursorPos: insertPos + chartHTML.length + 10 // 改行とインデントを含む
      }
    }
  } else {
    // スライド内にいない場合、カーソル位置に挿入
    const newContent = htmlContent.slice(0, cursorPos) + '\n' + chartHTML + '\n' + htmlContent.slice(cursorPos)
    return {
      newContent,
      newCursorPos: cursorPos + chartHTML.length + 2
    }
  }
}

// グラフを画像として取得（PowerPoint出力用）
export async function chartToImage(
  chartElement: HTMLElement
): Promise<string | null> {
  const canvas = chartElement.querySelector('canvas') as HTMLCanvasElement
  if (!canvas) {
    return null
  }

  try {
    // Canvasを画像データに変換
    const dataURL = canvas.toDataURL('image/png')
    return dataURL
  } catch (error) {
    console.error('グラフの画像変換に失敗:', error)
    return null
  }
}


