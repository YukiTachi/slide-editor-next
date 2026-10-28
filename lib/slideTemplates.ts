import type { SlideTemplate } from '@/types'

/**
 * スライド開始タグの正規表現ソース。
 * class 属性が "slide" または "slide ..."（slide-split 等の修飾子付き）の div に一致し、
 * "slide-table-container" のような slide- 接頭辞のクラスには一致しない。
 * スライドを数える・探す処理はすべてこの定義を使う（docs/PDF_EXPORT_RANGE_PLAN.md 2.5）。
 */
export const SLIDE_START_TAG_SOURCE = '<div class="slide(?:\\s[^"]*)?"[^>]*>'

/** g フラグ付き RegExp は lastIndex を持つため、呼び出しごとに新しいインスタンスを返す */
export function createSlideStartRegex(): RegExp {
  return new RegExp(SLIDE_START_TAG_SOURCE, 'g')
}

/**
 * slideStart にある開始タグに対応する </div> の直後の位置を返す（見つからなければ -1）。
 * 深さ計測は開始タグの '>' の次から始めるため、開始タグの長さ（修飾子クラスや属性）に依存しない。
 */
export function findSlideEnd(htmlContent: string, slideStart: number): number {
  const tagEnd = htmlContent.indexOf('>', slideStart)
  if (tagEnd === -1) return -1

  let depth = 1
  let pos = tagEnd + 1

  while (pos < htmlContent.length && depth > 0) {
    const nextDivStart = htmlContent.indexOf('<div', pos)
    const nextDivEnd = htmlContent.indexOf('</div>', pos)

    if (nextDivEnd === -1) break

    if (nextDivStart !== -1 && nextDivStart < nextDivEnd) {
      depth++
      pos = nextDivStart + 4
    } else {
      depth--
      if (depth === 0) {
        return nextDivEnd + 6 // </div>の長さ
      }
      pos = nextDivEnd + 6
    }
  }

  return -1
}

