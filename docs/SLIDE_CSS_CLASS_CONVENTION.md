# スライドCSS クラス命名規則

このドキュメントは、スライドエディタで使用するHTMLクラス名の規則を定義します。
CSSデザインテンプレートを作成・カスタマイズする際は、この規則に従ってください。

---

## 基本ルール

1. スライドコンテンツ用クラスには **`slide-`** プレフィックスを付ける
2. ユーティリティクラス（`highlight`, `center`, `footer`, `split`）はプレフィックスなし
3. テンプレート固有クラスは **カテゴリ名をプレフィックス**にする（例: `title-page-`, `quote-`）
4. スタイルバリエーションは **`{ベース}-{バリエーション}`** の形式にする（例: `slide-table-striped`）

---

## 1. コアクラス（必須）

CSSテンプレートが**必ず定義すべき**クラスです。これらがないとスライドの基本表示が壊れます。

### 1.1 スライド構造

| クラス名 | 要素 | 役割 |
|----------|------|------|
| `.slide` | `<div>` | スライド1枚のコンテナ。サイズ・背景・改ページを制御 |
| `.slide-split` | `.slide` の追加クラス | 分割レイアウト時の修飾子 |
| `.slide-split-content` | `<div>` | 分割レイアウトの横並びコンテナ |

### 1.2 テキスト要素

| クラス名 | 要素 | 役割 | 既定値 |
|----------|------|------|--------|
| `.slide-title` | `<h1>` | スライドのメインタイトル | 48px, 中央揃え, 下線 |
| `.slide-subtitle` | `<h2>` | サブタイトル | 36px, 左揃え, 左線 |
| `.slide-text` | `<p>` | 本文テキスト | 24px, line-height: 1.8 |
| `.slide-list` | `<ul>` | リストコンテナ | 22px |
| `.slide-list-item` | `<li>` | リスト項目（`::before` で装飾） | 22px, 装飾付き |
| `.footer` | `<div>` | ページ番号・日付表示 | 18px, 右下固定 |

### 1.3 ユーティリティ

| クラス名 | 役割 |
|----------|------|
| `.highlight` | テキストのハイライト装飾（背景グラデーション等） |
| `.center` | テキスト中央揃え |

---

## 2. レイアウトクラス

### 2.1 2カラムレイアウト

| クラス名 | 要素 | 役割 |
|----------|------|------|
| `.split` | `<div>` | 2カラムのFlexコンテナ |
| `.split .left` | `<div>` | 左カラム（flex: 1） |
| `.split .right` | `<div>` | 右カラム（flex: 1） |

### 2.2 画像レイアウト

| クラス名 | 要素 | 役割 |
|----------|------|------|
| `.slide-content` | `<div>` | テキスト側コンテナ（画像との分割時） |
| `.slide-image` | `<div>` | 画像側コンテナ（画像との分割時） |
| `.slide-img` | `<img>` | 画像要素のスタイリング |

---

## 3. テンプレート固有クラス

各HTMLテンプレートが使用する専用クラスです。テンプレートに応じて定義します。

### 3.1 タイトルページ

| クラス名 | 役割 |
|----------|------|
| `.title-page-container` | タイトルページの中央揃えコンテナ |
| `.title-page-title` | タイトルページのメインタイトル |
| `.title-page-subtitle` | タイトルページのサブタイトル |
| `.title-page-meta` | 日付・著者名などのメタ情報 |

### 3.2 クォート（引用）

| クラス名 | 役割 |
|----------|------|
| `.quote-container` | 引用の中央揃えコンテナ |
| `.quote-text` | 引用テキスト（イタリック、大きめフォント） |
| `.quote-author` | 引用元・著者名（右揃え） |

### 3.3 標準テンプレートヒント

| クラス名 | 役割 |
|----------|------|
| `.template-description` | テンプレートの説明テキスト |
| `.template-hint` | ヒントテキスト（薄いグレー） |
| `.image-placeholder` | 画像未挿入時のプレースホルダ |

