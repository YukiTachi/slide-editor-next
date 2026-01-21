# 数式入力支援（LaTeX）機能 実装計画

## 概要

スライドにLaTeX数式を挿入する機能を実装します。技術文書、数学・科学系のプレゼンや教育資料作成を支援し、美しく正確な数式を表示できるようにします。

## 実装目標

- スライドにLaTeX数式を挿入できる
- インライン数式（文中に埋め込む）とブロック数式（独立した行）の両方に対応
- リアルタイムプレビュー機能で数式の見た目を確認できる
- よく使う数式のテンプレートを提供
- 既存の表・グラフ・コードブロック挿入機能と同様のUX
- エラー検出・表示機能でLaTeX構文エラーを分かりやすく表示

## 技術スタック

### 数式レンダリングライブラリ

**KaTeX** を使用（軽量で高速、レンダリングが速い）

- **理由**: 
  - MathJaxより軽量で高速（レンダリング速度が約5倍）
  - クライアントサイドでのレンダリングに最適
  - インライン数式とブロック数式の両方をサポート
  - エラー表示が分かりやすい
  - CSSとJavaScriptのみで動作（サーバー不要）

- **インストール**:
  ```bash
  npm install katex
  npm install --save-dev @types/katex
  ```

- **CSSの読み込み**:
  - Next.jsでは`app/layout.tsx`または`styles/globals.css`でインポート
  - `app/layout.tsx`での読み込み例:
    ```typescript
    import 'katex/dist/katex.min.css'
    ```
  - または`styles/globals.css`でインポート:
    ```css
    @import 'katex/dist/katex.min.css';
    ```

### 既存ライブラリとの統合

- CodeMirror: エディタのシンタックスハイライト（既存）
- KaTeX: プレビュー表示時の数式レンダリング（新規）

## 実装構成

### 1. 型定義 (`types/index.ts`)

```typescript
// 数式の表示タイプ
export type EquationDisplayType = 
  | 'inline'      // インライン数式（文中に埋め込む: $...$）
  | 'block'       // ブロック数式（独立した行: $$...$$）

// 数式の配置
export type EquationAlignment = 
  | 'left'        // 左寄せ
  | 'center'      // 中央揃え（デフォルト）
  | 'right'       // 右寄せ

// 数式の設定
export interface EquationConfig {
  latex: string              // LaTeXコード
  displayType: EquationDisplayType  // インライン or ブロック
  alignment?: EquationAlignment     // 配置（ブロック数式のみ）
  caption?: string                  // キャプション（任意、ブロック数式のみ）
  label?: string                   // ラベル（参照用、ブロック数式のみ）
}

// 注意: HTML生成時に、元のLaTeXコードをdata-latex属性に保存することで、
// 将来の編集機能に対応できる
// 例: <div class="slide-equation-block" data-latex="\int_{a}^{b} f(x) dx">...</div>
```

### 2. プロセッサーファイル (`lib/equationProcessor.ts`)

#### 機能

1. **数式HTML生成関数** (`generateEquationHTML`)
   - KaTeXを使用した数式レンダリング
   - インライン数式とブロック数式の処理
   - エラーハンドリング（無効なLaTeXコードの場合）
   - HTMLエスケープ処理
   - 元のLaTeXコードを`data-latex`属性に保存（将来の編集機能のため）

2. **エディタへの挿入関数** (`insertEquationToHTML`)
   - カーソル位置を検出
   - 現在のスライドを特定
   - フッターの前に挿入（既存の表・グラフ・コードブロック挿入と同じパターン）
   - インライン数式の場合は、カーソル位置に直接挿入

3. **数式の検証関数** (`validateLatex`)
   - LaTeX構文の基本的な検証
   - KaTeXのエラーメッセージを分かりやすく変換
   - KaTeXでサポートされていないコマンド（`\usepackage`など）の検出
   - エラーメッセージにサポート状況の情報を追加

#### 実装のポイント

