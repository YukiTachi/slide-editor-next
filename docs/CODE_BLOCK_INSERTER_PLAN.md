# コードブロック挿入機能 実装計画

## 概要

スライドにコードブロックを挿入する機能を実装します。エンジニア向けのプレゼンや技術資料作成を支援し、シンタックスハイライト付きでコードを表示できるようにします。

## 実装目標

- スライドにコードブロックを挿入できる
- 複数のプログラミング言語に対応（JavaScript、Python、HTML、CSS、Java、C++、Go、Rustなど）
- シンタックスハイライト付きでコードを表示
- 行番号の表示/非表示を選択可能
- コピーボタンなどの便利機能を提供
- 既存の表・グラフ挿入機能と同様のUX

## 技術スタック

### シンタックスハイライトライブラリ

**Prism.js** を使用（軽量で使いやすい）

- **理由**: 
  - 軽量でパフォーマンスが良い
  - 多数の言語に対応
  - テーマが豊富
  - 既存のCodeMirrorとは独立して動作（プレビュー表示用）

- **インストール**:
  ```bash
  npm install prismjs
  npm install --save-dev @types/prismjs
  ```

### 既存ライブラリとの統合

- CodeMirror: エディタのシンタックスハイライト（既存）
- Prism.js: プレビュー表示時のコードブロックのハイライト（新規）

## 実装構成

### 1. 型定義 (`types/index.ts`)

```typescript
// コードブロックのスタイル
export type CodeBlockStyle = 
  | 'default'       // デフォルト（背景色付き）
  | 'minimal'       // ミニマル（ボーダーのみ）
  | 'dark'          // ダークテーマ
  | 'transparent'   // 透明背景

// プログラミング言語
export type CodeLanguage = 
  | 'javascript' | 'typescript' | 'jsx' | 'tsx'
  | 'python' | 'java' | 'cpp' | 'c' | 'csharp'
  | 'html' | 'css' | 'scss' | 'sass'
  | 'json' | 'xml' | 'markdown'
  | 'go' | 'rust' | 'php' | 'ruby' | 'swift'
  | 'sql' | 'bash' | 'shell' | 'yaml'
  | 'plaintext'  // プレーンテキスト（ハイライトなし）

// コードブロックの設定
export interface CodeBlockConfig {
  code: string              // コード内容
  language: CodeLanguage    // プログラミング言語
  style: CodeBlockStyle     // スタイル
  showLineNumbers: boolean  // 行番号を表示するか
  startLineNumber?: number  // 開始行番号（デフォルト: 1）
  caption?: string          // キャプション（任意）
  maxHeight?: number        // 最大高さ（px、スクロール表示用）
}
```

### 2. プロセッサーファイル (`lib/codeBlockProcessor.ts`)

#### 機能

1. **コードブロックHTML生成関数** (`generateCodeBlockHTML`)
   - Prism.jsを使用したシンタックスハイライト
   - 行番号表示の対応
   - スタイルの適用
   - コピーボタンの実装

2. **エディタへの挿入関数** (`insertCodeBlockToHTML`)
   - カーソル位置を検出
   - 現在のスライドを特定
   - フッターの前に挿入（既存の表・グラフ挿入と同じパターン）

3. **Prism.jsの初期化関数** (`initializePrism`)
   - Prism.jsの言語モジュールを動的に読み込み
   - テーマの適用

#### 実装のポイント

- HTMLエスケープ処理を適切に行う
- XSS対策を考慮した実装
- プレビュー表示時にPrism.jsを実行する仕組み

### 3. モーダルコンポーネント (`components/CodeBlockInserter/CodeBlockInserterModal.tsx`)

#### UI構成

1. **言語選択**
   - ドロップダウンまたはセレクトボックス
   - 主要言語をグループ化して表示

2. **コード入力エリア**
   - テキストエリア（複数行対応）
   - 行番号表示（オプション）
   - 基本的なコード編集支援

3. **プレビューエリア**
   - リアルタイムでコードブロックの見た目を確認
   - Prism.jsでハイライトされた状態を表示