---

## 4. コンテンツ挿入クラス

エディタの「挿入」機能が自動生成するHTMLで使用されるクラスです。

### 4.1 表（テーブル）

**基本構造**: `<div class="slide-table-container"><table class="slide-table slide-table-{style}">...</table></div>`

| クラス名 | 役割 |
|----------|------|
| `.slide-table-container` | 表のラッパー（マージン、オーバーフロー制御） |
| `.slide-table` | 表の基本スタイル（幅100%、border-collapse） |
| `.slide-table th` | ヘッダーセル共通スタイル |
| `.slide-table td` | データセル共通スタイル |
| `.slide-table-caption` | 表のキャプション |

**スタイルバリエーション**（`slide-table` と併用）:

| クラス名 | 外観 |
|----------|------|
| `.slide-table-simple` | ボーダーなし |
| `.slide-table-bordered` | 全セルにボーダー |
| `.slide-table-striped` | 偶数行に背景色 |
| `.slide-table-highlight` | ヘッダー行を強調色（青系） |
| `.slide-table-minimal` | 最小限のボーダー |

### 4.2 グラフ（チャート）

**基本構造**: `<div class="slide-chart-container"><canvas id="chart-{id}"></canvas><script class="chart-config">...</script></div>`

| クラス名 | 役割 |
|----------|------|
| `.slide-chart-container` | グラフのラッパー |
| `.slide-chart-container canvas` | Canvas要素のサイズ制御 |
| `.chart-config` | グラフ設定JSON格納（display: none） |

### 4.3 コードブロック

**基本構造**: `<div class="slide-code-block-container slide-code-block-{style}"><pre><code class="language-{lang}">...</code></pre></div>`

| クラス名 | 役割 |
|----------|------|
| `.slide-code-block-container` | コードブロックのラッパー |
| `.slide-code-block-caption` | コードブロックのキャプション |

**スタイルバリエーション**（`slide-code-block-container` と併用）:

| クラス名 | 外観 |
|----------|------|
| `.slide-code-block-default` | ライトグレー背景 |
| `.slide-code-block-minimal` | 透明背景、ボーダーのみ |
| `.slide-code-block-dark` | ダーク背景（#2d2d2d） |
| `.slide-code-block-transparent` | 完全透明 |

### 4.4 数式（KaTeX）

**基本構造**: `<span class="slide-equation-inline" data-latex="..."></span>` または `<div class="slide-equation-block" data-latex="..."></div>`

| クラス名 | 役割 |
|----------|------|
| `.slide-equation-inline` | インライン数式 |
| `.slide-equation-block` | ブロック数式 |
| `.slide-equation-block-center` | 中央揃えブロック数式 |
| `.slide-equation-block-left` | 左揃えブロック数式 |
| `.slide-equation-block-right` | 右揃えブロック数式 |
| `.slide-equation-caption` | 数式のキャプション |
| `.slide-equation-caption-center` | 中央揃えキャプション |
| `.slide-equation-caption-left` | 左揃えキャプション |
| `.slide-equation-caption-right` | 右揃えキャプション |
| `.slide-equation-error` | レンダリングエラー表示 |

---

## 5. 分割レイアウト時の調整

`.slide-split` 内の要素はフォントサイズ等が縮小されます。CSSテンプレートでは以下のセレクタを定義してください。

| セレクタ | 調整内容 |
|----------|----------|
| `.slide-split .slide-title` | フォントサイズ縮小（48px → 36px） |
| `.slide-split .slide-subtitle` | フォントサイズ縮小（36px → 28px） |
| `.slide-split .slide-text` | フォントサイズ縮小（24px → 20px） |
| `.slide-split .slide-list` | フォントサイズ縮小（22px → 18px） |
| `.slide-split .slide-list-item` | マージン縮小 |
| `.slide-split .slide-table` | フォントサイズ縮小（18px → 16px） |
| `.slide-split .slide-chart-container` | マージン縮小 |
| `.slide-split .slide-code-block-container` | マージン・フォントサイズ縮小 |