// 定義済みテンプレート
export const DEFAULT_TEMPLATES: SlideTemplate[] = [
  {
    id: 'standard',
    name: '標準',
    description: 'タイトル、サブタイトル、リスト形式の標準的なスライド',
    icon: '📄',
    category: 'basic',
    html: `
    <!-- 新しいスライド -->
    <div class="slide">
        <h1 class="slide-title">新しいスライド</h1>
        
        <h2 class="slide-subtitle">サブタイトル</h2>
        
        <ul class="slide-list">
            <li class="slide-list-item"><span class="highlight">ポイント1</span> - 最初のポイントについて説明</li>
            <li class="slide-list-item"><span class="highlight">ポイント2</span> - 二番目のポイントについて説明</li>
            <li class="slide-list-item"><span class="highlight">ポイント3</span> - 三番目のポイントについて説明</li>
        </ul>
        
        <p class="slide-text template-description">
            ここに追加の説明や詳細情報を記入してください。<br>
            <small class="template-hint">💡 このスライドで画像を挿入すると、自動的に左右2分割レイアウトになります</small>
        </p>
        
        <div class="footer">
            PAGE_NUMBER_PLACEHOLDER
        </div>
    </div>`
  },
  {
    id: 'title-page',
    name: 'タイトルページ',
    description: 'プレゼンテーションの開始ページ用',
    icon: '📋',
    category: 'basic',
    html: `
    <!-- タイトルページ -->
    <div class="slide">
        <div class="title-page-container">
            <h1 class="title-page-title slide-title">プレゼンテーションタイトル</h1>
            <h2 class="title-page-subtitle slide-subtitle">サブタイトル</h2>
            <p class="title-page-meta slide-text">日付や著者名などをここに記入</p>
        </div>
        <div class="footer">
            PAGE_NUMBER_PLACEHOLDER
        </div>
    </div>`
  },
  {
    id: 'two-column',
    name: '2カラム',
    description: '左右にコンテンツを配置、比較や対比に適している',
    icon: '⬌',
    category: 'layout',
    html: `
    <!-- 2カラムレイアウト -->
    <div class="slide">
        <h1 class="slide-title">タイトル</h1>
        <div class="split">
            <div class="left">
                <h2 class="slide-subtitle">左側のコンテンツ</h2>
                <ul class="slide-list">
                    <li class="slide-list-item">項目1</li>
                    <li class="slide-list-item">項目2</li>
                    <li class="slide-list-item">項目3</li>
                </ul>
            </div>
            <div class="right">
                <h2 class="slide-subtitle">右側のコンテンツ</h2>
                <ul class="slide-list">
                    <li class="slide-list-item">項目A</li>
                    <li class="slide-list-item">項目B</li>
                    <li class="slide-list-item">項目C</li>
                </ul>
            </div>
        </div>
        <div class="footer">
            PAGE_NUMBER_PLACEHOLDER
        </div>
    </div>`
  },
  {
    id: 'image-text',
    name: '画像+テキスト',
    description: '画像とテキストの組み合わせ、説明や解説に適している',
    icon: '🖼️',
    category: 'layout',
    html: `
    <!-- 画像+テキストレイアウト -->
    <div class="slide">
        <h1 class="slide-title">タイトル</h1>
        <div class="split">
            <div class="left">
                <h2 class="slide-subtitle">説明</h2>
                <p class="slide-text">ここに画像の説明や詳細な情報を記入してください。</p>
                <ul class="slide-list">
                    <li class="slide-list-item">ポイント1</li>
                    <li class="slide-list-item">ポイント2</li>
                </ul>
            </div>
            <div class="right">
                <p class="slide-text image-placeholder">
                    🖼️ ここに画像を挿入<br>
                    <small>画像を挿入すると自動的に配置されます</small>
                </p>
            </div>
        </div>
        <div class="footer">
            PAGE_NUMBER_PLACEHOLDER
        </div>
    </div>`
  },
  {
    id: 'quote',
    name: 'クォート',
    description: '引用や強調メッセージ用、中央配置の大きなテキスト',
    icon: '💬',
    category: 'special',
    html: `
    <!-- クォートテンプレート -->
    <div class="slide">
        <div class="quote-container">
            <p class="quote-text slide-text">
                "重要な引用やメッセージをここに記入してください。"
            </p>
            <p class="quote-author slide-text">
                — 引用元や著者名
            </p>
        </div>
        <div class="footer">
            PAGE_NUMBER_PLACEHOLDER
        </div>
    </div>`
  },
  {
    id: 'table',
    name: '表',
    description: 'タイトルと表のみのシンプルなレイアウト',
    icon: '📊',
    category: 'layout',
    html: `
    <!-- 表テンプレート -->
    <div class="slide">
        <h1 class="slide-title">タイトル</h1>
        
        <div class="slide-table-container">
            <table class="slide-table slide-table-bordered">
                <caption class="slide-table-caption">表の説明をここに記入</caption>
                <thead>
                    <tr>
                        <th>列1</th>
                        <th>列2</th>
                        <th>列3</th>
                        <th>列4</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>データ1-1</td>
                        <td>データ1-2</td>
                        <td>データ1-3</td>
                        <td>データ1-4</td>
                    </tr>
                    <tr>
                        <td>データ2-1</td>
                        <td>データ2-2</td>
                        <td>データ2-3</td>
                        <td>データ2-4</td>
                    </tr>
                    <tr>
                        <td>データ3-1</td>
                        <td>データ3-2</td>
                        <td>データ3-3</td>
                        <td>データ3-4</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            PAGE_NUMBER_PLACEHOLDER
        </div>
    </div>`
  }
]

