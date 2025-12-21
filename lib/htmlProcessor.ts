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

  // グラフを初期化するスクリプトを追加
  processedContent = addChartInitializationScript(processedContent)

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

  // グラフを初期化するスクリプトを追加
  processedContent = addChartInitializationScript(processedContent)

  return processedContent
}

/**
 * グラフを初期化するスクリプトを追加
 */
function addChartInitializationScript(htmlContent: string): string {
  // グラフコンテナが存在するかチェック
  if (!htmlContent.includes('slide-chart-container')) {
    return htmlContent
  }

  // Chart.jsのCDNスクリプトと初期化スクリプトを追加
  const chartScript = `
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script>
      (function() {
        // すべてのグラフコンテナを処理
        const chartContainers = document.querySelectorAll('.slide-chart-container');
        chartContainers.forEach(function(container) {
          const canvas = container.querySelector('canvas');
          const configScript = container.querySelector('.chart-config');
          
          if (!canvas || !configScript) return;
          
          try {
            const config = JSON.parse(configScript.textContent || '{}');
            
            // Chart.jsの設定を作成
            const chartConfig = {
              type: config.type,
              data: config.data,
              options: {
                responsive: config.options?.responsive ?? true,
                maintainAspectRatio: config.options?.maintainAspectRatio ?? false,
                plugins: {
                  legend: {
                    display: config.options?.plugins?.legend?.display ?? true,
                    position: config.options?.plugins?.legend?.position ?? 'top'
                  },
                  title: {
                    display: config.options?.plugins?.title?.display ?? (!!config.title),
                    text: config.options?.plugins?.title?.text ?? config.title
                  }
                },
                scales: config.options?.scales
              }
            };
            
            // グラフを作成
            new Chart(canvas, chartConfig);
          } catch (error) {
            console.error('グラフの初期化に失敗:', error);
          }
        });
      })();
    </script>`

  // </body>の前にスクリプトを追加
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', chartScript + '</body>')
  } else {
    // </body>がない場合は末尾に追加
    return htmlContent + chartScript
  }
}

