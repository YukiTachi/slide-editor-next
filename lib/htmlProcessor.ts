import { slideStylesCSS } from './slideStyles'
import { convertStorageImagesToDataURI } from './imageStorage'

// CSSキャッシュ（クライアント側でfetchで読み込んだCSSを保存）
let cachedCSS: string | null = null

/**
 * 実際のCSSファイルを読み込む（クライアント側のみ）
 */
async function loadActualCSS(): Promise<string> {
  // サーバー側ではデフォルトCSSを使用（fsモジュールの動的インポートはビルドエラーの原因となるため）
  if (typeof window === 'undefined') {
    return slideStylesCSS
  }

  // キャッシュがあれば使用
  if (cachedCSS) {
    return cachedCSS
  }

  // クライアント側: fetchで実際のCSSファイルを読み込む
  try {
    const response = await fetch('/css/slide-styles.css')
    if (response.ok) {
      cachedCSS = await response.text()
      return cachedCSS
    }
  } catch (error) {
    console.warn('CSSファイルの読み込みに失敗しました。デフォルトCSSを使用します。', error)
  }

  // フォールバック: slideStylesCSSを使用
  return slideStylesCSS
}

/**
 * HTMLコンテンツをプレビュー用に処理する
 * CSSリンクをインラインスタイルに置き換え、画像をdata URIに変換
 */
export async function processHTMLForPreviewAsync(htmlContent: string): Promise<string> {
  let processedContent = htmlContent.trim()

  if (!processedContent) {
    return processedContent
  }

  // 実際のCSSファイルを読み込む
  const css = await loadActualCSS()

  // <link rel="stylesheet" href="css/slide-styles.css"> を <style> タグに置き換え
  processedContent = processedContent.replace(
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*slide-styles\.css["'][^>]*>/gi,
    `<style>${css}</style>`
  )

  // 既に<style>タグがない場合、head内に追加
  if (!processedContent.includes('<style>')) {
    processedContent = processedContent.replace(
      /<\/head>/i,
      `<style>${css}</style></head>`
    )
  }

  // ローカルストレージの画像をdata URIに変換
  processedContent = convertStorageImagesToDataURI(processedContent)

  return processedContent
}

/**
 * HTMLコンテンツをプレビュー用に処理する（同期版、互換性のため）
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