export class SlideTemplates {
  static getDefaultHTML(): string {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>A4横向きスライド</title>
    <!-- スライドスタイル -->
    <link rel="stylesheet" href="css/slide-styles.css">
</head>
<body>
    <!-- スライド1 -->
    <div class="slide">
        <h1 class="slide-title">プレゼンテーションタイトル</h1>
        
        <h2 class="slide-subtitle">概要</h2>
        
        <ul class="slide-list">
            <li class="slide-list-item"><span class="highlight">目的</span> - このプレゼンテーションの目的</li>
            <li class="slide-list-item"><span class="highlight">対象</span> - 想定している聴衆</li>
            <li class="slide-list-item"><span class="highlight">構成</span> - 発表の流れと内容</li>
        </ul>
        
        <p class="slide-text center" style="margin-top: 40px; font-size: 28px; color: #3498db;">
            <strong>始めましょう</strong>
        </p>
        
        <div class="footer">
            2025年9月 - スライド 1/3
        </div>
    </div>

    <!-- スライド2 -->
    <div class="slide">
        <h1 class="slide-title">主要なポイント</h1>
        
        <h2 class="slide-subtitle">重要な項目</h2>
        
        <ul class="slide-list">
            <li class="slide-list-item"><span class="highlight">項目1</span> - 最初の重要な点について詳しく説明</li>
            <li class="slide-list-item"><span class="highlight">項目2</span> - 二番目のポイントとその意義</li>
            <li class="slide-list-item"><span class="highlight">項目3</span> - 三番目の要素と影響について</li>
        </ul>
        
        <p class="slide-text" style="margin-top: 40px; font-size: 26px; padding-left: 20px;">
            これらの項目は相互に関連し合い、全体として重要な意味を持ちます。
        </p>
        
        <div class="footer">
            2025年9月 - スライド 2/3
        </div>
    </div>

    <!-- スライド3 -->
    <div class="slide">
        <h1 class="slide-title">まとめ</h1>
        
        <h2 class="slide-subtitle">結論</h2>
        
        <ul class="slide-list">
            <li class="slide-list-item"><span class="highlight">成果</span> - 達成できた結果と効果</li>
            <li class="slide-list-item"><span class="highlight">学習</span> - プロセスで得られた知見</li>
            <li class="slide-list-item"><span class="highlight">次のステップ</span> - 今後の展開と計画</li>
        </ul>
        
        <p class="slide-text center" style="margin-top: 40px; font-size: 32px; color: #27ae60;">
            <strong>ご清聴ありがとうございました</strong>
        </p>
        
        <div class="footer">
            2025年9月 - スライド 3/3
        </div>
    </div>
</body>
</html>`
  }

  // デフォルトテンプレート（標準）を返す（互換性のため）
  static getNewSlideTemplate(): string {
    return this.getTemplate('standard')
  }

  // テンプレートIDからテンプレートのHTMLを取得
  static getTemplate(templateId: string): string {
    const template = DEFAULT_TEMPLATES.find(t => t.id === templateId)
    if (!template) {
      // 見つからない場合は標準テンプレートを返す
      return DEFAULT_TEMPLATES[0].html
    }
    return template.html
  }

  // すべてのテンプレートを取得
  static getAllTemplates(): SlideTemplate[] {
    return DEFAULT_TEMPLATES
  }

  // カテゴリでフィルタリング
  static getTemplatesByCategory(category: SlideTemplate['category']): SlideTemplate[] {
    return DEFAULT_TEMPLATES.filter(t => t.category === category)
  }

  // テンプレートIDからテンプレート情報を取得
  static getTemplateById(templateId: string): SlideTemplate | undefined {
    return DEFAULT_TEMPLATES.find(t => t.id === templateId)
  }

  // ページ番号を振り直す関数
  static updatePageNumbers(htmlContent: string): string {
    const slideStartRegex = createSlideStartRegex()
    const footerRegex = /<div class="footer">\s*([^<]*?)\s*<\/div>/g

    let slideCount = 0
    let match

    // スライド数をカウント
    while ((match = slideStartRegex.exec(htmlContent)) !== null) {
      slideCount++
    }

    // 各フッターのページ番号を更新
    let updatedContent = htmlContent
    let currentSlide = 1

    // フッターを順番に更新
    updatedContent = updatedContent.replace(footerRegex, (match, content) => {
      const pageNumber = `${currentSlide}/${slideCount}`
      const currentDate = new Date().getFullYear() + '年' + (new Date().getMonth() + 1) + '月'

      // プレースホルダーがある場合は置換
      if (content.includes('PAGE_NUMBER_PLACEHOLDER')) {
        const newFooter = `${currentDate} - スライド ${pageNumber}`
        currentSlide++
        return `<div class="footer">
            ${newFooter}
        </div>`
      } else {
        // 既存のフッターのページ番号部分のみを更新
        let updatedFooter = content.trim()

        // 既存のページ番号パターンを検索して置換
        const pageNumberPattern = /\d+\/\d+/
        if (pageNumberPattern.test(updatedFooter)) {
          updatedFooter = updatedFooter.replace(pageNumberPattern, pageNumber)
        } else {
          // ページ番号がない場合は追加
          updatedFooter = updatedFooter.replace(/(\d{4}年\d+月)/, `$1 - スライド ${pageNumber}`)
        }

        currentSlide++
        return `<div class="footer">
            ${updatedFooter}
        </div>`
      }
    })

    return updatedContent
  }

  // スライド挿入位置を検索する関数
  static findSlideInsertPosition(htmlContent: string, cursorPosition: number): number {
    const slideStartRegex = createSlideStartRegex()

    // 全てのスライドの位置（開始・終了）を取得
    const slidePositions: Array<{ start: number; end: number }> = []
    let match

    while ((match = slideStartRegex.exec(htmlContent)) !== null) {
      slidePositions.push({
        start: match.index,
        end: findSlideEnd(htmlContent, match.index)
      })
    }

    // カーソル位置がどのスライド内にあるか判定
    for (let i = 0; i < slidePositions.length; i++) {
      const slide = slidePositions[i]
      if (slide.end !== -1 && cursorPosition >= slide.start && cursorPosition <= slide.end) {
        // カーソルがこのスライド内にある場合、このスライドの後に挿入
        return slide.end
      }
    }

    // カーソルがスライド内にない場合、最後のスライドの後に追加
    if (slidePositions.length > 0) {
      const lastSlide = slidePositions[slidePositions.length - 1]
      if (lastSlide.end !== -1) {
        return lastSlide.end
      }
    }

    // フォールバック: HTMLの最後に追加
    return htmlContent.length
  }
}