---

## 6. 印刷対応

CSSテンプレートには `@media print` セクションと `@page` ルールを含めてください。

```css
@media print {
    body { background: white !important; margin: 0 !important; }
    .slide {
        box-shadow: none !important;
        margin: 0 !important;
        page-break-after: always !important;
        page-break-inside: avoid !important;
    }
    .slide:last-child { page-break-after: auto !important; }
}

@page {
    size: A4 landscape;  /* または適切なサイズ */
    margin: 0;
}
```

---

## 7. CSSテンプレート作成ガイドライン

### カスタマイズ推奨プロパティ

CSSテンプレート間で**変えるべき**プロパティ:

- **カラー**: テキスト色、見出しの装飾色、ハイライト色、フッター色
- **フォント**: font-family、フォントサイズのバランス
- **装飾**: 見出しのボーダースタイル、リストの装飾記号
- **背景**: スライド背景、コンテナ背景

### 変更禁止プロパティ

以下は**変更してはいけません**（レイアウト崩壊の原因になります）:

- `.slide` の `width` / `height`（スライドサイズ設定で動的に決まる）
- `.slide` の `display: flex` / `flex-direction` / `box-sizing`
- `.slide` の `page-break-*` / `break-*`（印刷制御）
- `.split` の `display: flex` / `flex-direction: row`
- `.footer` の `position: absolute`

### CSS変数の推奨

テーマの一貫性を保つため、以下のCSS変数の使用を推奨します:

```css
:root {
    /* カラーパレット */
    --slide-color-primary: #3498db;    /* アクセントカラー */
    --slide-color-secondary: #e74c3c;  /* サブアクセント */
    --slide-color-text: #2c3e50;       /* テキスト色 */
    --slide-color-text-light: #7f8c8d; /* 薄いテキスト色 */
    --slide-color-bg: white;           /* スライド背景 */
    --slide-color-highlight: #fff59d;  /* ハイライト色 */

    /* フォント */
    --slide-font-family: 'Hiragino Kaku Gothic Pro', 'Meiryo', sans-serif;
    --slide-font-size-title: 48px;
    --slide-font-size-subtitle: 36px;
    --slide-font-size-text: 24px;
    --slide-font-size-list: 22px;
    --slide-font-size-footer: 18px;
}
```

### 自作時の補足（クラス・マークアップの詳細）

CSSテンプレートを**自作する場合**に必要な、上記以外の情報です。

**2カラムレイアウト（`.split`）の子要素**

- `.split` の直下には **クラス名 `left` と `right`** の要素を置く必要があります（`slide-` プレフィックスなし）。
- マークアップ例: `<div class="split"><div class="left">...</div><div class="right">...</div></div>`

**グラフ（チャート）の実構造**

- `<script>` は **`type="application/json"`** を付与した上で `class="chart-config"` を指定します。
- コンテナには **`data-chart-id="{id}"`** が付与されます（スクリプトが設定と紐付けるため）。
- `<canvas>` の `id` は `chart-{chartId}` 形式（例: `chart-chart-1739123456789-abc123def`）です。

**コードブロックの行番号・言語クラス**

- **行番号表示**を行う場合、`<pre>` にクラス **`line-numbers`** が付与されます（Prism.js の line-numbers プラグイン用）。
- 行番号開始番号を変える場合は `<code>` に **`data-start="{n}"`** が付与されます。
- 言語クラス **`language-{lang}`**（例: `language-javascript`）は Prism.js 用です。シンタックスハイライトを使う場合は、行番号用に **`.slide-code-block-container pre.line-numbers`** および **`.line-numbers-rows`** 等のスタイルが必要です。既存の `public/css/slide-styles.css` または Prism の line-numbers CSS を参照してください。

**数式（KaTeX）のスタイルの所在**

