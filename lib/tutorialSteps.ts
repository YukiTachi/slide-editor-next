import type { TutorialStep } from '@/types'

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'スライドエディタへようこそ',
    content: `
      <p>HTMLベースのA4横向きスライド作成ツールです。</p>
      <p>このチュートリアルでは以下の内容を学びます:</p>
      <ul>
        <li>画面レイアウトの理解</li>
        <li>主要機能の使い方</li>
        <li>効率的な操作方法</li>
      </ul>
    `,
    skipable: true
  },
  {
    id: 'layout',
    title: '画面レイアウト',
    content: `
      <p>画面は左右に分かれています:</p>
      <ul>
        <li><strong>左側</strong>: HTMLエディタ（編集エリア）</li>
        <li><strong>右側</strong>: プレビュー（リアルタイム表示）</li>
        <li><strong>中央</strong>: リサイザー（幅を調整可能）</li>
      </ul>
      <p>エディタに入力すると、リアルタイムでプレビューが更新されます。</p>
    `,
    highlightElement: 'div.container',
    highlightPosition: 'center',
    skipable: true
  },
  {
    id: 'menu',
    title: 'ハンバーガーメニュー',
    content: `
      <p>右上のハンバーガーメニューから各種機能にアクセスできます。</p>
      <p>主要機能:</p>
      <ul>
        <li>📝 <strong>編集</strong>: スライド追加、元に戻す、やり直し</li>
        <li>🖼️ <strong>画像</strong>: 画像挿入、画像管理</li>
        <li>💾 <strong>データ</strong>: 復元、HTMLコピー</li>
        <li>🔗 <strong>表示</strong>: 別ウィンドウでプレビュー</li>
      </ul>
    `,
    highlightElement: 'button[aria-label="メニュー"]',
    highlightPosition: 'bottom',
    skipable: true
  },
  {
    id: 'image',
    title: '画像の挿入',
    content: `
      <p>画像を挿入する方法は3つあります:</p>
      <ol>
        <li>メニューから「画像挿入」を選択</li>
        <li>ドラッグ&ドロップ（推奨）</li>
        <li>キーボードショートカット（<kbd>Ctrl+I</kbd> / <kbd>Cmd+I</kbd>）</li>
      </ol>
      <p>画像は外部ファイルまたはBase64形式で保存できます。</p>
    `,
    skipable: true
  },
  {
    id: 'autosave',
    title: '自動保存機能',
    content: `
      <p>編集内容は自動的に保存されます。</p>
      <ul>
        <li>30秒ごとに自動保存</li>
        <li>ブラウザを閉じても復元可能</li>
        <li>ステータスバーに保存状態が表示されます</li>
      </ul>
      <p>メニューの「復元」ボタンから、以前の状態に戻すことができます。</p>
    `,
    highlightElement: '[class*="statusBar"]',
    highlightPosition: 'top',
    skipable: true
  },
  {
    id: 'shortcuts',
    title: 'キーボードショートカット',
    content: `
      <p>キーボードショートカットで効率的に操作できます:</p>
      <ul>
        <li><kbd>Ctrl+Z</kbd> / <kbd>Cmd+Z</kbd>: 元に戻す</li>
        <li><kbd>Ctrl+Y</kbd> / <kbd>Cmd+Y</kbd>: やり直す</li>
        <li><kbd>Ctrl+S</kbd> / <kbd>Cmd+S</kbd>: HTMLコピー</li>
        <li><kbd>Ctrl+I</kbd> / <kbd>Cmd+I</kbd>: 画像挿入</li>
        <li><kbd>Ctrl+M</kbd> / <kbd>Cmd+M</kbd>: スライド追加</li>
      </ul>
      <p>メニューからショートカット一覧を確認・カスタマイズできます。</p>
    `,
    skipable: true
  }
]

