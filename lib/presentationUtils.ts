import { extractSlides } from './slideReorder'
import { processHTMLForPreviewAsync } from './htmlProcessor'

/**
 * 現在のスライドのHTMLを取得
 */
export function getCurrentSlideHTML(htmlContent: string, slideIndex: number): string {
  const slides = extractSlides(htmlContent)
  if (slideIndex < 0 || slideIndex >= slides.length) {
    return ''
  }
  return slides[slideIndex].html
}

/**
 * プレゼンテーション用にスライドを処理
 */
export async function processSlideForPresentation(slideHTML: string): Promise<string> {
  // 単一のスライドをHTMLコンテンツとして処理
  // スライドは既にdiv.slideで囲まれているので、そのまま処理
  // 全体のHTML構造を作成
  const fullHTML = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>プレゼンテーション</title>
</head>
<body>
  ${slideHTML}
</body>
</html>
  `.trim()

  return await processHTMLForPreviewAsync(fullHTML)
}

/**
 * スライドのスケールを計算（画面サイズに合わせて）
 */
export function calculateSlideScale(
  slideWidth: number,
  slideHeight: number,
  containerWidth: number,
  containerHeight: number
): number {
  const scaleX = containerWidth / slideWidth
  const scaleY = containerHeight / slideHeight
  return Math.min(scaleX, scaleY, 1) // 1を超えないようにする
}

/**
 * フルスクリーンAPIのサポートをチェック
 */
export function isFullscreenSupported(): boolean {
  return !!(
    document.fullscreenEnabled ||
    (document as any).webkitFullscreenEnabled ||
    (document as any).mozFullScreenEnabled ||
    (document as any).msFullscreenEnabled
  )
}

/**
 * フルスクリーンに切り替え
 */
export async function enterFullscreen(element: HTMLElement): Promise<void> {
  // 要素がDOMに接続されているか確認
  if (!element.isConnected) {
    throw new Error('Element is not connected to the DOM')
  }

  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen()
    } else if ((element as any).webkitRequestFullscreen) {
      await (element as any).webkitRequestFullscreen()
    } else if ((element as any).mozRequestFullScreen) {
      await (element as any).mozRequestFullScreen()
    } else if ((element as any).msRequestFullscreen) {
      await (element as any).msRequestFullscreen()
    }
  } catch (error: any) {
    // ユーザージェスチャー関連のエラーは警告レベルに下げる（動作には影響しない）
    const errorMessage = error?.message || String(error)
    if (
      errorMessage.includes('user gesture') ||
      errorMessage.includes('Permissions check failed') ||
      errorMessage.includes('not allowed')
    ) {
      // ユーザージェスチャー関連のエラーは警告として記録（動作には影響しない）
      console.warn('フルスクリーン開始にユーザージェスチャーが必要です（再試行されます）:', errorMessage)
    } else {
      // その他のエラーは通常通りエラーとして記録
      console.error('フルスクリーンに失敗しました:', error)
    }
    throw error
  }
}

/**
 * フルスクリーンから終了
 */
export async function exitFullscreen(): Promise<void> {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen()
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen()
    } else if ((document as any).mozCancelFullScreen) {
      await (document as any).mozCancelFullScreen()
    } else if ((document as any).msExitFullscreen) {
      await (document as any).msExitFullscreen()
    }
  } catch (error) {
    console.error('フルスクリーン終了に失敗しました:', error)
    throw error
  }
}

/**
 * 現在フルスクリーンかどうかをチェック
 */
export function isFullscreen(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  )
}