4. **オプション設定**
   - スタイル選択（ラジオボタンまたはセレクト）
   - 行番号表示のON/OFF
   - 開始行番号の設定（オプション）
   - キャプション入力（オプション）
   - 最大高さの設定（オプション）

5. **アクションボタン**
   - 「挿入」ボタン
   - 「キャンセル」ボタン
   - ESCキーで閉じる

#### 状態管理

- コード内容 (`code: string`)
- 選択言語 (`language: CodeLanguage`)
- スタイル (`style: CodeBlockStyle`)
- 行番号表示 (`showLineNumbers: boolean`)
- 開始行番号 (`startLineNumber: number`)
- キャプション (`caption: string`)
- 最大高さ (`maxHeight: number | undefined`)

### 4. CSSスタイル (`components/CodeBlockInserter/CodeBlockInserterModal.module.css`)

- モーダルのレイアウト
- コード入力エリアのスタイル
- プレビューエリアのスタイル
- レスポンシブ対応

### 5. コードブロック表示用CSS (`styles/code-block.css`)

#### Prism.jsテーマのインポート

```css
/* Prism.jsテーマのインポート（またはカスタムテーマ） */
@import 'prismjs/themes/prism.css';
@import 'prismjs/themes/prism-tomorrow.css'; /* ダークテーマ用 */
```

#### カスタムスタイル

```css
/* コードブロックコンテナ */
.slide-code-block-container {
  margin: 1rem 0;
  border-radius: 4px;
  overflow: hidden;
}

/* コードブロックのスタイルバリエーション */
.slide-code-block-default {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
}

.slide-code-block-minimal {
  background-color: transparent;
  border: 1px solid #ddd;
}

.slide-code-block-dark {
  background-color: #2d2d2d;
  color: #f8f8f2;
}

/* 行番号表示 */
.slide-code-block-line-numbers {
  /* Prism.jsのline-numbersプラグインのスタイル */
}

/* コピーボタン */
.slide-code-block-copy-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.5rem;
  background-color: rgba(255, 255, 255, 0.8);
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

/* キャプション */
.slide-code-block-caption {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #666;
  text-align: center;
}

/* スクロール可能なコードブロック */
.slide-code-block-scrollable {
  max-height: 400px;
  overflow-y: auto;
}
```

### 6. メニュー統合 (`components/Menu/HamburgerMenu.tsx`)

#### 追加内容

1. **propsに追加**
   ```typescript
   onCodeBlockInsertRequest?: () => void
   ```

2. **メニューボタンの追加**
   - 「🖼️ 画像」セクションに「💻 コードブロックを挿入」ボタンを追加
   - 表・グラフの挿入ボタンの近くに配置

### 7. 親コンポーネント統合 (`app/page.tsx`)

#### 追加内容

1. **状態管理**
   ```typescript
   const [isCodeBlockInserterOpen, setIsCodeBlockInserterOpen] = useState(false)
   ```

2. **HamburgerMenuにprops追加**
   ```typescript
   onCodeBlockInsertRequest={() => setIsCodeBlockInserterOpen(true)}
   ```

3. **CodeBlockInserterModalの追加**
   ```typescript
   <CodeBlockInserterModal
     isOpen={isCodeBlockInserterOpen}
     onClose={() => setIsCodeBlockInserterOpen(false)}
     htmlContent={htmlContent}
     setHtmlContent={setHtmlContent}
     editorRef={editorRef}
     onStatusUpdate={setStatusMessage}
   />
   ```

### 8. プレビュー処理の拡張 (`lib/htmlProcessor.ts`)

#### 追加機能

1. **Prism.jsの初期化**
   - プレビュー生成時にPrism.jsを実行
   - コードブロックに対してハイライトを適用

2. **スクリプトの追加**
   - Prism.jsのスクリプトをHTMLに埋め込み
   - 必要に応じて言語モジュールも動的に読み込み

## 実装手順

### Phase 1: 基礎実装

1. **依存関係のインストール**
   ```bash
   npm install prismjs
   npm install --save-dev @types/prismjs
   ```