- HTMLエスケープ処理を適切に行う
- XSS対策を考慮した実装
- KaTeXのエラーハンドリング（無効なLaTeXコードの場合）
- プレビュー表示時にKaTeXを実行する仕組み

### 3. モーダルコンポーネント (`components/EquationInserter/EquationInserterModal.tsx`)

#### UI構成

1. **数式タイプ選択**
   - ラジオボタンまたはタブ: 「インライン数式」と「ブロック数式」
   - デフォルト: ブロック数式

2. **LaTeX入力エリア**
   - テキストエリア（複数行対応）
   - フォント: 等幅フォント（Monaco, 'Courier New'など）
   - プレースホルダー: 例を表示（例: `E = mc^2`、`\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}`）

3. **リアルタイムプレビューエリア**
   - 入力内容に応じてリアルタイムで数式をレンダリング
   - エラーがある場合はエラーメッセージを表示
   - ブロック数式の場合は配置も反映

4. **よく使う数式テンプレート**
   - ボタンまたはドロップダウンでテンプレートを選択
   - 選択したテンプレートが入力エリアに挿入される
   - テンプレート例:
     - 分数: `\frac{a}{b}`
     - 平方根: `\sqrt{x}`
     - 積分: `\int_{a}^{b} f(x) dx`
     - 総和: `\sum_{i=1}^{n} x_i`
     - 極限: `\lim_{x \to \infty} f(x)`
     - 行列: `\begin{pmatrix} a & b \\ c & d \end{pmatrix}`
     - ベクトル: `\vec{v} = (x, y, z)`
     - 記号（ギリシャ文字）: `\alpha, \beta, \gamma, \pi, \theta, etc.`

5. **オプション設定（ブロック数式のみ）**
   - 配置選択（左/中央/右）
   - キャプション入力（オプション）
   - ラベル入力（オプション、参照用）

6. **アクションボタン**
   - 「挿入」ボタン
   - 「キャンセル」ボタン
   - ESCキーで閉じる

#### 状態管理

- LaTeXコード (`latex: string`)
- 表示タイプ (`displayType: EquationDisplayType`)
- 配置 (`alignment: EquationAlignment`)
- キャプション (`caption: string`)
- ラベル (`label: string`)
- エラーメッセージ (`error: string | null`)
- プレビューHTML (`previewHtml: string`)

### 4. CSSスタイル (`components/EquationInserter/EquationInserterModal.module.css`)

- モーダルのレイアウト
- LaTeX入力エリアのスタイル（等幅フォント）
- プレビューエリアのスタイル
- エラーメッセージのスタイル
- テンプレートボタンのスタイル
- レスポンシブ対応

### 5. 数式表示用CSS

#### KaTeXのCSS読み込み

**重要**: Next.jsでは`styles/equation.css`での`@import`が動作しない場合があります。
代わりに`app/layout.tsx`で直接インポートします。

**`app/layout.tsx`での読み込み**:
```typescript
import 'katex/dist/katex.min.css'
import '../styles/equation.css'  // カスタムスタイル
```

#### カスタムスタイル (`styles/equation.css`)

```css
/* インライン数式コンテナ */
.slide-equation-inline {
  display: inline;
  margin: 0 0.2em;
}

/* data-latex属性を持つ要素のスタイル調整（必要に応じて） */
.slide-equation-inline[data-latex] {
  /* 編集機能用のスタイル */
}

/* ブロック数式コンテナ */
.slide-equation-block {
  margin: 1.5rem 0;
  padding: 1rem;
  text-align: center;
}

/* data-latex属性を持つ要素のスタイル調整（必要に応じて） */
.slide-equation-block[data-latex] {
  /* 編集機能用のスタイル */
}

.slide-equation-block-left {
  text-align: left;
}

.slide-equation-block-right {
  text-align: right;
}

/* 数式キャプション */
.slide-equation-caption {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #666;
  text-align: center;
  font-style: italic;
}

.slide-equation-caption-left {
  text-align: left;
}

.slide-equation-caption-right {
  text-align: right;
}

/* エラー表示 */
.slide-equation-error {
  padding: 0.5rem;
  background-color: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c33;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
  .slide-equation-caption {
    color: #999;
  }
  
  .slide-equation-error {
    background-color: #422;
    border-color: #633;
    color: #f99;
  }
}
```