- 数式用クラス（`.slide-equation-inline`, `.slide-equation-block`, `.slide-equation-caption`, `.slide-equation-error` など）のスタイルは、本リポジトリでは **`styles/equation.css`** に定義されています。
- **スタンドアロンで1本のCSSテンプレートにまとめる場合**は、`equation.css` の内容も取り込むか、同等のルールを定義してください。
- ブロック数式では、オプションで **`data-alignment`**・**`data-label`** が付与されることがあります（表示には必須ではありません）。

**分割レイアウト時の表の調整**

- `.slide-split .slide-table` では、フォントサイズに加え **`th` / `td` の padding**（例: 8px）を縮小する指定があるとレイアウトが安定します。既存の `slide-styles.css` を参照してください。

**オプション・その他**

- **`.slide-body`**: スライド用の body 風コンテナとして `public/css/slide-styles.css` に定義があります。必須ではありませんが、使う場合は上記コアクラスと同様に考慮してください。
- **フッターの `PAGE_NUMBER_PLACEHOLDER`**: プレビュー時にアプリがページ番号等に置換するため、特別なスタイルは不要です。
- **テンプレートの適用方法**: アプリ内の「テーマ」切り替えは色・リスト記号のみを変更します。**見た目を完全に自作する**場合は、`public/css/slide-styles.css` を差し替えるか、エクスポートしたHTMLから参照するCSSファイルを自作してください。

---

## クラス名一覧（アルファベット順）

| クラス名 | カテゴリ | 必須 |
|----------|----------|:----:|
| `.center` | ユーティリティ | YES |
| `.chart-config` | グラフ | YES |
| `.footer` | テキスト | YES |
| `.highlight` | ユーティリティ | YES |
| `.image-placeholder` | テンプレート | - |
| `.quote-author` | テンプレート | - |
| `.quote-container` | テンプレート | - |
| `.quote-text` | テンプレート | - |
| `.slide` | コア構造 | YES |
| `.slide-chart-container` | グラフ | YES |
| `.slide-code-block-caption` | コードブロック | YES |
| `.slide-code-block-container` | コードブロック | YES |
| `.slide-code-block-dark` | コードブロック | YES |
| `.slide-code-block-default` | コードブロック | YES |
| `.slide-code-block-minimal` | コードブロック | YES |
| `.slide-code-block-transparent` | コードブロック | YES |
| `.slide-content` | レイアウト | YES |
| `.slide-equation-block` | 数式 | YES |
| `.slide-equation-block-center` | 数式 | YES |
| `.slide-equation-block-left` | 数式 | YES |
| `.slide-equation-block-right` | 数式 | YES |
| `.slide-equation-caption` | 数式 | YES |
| `.slide-equation-caption-center` | 数式 | YES |
| `.slide-equation-caption-left` | 数式 | YES |
| `.slide-equation-caption-right` | 数式 | YES |
| `.slide-equation-error` | 数式 | YES |
| `.slide-equation-inline` | 数式 | YES |
| `.slide-image` | レイアウト | YES |
| `.slide-img` | 画像 | YES |
| `.slide-list` | テキスト | YES |
| `.slide-list-item` | テキスト | YES |
| `.slide-split` | コア構造 | YES |
| `.slide-split-content` | コア構造 | YES |
| `.slide-subtitle` | テキスト | YES |
| `.slide-table` | 表 | YES |
| `.slide-table-bordered` | 表 | YES |
| `.slide-table-caption` | 表 | YES |
| `.slide-table-container` | 表 | YES |
| `.slide-table-highlight` | 表 | YES |
| `.slide-table-minimal` | 表 | YES |
| `.slide-table-simple` | 表 | YES |
| `.slide-table-striped` | 表 | YES |
| `.slide-text` | テキスト | YES |
| `.slide-title` | テキスト | YES |
| `.split` | レイアウト | YES |
| `.template-description` | テンプレート | - |
| `.template-hint` | テンプレート | - |
| `.title-page-container` | テンプレート | - |
| `.title-page-meta` | テンプレート | - |
| `.title-page-subtitle` | テンプレート | - |
| `.title-page-title` | テンプレート | - |
