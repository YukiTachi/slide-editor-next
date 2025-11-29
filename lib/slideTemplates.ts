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
        <h1>プレゼンテーションタイトル</h1>
        
        <h2>概要</h2>
        
        <ul>
            <li><span class="highlight">目的</span> - このプレゼンテーションの目的</li>
            <li><span class="highlight">対象</span> - 想定している聴衆</li>
            <li><span class="highlight">構成</span> - 発表の流れと内容</li>
        </ul>
        
        <p class="center" style="margin-top: 40px; font-size: 28px; color: #3498db;">
            <strong>始めましょう</strong>
        </p>
        
        <div class="footer">
            2025年9月 - スライド 1/3
        </div>
    </div>

    <!-- スライド2 -->
    <div class="slide">
        <h1>主要なポイント</h1>
        
        <h2>重要な項目</h2>
        
        <ul>
            <li><span class="highlight">項目1</span> - 最初の重要な点について詳しく説明</li>
            <li><span class="highlight">項目2</span> - 二番目のポイントとその意義</li>
            <li><span class="highlight">項目3</span> - 三番目の要素と影響について</li>
        </ul>
        
        <p style="margin-top: 40px; font-size: 26px; padding-left: 20px;">
            これらの項目は相互に関連し合い、全体として重要な意味を持ちます。
        </p>
        
        <div class="footer">
            2025年9月 - スライド 2/3
        </div>
    </div>

    <!-- スライド3 -->
    <div class="slide">
        <h1>まとめ</h1>
        
        <h2>結論</h2>
        
        <ul>
            <li><span class="highlight">成果</span> - 達成できた結果と効果</li>
            <li><span class="highlight">学習</span> - プロセスで得られた知見</li>
            <li><span class="highlight">次のステップ</span> - 今後の展開と計画</li>
        </ul>
        
        <p class="center" style="margin-top: 40px; font-size: 32px; color: #27ae60;">
            <strong>ご清聴ありがとうございました</strong>
        </p>
        
        <div class="footer">
            2025年9月 - スライド 3/3
        </div>
    </div>
</body>
</html>`
  }

  static getNewSlideTemplate(): string {
    return `
    <!-- 新しいスライド -->
    <div class="slide">
        <h1>新しいスライド</h1>
        
        <h2>サブタイトル</h2>
        
        <ul>
            <li><span class="highlight">ポイント1</span> - 最初のポイントについて説明</li>
            <li><span class="highlight">ポイント2</span> - 二番目のポイントについて説明</li>
            <li><span class="highlight">ポイント3</span> - 三番目のポイントについて説明</li>
        </ul>
        
        <p style="margin-top: 40px; font-size: 24px; padding-left: 20px;">
            ここに追加の説明や詳細情報を記入してください。<br>
            <small style="color: #7f8c8d;">💡 このスライドで画像を挿入すると、自動的に左右2分割レイアウトになります</small>
        </p>
        
        <div class="footer">
            PAGE_NUMBER_PLACEHOLDER
        </div>
    </div>`
  }

  // ページ番号を振り直す関数
  static updatePageNumbers(htmlContent: string): string {
    const slideStartRegex = /<div class="slide">/g
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
    const slideStartRegex = /<div class="slide">/g

    // 全てのスライドの位置を取得
    const slidePositions: Array<{ start: number; end: number }> = []
    let match

    while ((match = slideStartRegex.exec(htmlContent)) !== null) {
      slidePositions.push({
        start: match.index,
        end: -1 // 後で設定
      })
    }

    // 各スライドの終了位置を特定
    slidePositions.forEach((slide) => {
      let depth = 1 // 開始タグをカウント
      let searchPos = slide.start + '<div class="slide">'.length

      while (depth > 0 && searchPos < htmlContent.length) {
        const nextDivStart = htmlContent.indexOf('<div', searchPos)
        const nextDivEnd = htmlContent.indexOf('</div>', searchPos)

        if (nextDivEnd === -1) break

        if (nextDivStart !== -1 && nextDivStart < nextDivEnd) {
          // divの開始タグが見つかった
          depth++
          searchPos = nextDivStart + 4
        } else {
          // divの終了タグが見つかった
          depth--
          if (depth === 0) {
            slide.end = nextDivEnd + 6 // </div>の長さ
            break
          }
          searchPos = nextDivEnd + 6
        }
      }
    })

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