### 6. メニュー統合 (`components/Menu/HamburgerMenu.tsx`)

#### 追加内容

1. **propsに追加**
   ```typescript
   onEquationInsertRequest?: () => void
   ```

2. **メニューボタンの追加**
   - 「🖼️ 画像」セクションに「📐 数式を挿入」ボタンを追加
   - コードブロック挿入ボタンの近くに配置

3. **キーボードショートカット（オプション）**
   - 数式挿入のショートカット（例: `Ctrl+M`）を検討
   - 既存のキーボードショートカットシステム（`components/KeyboardShortcuts/`）に統合

### 7. 親コンポーネント統合 (`app/page.tsx`)

#### 追加内容

1. **状態管理**
   ```typescript
   const [isEquationInserterOpen, setIsEquationInserterOpen] = useState(false)
   ```

2. **HamburgerMenuにprops追加**
   ```typescript
   onEquationInsertRequest={() => setIsEquationInserterOpen(true)}
   ```

3. **EquationInserterModalの追加**
   ```typescript
   <EquationInserterModal
     isOpen={isEquationInserterOpen}
     onClose={() => setIsEquationInserterOpen(false)}
     htmlContent={htmlContent}
     setHtmlContent={setHtmlContent}
     editorRef={editorRef}
     onStatusUpdate={setStatusMessage}
   />
   ```

### 8. プレビュー処理の拡張 (`lib/htmlProcessor.ts`)

#### 追加機能

1. **KaTeXの初期化関数** (`addEquationRendering`)
   - Prism.jsの実装パターン（`addCodeBlockHighlighting`関数）と同じ方式で実装
   - プレビュー生成時に実行
   - インライン数式（`<span class="slide-equation-inline" data-latex="...">...</span>`）に対してレンダリング
   - ブロック数式（`<div class="slide-equation-block" data-latex="...">...</div>`）に対してレンダリング

2. **スクリプトの追加**
   - KaTeXのCDNスクリプトをHTMLに埋め込み（`</body>`タグの前）
   - `data-latex`属性を持つ要素を検出
   - KaTeXの`renderToString`または`render`メソッドを使用してレンダリング
   - エラーがある場合は、エラーメッセージを表示

3. **実装パターン**
   ```typescript
   function addEquationRendering(htmlContent: string): string {
     if (!htmlContent.includes('slide-equation-')) {
       return htmlContent
     }
     
     const katexScript = `
       <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
       <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
       <script>
         (function() {
           function renderEquations() {
             if (window.katex) {
               // インライン数式のレンダリング
               document.querySelectorAll('.slide-equation-inline[data-latex]').forEach(function(el) {
                 const latex = el.getAttribute('data-latex');
                 try {
                   el.innerHTML = window.katex.renderToString(latex, { throwOnError: false });
                 } catch (error) {
                   el.innerHTML = '<span class="slide-equation-error">エラー: ' + error.message + '</span>';
                 }
               });
               
               // ブロック数式のレンダリング
               document.querySelectorAll('.slide-equation-block[data-latex]').forEach(function(el) {
                 const latex = el.getAttribute('data-latex');
                 try {
                   el.innerHTML = window.katex.renderToString(latex, { 
                     displayMode: true,
                     throwOnError: false 
                   });
                 } catch (error) {
                   el.innerHTML = '<div class="slide-equation-error">エラー: ' + error.message + '</div>';
                 }
               });
             }
           }
           
           if (document.readyState === 'loading') {
             document.addEventListener('DOMContentLoaded', renderEquations);
           } else {
             setTimeout(renderEquations, 100);
           }
         })();
       </script>`
     
     if (htmlContent.includes('</body>')) {
       return htmlContent.replace('</body>', katexScript + '</body>')
     } else {
       return htmlContent + katexScript
     }
   }
   ```

