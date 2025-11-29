import { slideStylesCSS } from './slideStyles'
import { convertStorageImagesToDataURI } from './imageStorage'

/**
 * HTMLコンテンツをプレビュー用に処理する
 * CSSリンクをインラインスタイルに置き換え、画像をdata URIに変換
 */
export function processHTMLForPreview(htmlContent: string): string {
  let processedContent = htmlContent.trim()

  if (!processedContent) {
    return processedContent
  }

  // <link rel="stylesheet" href="css/slide-styles.css"> を <style> タグに置き換え
  processedContent = processedContent.replace(
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*slide-styles\.css["'][^>]*>/gi,
    `<style>${slideStylesCSS}</style>`
  )

  // 既に<style>タグがない場合、head内に追加
  if (!processedContent.includes('<style>')) {
    processedContent = processedContent.replace(
      /<\/head>/i,
      `<style>${slideStylesCSS}</style></head>`
    )
  }

  // ローカルストレージの画像をdata URIに変換
  processedContent = convertStorageImagesToDataURI(processedContent)

  return processedContent
}

