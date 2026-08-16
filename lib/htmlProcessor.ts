import { getSlideStylesCSS } from './slideStyles'
import { convertStorageImagesToDataURI } from './imageStorage'
import type { SlideSizeConfig, CSSDesignTemplate } from '@/types'
import { DEFAULT_SLIDE_SIZE_TYPE, getSlideSizeConfig } from './slideSizeConfig'

// HTML処理のオプション
export interface ProcessHTMLOptions {
  disableAnimation?: boolean // グラフのアニメーションを無効化（PDF出力用: 中間状態の印刷を防ぐ）
}

/**
 * HTMLコンテンツをプレビュー用に処理する
 * CSSリンクをインラインスタイルに置き換え、画像をdata URIに変換
 */
export async function processHTMLForPreviewAsync(
  htmlContent: string,
  sizeConfig?: SlideSizeConfig,
  template?: CSSDesignTemplate,
  options?: ProcessHTMLOptions
): Promise<string> {
  let processedContent = htmlContent.trim()

  if (!processedContent) {
    return processedContent
  }

  // sizeConfig が渡されない場合はデフォルトを使用
  const effectiveSizeConfig = sizeConfig || getSlideSizeConfig(DEFAULT_SLIDE_SIZE_TYPE)

  // サイズ設定とテンプレートに基づいてCSSを動的に生成
  const css = getSlideStylesCSS(effectiveSizeConfig, template)

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
  processedContent = addChartInitializationScript(processedContent, options?.disableAnimation)

  // コードブロックのシンタックスハイライトを追加
  processedContent = addCodeBlockHighlighting(processedContent)

  // 数式のレンダリングを追加
  processedContent = addEquationRendering(processedContent)

  return processedContent
}

/**
 * HTMLコンテンツをプレビュー用に処理する（同期版、互換性のため）
 * CSSリンクをインラインスタイルに置き換え、画像をdata URIに変換
 */
export function processHTMLForPreview(
  htmlContent: string,
  sizeConfig?: SlideSizeConfig,
  template?: CSSDesignTemplate,
  options?: ProcessHTMLOptions
): string {
  let processedContent = htmlContent.trim()

  if (!processedContent) {
    return processedContent
  }

  // sizeConfig が渡されない場合はデフォルトを使用
  const effectiveSizeConfig = sizeConfig || getSlideSizeConfig(DEFAULT_SLIDE_SIZE_TYPE)

  // サイズ設定とテンプレートに基づいてCSSを動的に生成
  const css = getSlideStylesCSS(effectiveSizeConfig, template)

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
  processedContent = addChartInitializationScript(processedContent, options?.disableAnimation)

  // コードブロックのシンタックスハイライトを追加
  processedContent = addCodeBlockHighlighting(processedContent)

  // 数式のレンダリングを追加
  processedContent = addEquationRendering(processedContent)

  return processedContent
}

/**
 * スニペットを閉じbodyタグの直前に挿入する。
 * コンテンツ中のコメント等に "</body>" という文字列が含まれていても壊れないよう、
 * 最初の出現ではなく最後の出現位置に挿入する。
 */
function insertBeforeClosingBody(htmlContent: string, snippet: string): string {
  const idx = htmlContent.lastIndexOf('</body>')
  if (idx === -1) {
    // </body>がない場合は末尾に追加
    return htmlContent + snippet
  }
  return htmlContent.slice(0, idx) + snippet + htmlContent.slice(idx)
}

/**
 * グラフを初期化するスクリプトを追加
 * disableAnimation: PDF出力時にアニメーション中間状態が印刷されるのを防ぐ
 */
function addChartInitializationScript(htmlContent: string, disableAnimation = false): string {
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
                ${disableAnimation ? 'animation: false,' : ''}
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

  // </body>（最後の出現）の前にスクリプトを追加
  return insertBeforeClosingBody(htmlContent, chartScript)
}

/**
 * 数式のレンダリング（KaTeX）を追加
 */
function addEquationRendering(htmlContent: string): string {
  // 数式が存在するかチェック
  if (!htmlContent.includes('slide-equation-')) {
    return htmlContent
  }

  // KaTeXのCDNスクリプトとスタイル、初期化スクリプトを追加
  const katexScript = `
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script>
      (function() {
        function renderEquations() {
          if (window.katex) {
            // インライン数式のレンダリング
            document.querySelectorAll('.slide-equation-inline[data-latex]').forEach(function(el) {
              const latex = el.getAttribute('data-latex');
              if (latex) {
                try {
                  el.innerHTML = window.katex.renderToString(latex, { 
                    throwOnError: false,
                    errorColor: '#cc0000'
                  });
                } catch (error) {
                  el.innerHTML = '<span class="slide-equation-error">エラー: ' + (error.message || 'レンダリングエラー') + '</span>';
                }
              }
            });
            
            // ブロック数式のレンダリング
            document.querySelectorAll('.slide-equation-block[data-latex]').forEach(function(el) {
              const latex = el.getAttribute('data-latex');
              if (latex) {
                try {
                  el.innerHTML = window.katex.renderToString(latex, { 
                    displayMode: true,
                    throwOnError: false,
                    errorColor: '#cc0000'
                  });
                } catch (error) {
                  el.innerHTML = '<div class="slide-equation-error">エラー: ' + (error.message || 'レンダリングエラー') + '</div>';
                }
              }
            });
          }
        }
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', renderEquations);
        } else {
          // 既に読み込み済みの場合は即座に実行
          setTimeout(renderEquations, 100);
        }
      })();
    </script>`

  // </body>（最後の出現）の前にスクリプトを追加
  return insertBeforeClosingBody(htmlContent, katexScript)
}

/**
 * コードブロックのシンタックスハイライト（Prism.js）を追加
 */
function addCodeBlockHighlighting(htmlContent: string): string {
  // コードブロックが存在するかチェック
  if (!htmlContent.includes('slide-code-block-container')) {
    return htmlContent
  }

  // Prism.jsのCDNスクリプトとスタイル、初期化スクリプトを追加
  const prismScript = `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.css" />
    <script>
      (function() {
        // Prism.jsの自動ロードを設定
        if (window.Prism) {
          window.Prism.plugins.autoloader.languages_path = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/';
        }
        
        // DOMContentLoadedまたは即座に実行
        function highlightCode() {
          if (window.Prism) {
            // すべてのコードブロックをハイライト
            const codeBlocks = document.querySelectorAll('.slide-code-block-container code');
            codeBlocks.forEach(function(codeBlock) {
              window.Prism.highlightElement(codeBlock);
            });
            
            // 行番号を適用
            if (window.Prism.plugins && window.Prism.plugins.lineNumbers) {
              const lineNumberBlocks = document.querySelectorAll('.slide-code-block-container pre.line-numbers');
              lineNumberBlocks.forEach(function(pre) {
                window.Prism.plugins.lineNumbers.resize(pre);
              });
            }
          }
        }
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', highlightCode);
        } else {
          // 既に読み込み済みの場合は即座に実行
          setTimeout(highlightCode, 100);
        }
      })();
    </script>`

  // </body>（最後の出現）の前にスクリプトを追加
  return insertBeforeClosingBody(htmlContent, prismScript)
}