4. **`processHTMLForPreview`関数への統合**
   - `addEquationRendering`関数を`processHTMLForPreview`関数内で呼び出す
   - 既存の`addCodeBlockHighlighting`関数の後に実行

## 実装手順

### Phase 1: 基礎実装

1. **依存関係のインストール**
   ```bash
   npm install katex
   npm install --save-dev @types/katex
   ```

2. **型定義の追加** (`types/index.ts`)
   - `EquationDisplayType`
   - `EquationAlignment`
   - `EquationConfig`

3. **プロセッサーファイルの作成** (`lib/equationProcessor.ts`)
   - `generateEquationHTML`関数
   - `insertEquationToHTML`関数
   - `validateLatex`関数
   - 基本的なHTML生成ロジック

### Phase 2: UI実装

4. **モーダルコンポーネントの作成** (`components/EquationInserter/EquationInserterModal.tsx`)
   - 基本的なUI構造
   - 数式タイプ選択UI（インライン/ブロック）
   - LaTeX入力エリア
   - **リアルタイムプレビューエリア（クライアント側で直接KaTeXを呼び出し）**
     - `useEffect`フックで入力内容を監視
     - デバウンス処理（300ms程度）を実装
     - クライアント側で`katex.renderToString`を直接呼び出してプレビューを生成
   - よく使う数式テンプレート
   - オプション設定UI（ブロック数式のみ）

5. **CSSスタイルの作成**
   - `EquationInserterModal.module.css`
   - `styles/equation.css`（カスタムスタイル）
   - `app/layout.tsx`でKaTeXのCSSをインポート（`import 'katex/dist/katex.min.css'`）

### Phase 3: 統合

6. **メニューへの統合** (`components/Menu/HamburgerMenu.tsx`)
   - propsの追加
   - メニューボタンの追加

7. **親コンポーネントへの統合** (`app/page.tsx`)
   - 状態管理
   - モーダルの表示制御

### Phase 4: KaTeX統合

8. **KaTeXの統合**
   - `app/layout.tsx`でKaTeXのCSSをインポート
   - `lib/htmlProcessor.ts`に`addEquationRendering`関数を実装
   - `processHTMLForPreview`関数に統合
   - モーダル内のリアルタイムプレビュー実装（クライアント側で直接KaTeXを呼び出し）

9. **スタイルの実装**
   - カスタムスタイルの実装（`styles/equation.css`）
   - ダークモード対応

### Phase 5: 機能強化

10. **追加機能の実装**
    - よく使う数式テンプレートの充実
    - エラーメッセージの改善
    - キャプション機能
    - ラベル機能（参照用）

11. **エラーハンドリング**
    - LaTeX構文のバリデーション
    - KaTeXのエラーメッセージをユーザーフレンドリーに変換
    - サポートされていないコマンドの検出と代替案の提示
    - 無効なLaTeXコードの場合の処理

### Phase 6: テスト・調整

12. **動作確認**
    - 各種LaTeX構文でのテスト
    - インライン数式とブロック数式の確認
    - エラーハンドリングの確認
    - レスポンシブ対応の確認
    - ダークモードでの確認

13. **パフォーマンス最適化**
    - KaTeXの遅延読み込み（必要に応じて）
    - プレビュー更新の最適化（デバウンス処理）

## ファイル構成

```
slide-editor-nextjs/
├── app/
│   └── layout.tsx                           # KaTeXのCSSをインポート（変更）
├── components/
│   ├── EquationInserter/
│   │   ├── EquationInserterModal.tsx        # モーダルコンポーネント
│   │   └── EquationInserterModal.module.css # モーダルのスタイル
│   └── Menu/
│       └── HamburgerMenu.tsx                # メニューにボタン追加（変更）
├── lib/
│   ├── equationProcessor.ts                 # 数式処理ロジック（新規）
│   └── htmlProcessor.ts                     # addEquationRendering関数追加（変更）
├── styles/
│   └── equation.css                         # 数式表示用スタイル（新規）
└── types/
    └── index.ts                             # 型定義追加（変更）
```