2. **型定義の追加** (`types/index.ts`)
   - `CodeBlockStyle`
   - `CodeLanguage`
   - `CodeBlockConfig`

3. **プロセッサーファイルの作成** (`lib/codeBlockProcessor.ts`)
   - `generateCodeBlockHTML`関数
   - `insertCodeBlockToHTML`関数
   - 基本的なHTML生成ロジック

### Phase 2: UI実装

4. **モーダルコンポーネントの作成** (`components/CodeBlockInserter/CodeBlockInserterModal.tsx`)
   - 基本的なUI構造
   - 言語選択UI
   - コード入力エリア
   - オプション設定UI

5. **CSSスタイルの作成**
   - `CodeBlockInserterModal.module.css`
   - `styles/code-block.css`

### Phase 3: 統合

6. **メニューへの統合** (`components/Menu/HamburgerMenu.tsx`)
   - propsの追加
   - メニューボタンの追加

7. **親コンポーネントへの統合** (`app/page.tsx`)
   - 状態管理
   - モーダルの表示制御

### Phase 4: シンタックスハイライト

8. **Prism.jsの統合**
   - Prism.jsの初期化処理
   - 言語モジュールの読み込み
   - プレビュー処理への統合 (`lib/htmlProcessor.ts`)

9. **スタイルの実装**
   - Prism.jsテーマの適用
   - カスタムスタイルの実装
   - ダークモード対応

### Phase 5: 機能強化

10. **追加機能の実装**
    - コピーボタンの実装
    - 行番号表示の実装（Prism.js line-numbersプラグイン）
    - スクロール可能なコードブロック
    - キャプション機能

11. **エラーハンドリング**
    - バリデーション
    - エラーメッセージの表示

### Phase 6: テスト・調整

12. **動作確認**
    - 各種言語でのテスト
    - スタイルの確認
    - レスポンシブ対応の確認
    - ダークモードでの確認

13. **パフォーマンス最適化**
    - Prism.jsの遅延読み込み
    - 必要最小限の言語モジュールのみ読み込み

## ファイル構成

```
slide-editor-nextjs/
├── components/
│   └── CodeBlockInserter/
│       ├── CodeBlockInserterModal.tsx        # モーダルコンポーネント
│       └── CodeBlockInserterModal.module.css # モーダルのスタイル
├── lib/
│   └── codeBlockProcessor.ts                 # コードブロック処理ロジック
├── styles/
│   └── code-block.css                        # コードブロック表示用スタイル
└── types/
    └── index.ts                              # 型定義（追加）
```

## 実装時の注意点

### セキュリティ

1. **XSS対策**
   - コード内容を適切にエスケープ
   - Prism.jsを使用する際も、入力値をサニタイズ

2. **HTMLエスケープ**
   - `<script>`タグなどが実行されないように注意

### パフォーマンス

1. **Prism.jsの読み込み**
   - 必要な言語モジュールのみ動的に読み込む
   - 初回読み込み時のパフォーマンスを考慮

2. **大量のコードブロック**
   - プレビュー生成時の処理時間を考慮
   - 必要に応じて非同期処理を検討

### UX

1. **コード入力の快適性**
   - テキストエリアに適切なサイズ設定
   - フォントサイズの調整可能

2. **プレビューのリアルタイム性**
   - 入力内容に応じてプレビューを更新
   - パフォーマンスを考慮した更新頻度

## 将来の拡張案

1. **コードブロックの編集機能**
   - 既存のコードブロックを選択して編集

2. **コードフォーマッター連携**
   - Prettierなどのフォーマッターと連携

3. **シンタックスチェック**
   - コードの構文エラーを検出

4. **コードスニペット機能**
   - よく使うコードをスニペットとして保存

5. **行ハイライト機能**
   - 特定の行を強調表示

## 参考実装

既存の実装パターンを参考にする：

- `components/TableInserter/TableInserterModal.tsx`
- `components/ChartInserter/ChartInserterModal.tsx`
- `lib/tableProcessor.ts`
- `lib/chartProcessor.ts`

これらの実装と同じパターンで実装することで、一貫性のあるUXを提供できます。