## 実装時の注意点

### KaTeXの制限事項

1. **サポートされていない機能**
   - `\usepackage`コマンドは使用不可
   - 一部のLaTeXパッケージ（amsmath、amssymbなど）の機能は組み込まれているが、すべてではない
   - カスタムマクロの定義は制限あり

2. **エラーメッセージ設計**
   - KaTeXのエラーメッセージをユーザーフレンドリーに変換
   - サポートされていないコマンドを使用した場合、具体的な代替案を提示
   - [KaTeXサポートされている関数一覧](https://katex.org/docs/supported.html)へのリンクを提供

### セキュリティ

1. **XSS対策**
   - LaTeXコードを適切にエスケープ
   - KaTeXを使用する際も、入力値をサニタイズ
   - KaTeXは内部的にHTMLエスケープを処理しているが、`data-latex`属性の値も適切にエスケープ

2. **HTMLエスケープ**
   - `<script>`タグなどが実行されないように注意
   - KaTeXのレンダリング結果は信頼できるが、入力値の検証も重要

### パフォーマンス

1. **KaTeXの読み込み**
   - 必要な機能のみ読み込む
   - 初回読み込み時のパフォーマンスを考慮

2. **リアルタイムプレビュー**
   - デバウンス処理を実装して更新頻度を最適化（300ms程度を推奨）
   - クライアント側で直接KaTeXを呼び出してレンダリング
   - 大量の数式がある場合の処理時間を考慮

### UX

1. **LaTeX入力の快適性**
   - テキストエリアに適切なサイズ設定
   - 等幅フォントを使用
   - プレースホルダーで例を表示

2. **プレビューのリアルタイム性**
   - 入力内容に応じてプレビューを更新（デバウンス: 300ms程度）
   - エラーがある場合はすぐに表示
   - パフォーマンスを考慮した更新頻度

3. **よく使う数式テンプレート**
   - 初心者でも使いやすいよう、よく使う数式のテンプレートを提供
   - テンプレートを選択すると、入力エリアに挿入される

4. **アクセシビリティ**
   - KaTeXの`throwOnError: false`オプションでエラー時も可能な限り表示
   - エラーメッセージにaria-labelを追加してスクリーンリーダー対応
   - 数式要素に`role="img"`と`aria-label`を設定（必要に応じて）

## よく使う数式テンプレート一覧

### 基本
- 分数: `\frac{a}{b}`
- 平方根: `\sqrt{x}`
- n乗根: `\sqrt[n]{x}`
- 上付き・下付き: `x^2`, `x_i`
- 組み合わせ: `{n \choose k}` または `\binom{n}{k}`

### 微積分
- 積分: `\int_{a}^{b} f(x) dx`
- 定積分: `\int_{0}^{\infty} e^{-x} dx`
- 偏微分: `\frac{\partial f}{\partial x}`
- 総和: `\sum_{i=1}^{n} x_i`
- 極限: `\lim_{x \to \infty} f(x)`

### 線形代数
- ベクトル: `\vec{v}` または `\mathbf{v}`
- 行列: `\begin{pmatrix} a & b \\ c & d \end{pmatrix}`
- 行列式: `\det(A)`
- 転置: `A^T`
- 内積: `\vec{a} \cdot \vec{b}`
- 外積: `\vec{a} \times \vec{b}`

### ギリシャ文字
- 小文字: `\alpha, \beta, \gamma, \delta, \epsilon, \theta, \lambda, \mu, \pi, \sigma, \phi, \omega`
- 大文字: `\Alpha, \Beta, \Gamma, \Delta, \Theta, \Lambda, \Pi, \Sigma, \Phi, \Omega`

### 集合・論理
- 集合: `\{1, 2, 3\}`
- 要素: `x \in A`
- 部分集合: `A \subset B`
- 和集合: `A \cup B`
- 積集合: `A \cap B`
- 実数: `\mathbb{R}`
- 自然数: `\mathbb{N}`

### その他
- 不等式: `a < b`, `a \leq b`, `a \geq b`
- 約等: `a \approx b`
- 等号: `a = b`, `a \neq b`
- 矢印: `\rightarrow`, `\leftarrow`, `\leftrightarrow`, `\Rightarrow`

## 将来の拡張案

1. **数式の編集機能**
   - 既存の数式を選択して編集
   - `data-latex`属性から元のLaTeXコードを読み込み、モーダルで編集可能に

2. **数式ライブラリ機能**
   - よく使う数式を保存して再利用

3. **数式の参照機能**
   - ラベルを付けた数式を参照（例: 式(1)）
   - `\ref`や`\eqref`のような参照機能の実装

4. **数式のエクスポート機能**
   - 画像としてエクスポート（PNG/SVG）
   - PowerPointエクスポート時に数式を画像に変換して埋め込む（`POWERPOINT_EXPORT_PLAN.md`との統合）
   - KaTeXのレンダリング結果をCanvasに描画して画像化

5. **数式エディタ機能**
   - ビジュアルエディタで数式を編集（MathQuillなど）

6. **LaTeX構文ハイライト**
   - 入力エリアでのシンタックスハイライト
   - CodeMirrorのLaTeXモードを使用

7. **キーボードショートカット**
   - 数式挿入のショートカット（例: `Ctrl+M`）
   - 既存のキーボードショートカットシステムに統合

## 参考実装

既存の実装パターンを参考にする：

- `components/CodeBlockInserter/CodeBlockInserterModal.tsx`
- `components/TableInserter/TableInserterModal.tsx`
- `components/ChartInserter/ChartInserterModal.tsx`
- `lib/codeBlockProcessor.ts`
- `lib/tableProcessor.ts`
- `lib/chartProcessor.ts`

これらの実装と同じパターンで実装することで、一貫性のあるUXを提供できます。

## 実装パターンの明確化

### リアルタイムプレビューの実装タイミング

実装計画では、リアルタイムプレビューが2つの異なる場所で実装されます：

1. **Phase 2: モーダル内のリアルタイムプレビュー**
   - モーダルコンポーネント内で、ユーザーがLaTeXコードを入力している最中に表示
   - クライアント側で直接`katex.renderToString`を呼び出し
   - `useEffect`フックとデバウンス処理で実装
   - エラーが発生した場合は、エラーメッセージを表示

2. **Phase 4: プレビュー画面での数式レンダリング**
   - HTMLプレビュー画面（`Preview`コンポーネント）で数式を表示
   - `lib/htmlProcessor.ts`の`addEquationRendering`関数経由で実装
   - Prism.jsの実装パターン（`addCodeBlockHighlighting`関数）と同じ方式
   - HTMLに埋め込まれた`data-latex`属性から数式をレンダリング

### データ属性によるLaTeXコード保存

数式を挿入する際、元のLaTeXコードを`data-latex`属性に保存することで、将来の編集機能に対応します：

```html
<!-- インライン数式の例 -->
<span class="slide-equation-inline" data-latex="E = mc^2">
  <!-- KaTeXでレンダリングされたHTML -->
</span>

<!-- ブロック数式の例 -->
<div class="slide-equation-block" data-latex="\int_{a}^{b} f(x) dx" data-alignment="center">
  <!-- KaTeXでレンダリングされたHTML -->
  <div class="slide-equation-caption">定積分の例</div>
</div>
```

この実装により、将来数式を編集する際に、`data-latex`属性から元のLaTeXコードを読み込んでモーダルに表示できます。

## 参考資料

- [KaTeX公式ドキュメント](https://katex.org/docs/api.html)
- [KaTeXサポートされている関数一覧](https://katex.org/docs/supported.html)
- [LaTeX数式記法の基本](https://www.latex-tutorial.com/)
- [KaTeX GitHubリポジトリ](https://github.com/KaTeX/KaTeX)
