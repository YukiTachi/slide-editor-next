# PowerPoint形式エクスポート機能 実装計画

## 1. 概要

スライドエディタにPowerPoint形式（.pptx）でのエクスポート機能を追加します。HTMLスライドをPowerPointファイルに変換し、ユーザーが既存のPowerPointアプリケーションで開いて編集・共有できるようにします。

### 目標
- HTMLスライドをPowerPoint形式（.pptx）に変換
- テキスト、画像、表、グラフ・チャートなどの主要要素をサポート
- クライアントサイドのみで完結（サーバー不要）
- 既存のアーキテクチャと統合

### 背景
- WELLBEING_EVALUATION.md で重要度5（最重要）として評価されている
- Phase 5（共有・配布）の優先機能として位置づけられている
- 互換性、共有に重要な機能

### ✅ 実装順序について（前提条件は解消済み）

初版では「グラフ・チャート挿入機能の実装後に開発する」ことを前提条件としていたが、グラフ・チャート挿入機能は実装済み（`lib/chartProcessor.ts` / `chartRenderer.ts`、Chart.js v4）。**着手ブロッカーはない。**

グラフの埋め込み形式が確定したため、Phase 3.5 の実装方針も具体化済み（後述）。

---

## 2. 技術スタック・アーキテクチャ

### 使用技術
- **ライブラリ**: `pptxgenjs` (npmパッケージ)
  - ブラウザ上で動作するJavaScriptライブラリ
  - MITライセンス
  - TypeScript型定義あり
- **フレームワーク**: Next.js (既存)
- **言語**: TypeScript
- **スタイリング**: CSS Modules (既存パターンに準拠)

### アーキテクチャパターン
既存の実装パターンに従う:
- `lib/imageProcessor.ts` の実装パターンを参考
- `lib/tableProcessor.ts` の実装パターンを参考
- `components/Menu/HamburgerMenu.tsx` のメニュー統合パターンを参考

---

## 3. ファイル構成

**Phase 1 で触るのは次の3箇所のみ**。PDF出力と同じく、ハンドラは `HamburgerMenu` で完結させる（`app/page.tsx` の変更は不要）。

```
slide-editor-nextjs/
├── components/
│   └── Menu/
│       └── HamburgerMenu.tsx                    # 「💾 データ」にボタン追加（変更）
├── lib/
│   └── powerpointExporter.ts                    # PowerPoint生成ロジック（新規）
└── types/
    └── index.ts                                 # 型定義に追加（変更）
```

Phase 5 でのみ追加（それまでは作らない）:

```
├── components/
│   └── PowerPointExporter/
│       ├── PowerPointExporterModal.tsx          # エクスポート設定モーダル
│       └── PowerPointExporterModal.module.css   # スタイル
```

---

## 4. データ構造・型定義

### 4.1 TypeScript型定義

`types/index.ts` に追加:

```typescript
// PowerPointエクスポート設定
// スライドサイズは設定に含めない: エクスポート時にエディタの現在の sizeConfig
// （SlideSizeConfig、useSlideSize）を引数で受け取るため、ここに持つと重複する
// （PDF出力が sizeConfig を受け取っているのと同じパターン。HamburgerMenu.tsx 参照）
export interface PowerPointExportConfig {
  includePageNumbers: boolean      // ページ番号を含めるか
  imageQuality: 'high' | 'medium' | 'low'  // 画像品質
}

// 2分割レイアウト（slide-split / two-column）の配置先
export type PptxRegion = 'full' | 'left' | 'right'

// スライド要素の型
// 座標は要素には持たせない: 生成時に region と PptxPageGeometry から計算する
// （固定座標を持つと A4 / 16:9 の切り替えではみ出すため）
export interface PptxSlideElement {
  type: 'text' | 'image' | 'table' | 'list' | 'chart' | 'equation' | 'code'
  region: PptxRegion               // 配置先。1カラムスライドは常に 'full'
  content: string                  // テキスト・画像src・LaTeXソース・chart-config JSON
  rows?: string[][]                // type: 'table' のみ。抽出時点で構造化する（outerHTML再パースを避ける）
  items?: string[]                 // type: 'list' のみ。リスト項目
  style?: {
    fontSize?: number
    color?: string
    alignment?: 'left' | 'center' | 'right'
    bold?: boolean
    italic?: boolean
  }
}

// ページ寸法（インチ）。sizeConfig から計算し、全要素の座標計算の基準にする
export interface PptxPageGeometry {
  w: number       // ページ幅（a4-landscape: 11.69 / 16-9: 13.33）
  h: number       // ページ高さ（a4-landscape: 8.27 / 16-9: 7.5）
  margin: number  // 標準マージン
}
```

---

## 5. コンポーネント設計

### 5.1 powerpointExporter (メインロジック)

**責務**:
- HTMLスライドを解析
- PowerPointオブジェクトを生成
- ファイルとしてダウンロード

**API**:
```typescript
// HTMLスライドをPowerPointに変換
// sizeConfig はエディタの現在のスライドサイズ設定（useSlideSize）を渡す
// template は Phase 4 で使用するが、シグネチャ変更を避けるため Phase 1 から optional で受ける
export async function exportToPowerPoint(
  htmlContent: string,
  sizeConfig: SlideSizeConfig,
  template?: CSSDesignTemplate,
  config?: PowerPointExportConfig
): Promise<void>

// スライドHTMLを解析して要素を抽出（DOMParserを使用）
export function parseSlideHTML(slideHTML: string): PptxSlideElement[]

// sizeConfig からページ寸法を計算（Phase 1 で用意。全座標計算の基準）
export function getPageGeometry(sizeConfig: SlideSizeConfig): PptxPageGeometry
```

**画像取得は新設しない**: 既存の `getImageFromStorage()` / `convertStorageImagesToDataURI()`（`lib/imageStorage.ts:62,72`）を再利用する（Phase 2）。

### 5.2 PowerPointExporterModal (Phase 5 のオプションコンポーネント)

**Phase 5 まで作らない。** Phase 1〜4 の間、UIは `HamburgerMenu` のボタン1つで完結させる。

**責務**:
- エクスポート設定の入力
- エクスポートの実行

**Props**:
```typescript
interface PowerPointExporterModalProps {
  isOpen: boolean
  onClose: () => void
  htmlContent: string
  sizeConfig: SlideSizeConfig       // 現在のスライドサイズ設定
  onStatusUpdate?: (message: string) => void
}
```

---

## 6. 実装フェーズ

### Phase 1: 基盤の構築（必須機能）

**目標**: 基本的なテキストスライドのPowerPoint変換を実装

**スコープを意図的に狭める**: Phase 1 は「テキストのみ + サイズ追従 + メニュー1ボタン」。画像・表・グラフは Phase 2 以降。設定モーダルと `page.tsx` の変更は入れない。

#### 6.1 依存関係の追加
- [x] `package.json` に `pptxgenjs` を追加
  ```bash
  npm install pptxgenjs
  ```
- [x] `lib/powerpointExporter.ts` 内でクリック時に **dynamic import** する（初期バンドルを肥やさない）

#### 6.2 型定義と設定
- [x] `types/index.ts` に型定義を追加（`PowerPointExportConfig` / `PptxRegion` / `PptxSlideElement` / `PptxPageGeometry`）
- [x] `lib/powerpointExporter.ts` を作成
  - [x] **`getPageGeometry(sizeConfig)` ヘルパの実装**（全座標計算の基準。固定座標を書かない）
  - [x] 基本的なエクスポート関数の実装
  - [x] スライド抽出ロジック（**実装変更**: `extractSlides()` のregexは `class="slide slide-split"` にマッチしないため、DOMParserで `div.slide` を列挙する方式にした）

#### 6.3 HTML解析ロジック
- [x] **`DOMParser` ベースの解析基盤を作成**（regexでの解析は属性順序・入れ子で壊れるため使わない）
- [x] **クラスで役割を取る**テキスト要素の抽出（テンプレートの命名規約 `SLIDE_CSS_CLASS_CONVENTION.md` に準拠。タグ名やフォントサイズでの判定はしない）
  - [x] `h1.slide-title` → タイトル
  - [x] `h2.slide-subtitle` → サブタイトル
  - [x] `p.slide-text` → 段落
  - [x] `ul.slide-list` / `li.slide-list-item` → `type: 'list'`（`items: string[]` に格納）
  - [x] クラスなしの素の `h1` / `h2` / `p` / `li` はフォールバックとして同じ役割にマップ
- [x] **レイアウト領域（region）の判定**（**`.slide-split` / `.slide-split-content` 自体は領域判定に使わない**。`.slide-split-content` は左右両方を包む親コンテナで、タイトルはその外にある全幅要素）
  - [x] slide-split（`lib/imageProcessor.ts:100-110`）: `.slide-content` → `left`、`.slide-image` → `right`
  - [x] two-columnテンプレート: `.left` → `left`、`.right` → `right`
  - [x] それ以外の要素（splitスライドのタイトル含む）は `full`
- [x] 本文として扱わない要素の除外
  - [x] グラフ設定JSON（`<script type="application/json" class="chart-config">`）
  - [x] `<style>` / `<script>` 全般
  - [x] フッター（`<div class="footer">`）は本文と分けて処理（→ 6.4 のページ番号）
- [x] **インライン数式を分断しない**: `p` 内の `data-latex` 要素は Phase 1 では remove せず、`textContent`（KaTeXの描画テキスト）ごと段落の一部として残す（高度な扱いは Phase 3.6）
- [x] スタイル情報の抽出（フォントサイズ、色など）

#### 6.4 PowerPoint生成（基本）
- [x] pptxgenjsを使用してプレゼンテーションオブジェクトを作成
- [x] スライドサイズの設定（**エディタの現在のサイズ設定に追従**）
  - [x] `a4-landscape` → カスタムレイアウト 11.69" x 8.27"
  - [x] `16-9` → `LAYOUT_WIDE`（13.33" x 7.5"）
  - [x] PDF出力と同様に `HamburgerMenu` から `sizeConfig` を受け渡す
- [x] **座標は `getPageGeometry()` と region から計算**（`full` は全幅、`left` / `right` は半幅。固定値を書かない）
- [x] **日本語フォントの明示**: 全 `addText` に `fontFace` を指定（例: `Yu Gothic` / `Meiryo`）。pptxgenjs の既定は Arial のため未指定だと日本語が崩れる
- [x] 各スライドをPowerPointスライドに変換
  - [x] `.slide-title` をスライドタイトルとして追加
  - [x] テキストコンテンツを region に応じた位置に追加
- [x] ページ番号: フッターの `PAGE_NUMBER_PLACEHOLDER` 由来のテキストは本文に含めず、pptxgenjsの `slideNumber` オプションで右下に出す
- [x] ファイルとしてダウンロード（ファイル名: `スライド_YYYY-MM-DD.pptx`。日付は**ローカル時刻**で生成する。`toISOString()` はUTCのため日本時間では1日ずれることがある）

#### 6.5 メニューへの統合
- [x] `components/Menu/HamburgerMenu.tsx` に「📊 PowerPoint出力」ボタンを追加
  - [x] 「💾 データ」セクションのPDF出力の隣に追加
  - [x] クリックでエクスポートを実行（ハンドラは `handleExportPDF` と同じパターンで `HamburgerMenu` 内に完結。`app/page.tsx` は変更しない）
  - [x] 空コンテンツ時は `alert` で通知して中断
  - [x] 失敗時は `alert` + `console.error`（PDF出力と同じエラーハンドリング）

**Phase 1 完了条件**:
- テキストのみのスライド（title / subtitle / text / list）が変換される
- スライドサイズ設定（A4横 / 16:9）がpptxのページサイズに反映される
- メニューのボタン1つでダウンロードまで完結する
- 空コンテンツで壊れない
- PowerPointで開いて日本語が正しく表示される

**Phase 1 検証結果（2026-08-16、headless Chromium + CDPによる実UI検証）**:
- ✅ 通常 / slide-split / two-column の3スライドがメニューのボタン1つで.pptxとしてダウンロードされる
- ✅ A4横: `sldSz cx=10689336 cy=7562088`（11.69"×8.27"）、16:9: `cx=12192000 cy=6858000`（LAYOUT_WIDE）— サイズ設定に追従
- ✅ OOXML構造検証: 全テキストに `typeface="Yu Gothic"`、リストは `buChar` 付き、日本語テキスト正常
- ✅ region配置: splitスライドのタイトルは全幅（x=0.5, w=10.69）、左テキストは半幅（w=5.25）でタイトルの下（y=1.42）から開始、two-columnの右カラムは x=5.95 — 重なりなし
- ✅ フッターのテキスト（`1 / 3` 等）は本文から除外され、スライドマスターの `slideNumber` で右下に出力
- ✅ スライドが1枚もないHTMLでは alert でエラー通知
- 補足1: webpackが pptxgenjs 4.x の `node:fs` / `node:https` importを解決できずビルドが落ちるため、`next.config.js` に NormalModuleReplacementPlugin + resolve.fallback の対処を追加した
- 補足2: この開発コンテナのheadless Chromiumは非ASCIIのダウンロードファイル名を落とす（`download` になる）が、ASCII名は正常。実ブラウザ（Chrome/Edge）はUnicodeファイル名を扱えるため `スライド_YYYY-MM-DD.pptx` 命名は維持

---

### Phase 2: 画像のサポート（重要機能）

**目標**: 画像を含むスライドをPowerPointに変換

#### 6.6 画像処理ロジック
- [x] 画像要素の抽出
  - [x] `<img>` タグの検出
  - [x] `src` 属性から画像データを取得
- [x] 画像データの取得（**新設せず既存関数を再利用**）
  - [x] base64画像（`data:image/...`）はそのまま使用
  - [x] ローカルストレージ画像（`images/...`）は `getImageFromStorage()` / `convertStorageImagesToDataURI()`（`lib/imageStorage.ts`）で解決
  - [x] 外部URL画像はCORS失敗時に警告してスキップ（7.2の方針どおり）
- [x] 画像サイズの調整
  - [x] スライドサイズに合わせてリサイズ
  - [x] アスペクト比を維持

#### 6.7 PowerPointへの画像追加
- [x] pptxgenjsで画像をスライドに追加
- [x] 画像の位置とサイズの設定
- [x] 2分割レイアウトの対応（**2系統ある点に注意**）
  - [x] `slide-split`（`lib/imageProcessor.ts` が生成）: 左側にテキスト、右側に画像
  - [x] two-columnテンプレート（`.left` / `.right`、`lib/slideTemplates.ts`）

**確認事項**:
- 画像がPowerPointに正しく表示される
- 画像サイズが適切に調整される
- 2分割レイアウトが正しく変換される

**Phase 2 検証結果（2026-08-16、headless Chromium + CDPによる実UI検証）**:
- ✅ base64画像（200×100px）: アスペクト比2:1を維持して2.08"×1.04"、全幅カラムの中央（x=4.80）に配置。96dpi原寸のまま拡大されない
- ✅ ローカルストレージ画像（`images/test.png`、400×400px）: slide-splitの右カラム内に4.17"×4.17"で収まり、カラム内中央（x=6.48）・タイトル下（y=1.42）から配置。左カラムのテキストと重なりなし
- ✅ 取得できない外部URL画像: `console.warn` してスキップし、pptx生成は継続（7.2の方針どおり）
- ✅ `ppt/media/` に画像ファイルが埋め込まれ、`<p:pic>` 要素として出力される
- 実装メモ: Phase 1の `parseSlideHTML` は走査セレクタに `img` を含めていなかったため、`h1, h2, p, ul, ol, img` に拡張してドキュメント順を保ったまま画像を抽出するようにした

---

### Phase 3: 表のサポート（重要機能）

**目標**: 表を含むスライドをPowerPointに変換

#### 6.8 表処理ロジック
- [x] 表要素の抽出
  - [x] `<table>` タグの検出
  - [x] `<thead>`, `<tbody>`, `<tr>`, `<td>`, `<th>` の解析
- [x] 表データの構造化（**抽出時点で `rows: string[][]` に変換**。`outerHTML` を持ち回って再パースしない）
  - [x] 行と列のデータを配列に変換
  - [x] ヘッダー行の識別
  - [x] セルのテキスト抽出

#### 6.9 PowerPointへの表追加
- [x] pptxgenjsで表をスライドに追加
- [x] 表スタイルの適用
  - [x] ボーダー、背景色などのスタイル
- [x] 表のサイズと位置の調整

**確認事項**:
- 表がPowerPointに正しく表示される
- 表スタイルが適切に適用される
- ヘッダー行が正しく識別される

**Phase 3 検証結果（2026-08-16、headless Chromium + CDPによる実UI検証）**:
- ✅ highlight表: ヘッダー行が塗り3498DB・白文字・太字、キャプションは表の直前にイタリック14ptのテキストとして出力
- ✅ striped表（ヘッダーなし）: tbody基準の偶数行にF8F9FAの塗り（CSSのnth-child(even)と一致）、1行目は太字にならない
- ✅ ボーダー: スタイルごとの色・太さ（bordered/striped/highlight: BDC3C7、minimal: E0E0E0、simple: なし）
- ✅ 2つの表がyCursorの縦積みで重ならず配置（表1: y=1.96、表2: y=3.51 = 表1の下端+GAP）
- ✅ セル内テキストは表として取得済みのため本文抽出から除外（二重取得なし）
- 実装メモ: 表の高さはTABLE_ROW_H（0.35"）× 行数で概算してカーソルを進める。graphicFrameのext値はPowerPointが開くときに実際の行高で再計算される

---

### Phase 3.5: グラフ・チャートのサポート（重要機能）

**前提条件**: ✅ グラフ・チャート挿入機能は実装済み（Chart.js v4、`lib/chartProcessor.ts` / `chartRenderer.ts`）

**目標**: グラフ・チャートを含むスライドをPowerPointに変換

**確定済みの埋め込み形式**: グラフは `.slide-chart-container`（`data-chart-id` 属性付き）内に `<canvas>` と、**設定JSONを丸ごと含む `<script type="application/json" class="chart-config">`** として埋め込まれている（`lib/chartProcessor.ts:23-25`）。設定JSONがHTML文字列から直接取得できるため、Canvasの描画結果に依存せず変換できる。

**採用方針: 設定JSON → pptxgenjs ネイティブ `addChart()` 変換（方式A）**

| 方式 | 内容 | 評価 |
|---|---|---|
| A（採用） | `chart-config` のJSONを解析し、pptxgenjsの `addChart()` でネイティブグラフとして追加 | PowerPoint上で編集可能。Canvas描画不要でHTML文字列解析だけで完結 |
| B（フォールバック） | `lib/chartRenderer.ts`（npmの Chart.js）でオフスクリーンCanvasに描画し、`canvas.toDataURL()` で画像化して貼り付け | 見た目は忠実だが編集不可。プレビューiframeへの依存は不要 |

**グラフタイプごとの方式（現行 `ChartType` → pptxgenjs）**:

| Chart.js（本アプリ） | pptxgenjs | 方針 |
|---|---|---|
| bar | bar | 方式A |
| line | line | 方式A |
| pie | pie | 方式A |
| doughnut | doughnut | 方式A |
| radar | radar | 方式A |
| polarArea | **なし** | 方式B |
| bubble | bubble（データ形が異なる） | 方式B（アプリ側データが `number[]` のためネイティブ化が困難） |
| scatter | scatter（データ形が異なる） | 方式B（同上） |

**データ形の変換が必須**: Chart.jsの `{labels, datasets[].data}` を pptxgenjsの `{name, labels, values}[]` に変換する。

#### 6.10 グラフ・チャート処理ロジック
- [x] グラフ要素の抽出
  - [x] `.slide-chart-container` の検出（DOMParser）
  - [x] `script.chart-config` から設定JSONを取得・パース
- [x] Chart.js設定 → pptxgenjs `addChart()` パラメータへの変換
  - [x] グラフタイプのマッピング（上表のとおり）
  - [x] データ形の変換（`{labels, datasets[].data}` → `{name, labels, values}[]`）
  - [x] 色・凡例・タイトルの変換
- [x] 方式B対象（polarArea / bubble / scatter）の判定と `chartRenderer` によるオフスクリーン描画

#### 6.11 PowerPointへのグラフ追加
- [x] `addChart()` でネイティブグラフをスライドに追加
- [x] グラフのサイズと位置の調整
- [x] （フォールバック時）画像としての追加

**確認事項**:
- グラフ・チャートがPowerPointに正しく表示される
- PowerPoint上でグラフデータが編集できる（方式A）
- グラフのサイズが適切に調整される
- グラフのデータが正しく反映される

**Phase 3.5 検証結果（2026-08-16、headless Chromium + CDPによる実UI検証）**:
- ✅ 方式A（bar・2系列）: `ppt/charts/chart1.xml` にネイティブbarChartとして出力。系列名（A商品/B商品）・データ値・カテゴリ（1月〜3月）・系列色（3498DB/E74C3C）・凡例位置（bottom→b）・タイトルすべて反映。PowerPoint上で編集可能
- ✅ 方式B（polarArea）: `chartRenderer` のオフスクリーン描画でPNG化され、タイトル・凡例・3色の扇形が正しく描画された画像として埋め込まれる（ピクセル解析と目視で確認）
- ✅ rgba()色 → RRGGBB変換、タイトル下からの縦積み配置（グラフ下端+GAPに次要素）
- ⚠️ 実装上の重要な知見: **Chart.js v4は描画をrequestAnimationFrame経由で行うため、生成後の `chart.options.animation = false` + `update('none')` では同期描画されない**（透明PNGになる）。生成時にanimation:falseを渡した場合のみコンストラクタ内で同期描画される。このため `renderChart()` に `opts.disableAnimation` を追加した（既存のプレビュー呼び出しには影響なし）

---

### Phase 3.6: 数式・コードブロックのサポート（重要機能）

**背景**: 計画書初版の作成後に、LaTeX数式挿入機能（KaTeX、`lib/equationProcessor.ts`）とコードブロック挿入機能（Prism、`lib/codeBlockProcessor.ts`）が実装された。これらは初版の計画でカバーされていない。

#### 6.11.5 数式のサポート
- [x] 数式要素の検出（`data-latex` 属性付き要素。**元のLaTeXソースが属性に保存済み**）
- [x] **ブロック数式とインライン数式で扱いを分ける**
  - [x] ブロック数式（独立要素）: 独立した要素として変換
    - [x] 最低限: LaTeXソースをテキストとして挿入（例: `$E = mc^2$`）
    - [ ] 発展: KaTeXでオフスクリーン描画 → SVG/PNG化して画像として挿入（未実装。LaTeXソースのテキスト挿入で運用し、需要があれば対応）
  - [x] インライン数式（`p` 内）: **remove すると段落が分断されるため単独要素にしない**。段落のテキストランの一部として `textContent` を残す（Phase 1 の挙動を維持）
- [x] ブロック数式を独立要素化した場合、レンダリング済みKaTeX HTMLを本文テキストとして二重に拾わないよう除外

#### 6.11.6 コードブロックのサポート
- [x] コードブロック要素の検出（`.slide-code-block-container`、`lib/codeBlockProcessor.ts:53`。素の `<pre>` 全般では拾わない）
- [x] コードテキストの抽出（Prismのハイライト用 `<span>` を除去してプレーンテキスト化）
- [x] 等幅フォント（例: `Consolas`）指定のテキストボックスとして挿入（背景色付き）
- [x] シンタックスハイライトの色は再現しない（制約として明記）

**確認事項**:
- 数式・コードブロックを含むスライドで本文テキストが重複しない
- コードのインデント・改行が保持される

**Phase 3.6 検証結果（2026-08-16、headless Chromium + CDPによる実UI検証）**:
- ✅ インライン数式: エディタHTML上は空のspanのため、LaTeXソース（`E = mc^2`）を流し込んで段落の一部として出力。文の分断なし
- ✅ ブロック数式: `data-latex` のLaTeXソースを `$ … $` 付きイタリック・`data-alignment` に応じた配置で出力。キャプション（兄弟要素 `.slide-equation-caption`）も直後にイタリックで出力
- ✅ コードブロック: Consolas 12ptのテキストボックス。darkスタイルで背景2D2D2D・文字F8F8F2を確認。インデント・改行保持、キャプションはコード直後に出力
- ✅ 6要素（タイトル・段落・数式・キャプション・コード・キャプション）が重なりなく縦積み配置
- 実装メモ: エディタHTMLでは数式（KaTeX）もコードハイライト（Prism）もプレビュー側で描画されるため、エクスポータが受け取るのは空div/エスケープ済みテキスト。`data-latex` 属性とtextContentから直接取得できる

---

### Phase 4: スタイルの再現（重要機能）

**目標**: HTML/CSSのスタイルをPowerPointスタイルに変換

**方針**: CSSをパースしてスタイルを推定するのではなく、**現在のCSSデザインテンプレート（`useCSSDesignTemplate`）の色を `addText` に渡す**。クラス→役割のマッピングは Phase 1 で実装済みなので、役割ごとにテンプレートの色を割り当てるだけでよい。`HamburgerMenu` は既に `template` を取得している（`HamburgerMenu.tsx:63`、PDF出力も同じものを渡している）。

#### 6.12 テンプレート色の適用
- [x] `exportToPowerPoint()` に `template: CSSDesignTemplate` を渡す（PDF出力と同じパターン）
- [x] 役割ごとの色割り当て（`template.colors` のフィールドを使用）
  - [x] タイトル → `colors.heading`
  - [x] サブタイトル → `colors.headingSub`
  - [x] 本文・リスト → `colors.text`
  - [x] スライド背景 → `colors.background`
  - [x] リスト装飾文字 → `template.listBullet`
- [x] 色形式の変換（`#rrggbb` → pptxgenjsの `RRGGBB`）

#### 6.13 インラインスタイルの反映
- [x] インラインstyle属性の太字・斜体・色・配置（左/中央/右）を `addText` オプションに変換
- [x] `<strong>` / `<em>` / ハイライト（`colors.highlight`）のテキストラン変換

**確認事項**:
- スタイルがPowerPointに正しく反映される
- フォントサイズが適切に変換される
- 色が正しく表示される

**Phase 4 検証結果（2026-08-17、headless Chromium + CDPによる実UI検証。natureテンプレートで確認）**:
- ✅ 役割色: タイトル→`colors.heading`（2C3E50）、サブタイトル→`colors.headingSub`、本文・リスト・キャプション・数式→`colors.text` を反映
- ✅ スライド背景: `colors.background`（F5F5F0）がスライドレイアウト（pptxgenjsはdefineSlideMasterの背景をslideLayoutに出力）に反映
- ✅ リスト装飾文字: `template.listBullet`（●）を `bullet: { code }` で反映
- ✅ インライン書式（6.13）: `<strong>`→太字ラン、`<em>`→斜体ラン、`.highlight`→`colors.highlight`（D4EFDF）のハイライト、`style="color: #e74c3c"`→ランの文字色。段落は分断されず1つのテキストボックス内のランとして出力
- ✅ ページ番号の色に `colors.footer` を使用
- 補足: templateが渡されない場合は従来どおり色指定なし（黒）で出力する

---

### Phase 5: 高度な機能（オプション）

**目標**: より高度な機能を追加

#### 6.14 エクスポート設定モーダル
- [ ] `components/PowerPointExporter/PowerPointExporterModal.tsx` を作成
  - [ ] 画像品質の選択
  - [ ] ページ番号の有無の選択
  - [ ] **スライドサイズの選択肢は設けない**（サイズはエディタの設定に追従する方針と矛盾するため）
- [ ] 設定を保存してエクスポートに反映

#### 6.15 エラーハンドリング
- [ ] 画像読み込みエラーの処理
- [ ] 無効なHTMLの処理
- [ ] エラーメッセージの表示

#### 6.16 パフォーマンス最適化
- [ ] 大量のスライドの処理
- [ ] 画像の最適化（リサイズ、圧縮）
- [ ] 進捗表示（オプション）

---

## 7. 実装の考慮事項

### 7.1 HTML解析の複雑さ

**問題**: HTMLの構造が複雑で、すべてのケースをカバーするのが困難
**対策**:
- 主要な要素（h1, h2, p, ul, li, img, table）に焦点を当てる
- 段階的にサポート範囲を拡大
- 解析できない要素は警告を表示

### 7.2 画像の処理

**問題**: 画像の形式やサイズが多様
**対策**:
- base64画像とローカルストレージ画像を優先的にサポート
- 外部URL画像はCORS制限があるため、警告を表示
- 画像サイズをスライドサイズに合わせて自動調整

### 7.3 レイアウトの再現

**問題**: HTML/CSSのレイアウトをPowerPointの座標系に変換するのが困難
**対策**:
- シンプルなレイアウト（上下配置）を優先
- 2分割レイアウト（`slide-split`）を特別に処理
- 複雑なレイアウトは簡略化して変換

### 7.4 フォントの互換性

**問題**: 日本語フォントがPowerPointで正しく表示されない可能性
**対策**:
- デフォルトフォントを設定（日本語対応フォント）
- ユーザーがPowerPointでフォントを変更できることを想定

### 7.5 ファイルサイズ

**問題**: 画像が多い場合、ファイルサイズが大きくなる
**対策**:
- 画像品質の選択肢を提供
- 画像のリサイズと圧縮を実装

### 7.6 見た目の忠実度に関する制約（期待値の明確化）

**方針**: 本機能は「PowerPoint上で編集可能なpptx」を優先する（要素解析方式）。ビルトインCSSデザインテンプレートの基本色（heading / text / highlight / background 等）は Phase 4 で `template.colors` から反映する。その上で、以下は再現されない:
- CSSデザインテンプレートによる装飾・レイアウトの細部、およびカスタムCSSテンプレート（`customCSSTemplateStorage`）の任意スタイル
- Prismのシンタックスハイライト配色
- 複雑なCSSレイアウト（グリッド・絶対配置など）

見た目の完全再現が必要な場合は「スライド全体を1枚の画像としてpptxに貼る」方式が考えられるが、編集不能になるため本計画では採用しない（将来のオプション候補）。忠実度重視の共有用途には既存のPDF出力を案内する。

---

## 8. 実装の詳細

### 8.1 スライド抽出

既存の `extractSlides()` 関数を使用:

```typescript
import { extractSlides } from '@/lib/slideReorder'

const slides = extractSlides(htmlContent)
```

### 8.2 HTML解析の例

**注意**: regexによるHTML解析は属性の順序（`<img class="..." src="...">` 等）や入れ子構造で壊れるため使わない。クライアントサイドで実行されるため `DOMParser` が利用できる。

役割の判定は**テンプレートのクラス名**（`.slide-title` / `.slide-subtitle` / `.slide-text` / `.slide-list`、`SLIDE_CSS_CLASS_CONVENTION.md` 参照）で行う。タグ名やフォントサイズのマジックナンバーでは判定しない。

```typescript
function parseSlideHTML(slideHTML: string): PptxSlideElement[] {
  const elements: PptxSlideElement[] = []
  const doc = new DOMParser().parseFromString(slideHTML, 'text/html')

  // 配置先の判定（slide-split と two-column の2系統）
  // ※ .slide-split / .slide-split-content 自体は領域判定に使わない
  //   （.slide-split-content は左右両方を包む親。タイトルはその外＝full）
  const regionOf = (el: Element): PptxRegion => {
    if (el.closest('.slide-content, .left')) return 'left'  // splitテキスト側 / two-column左
    if (el.closest('.slide-image, .right')) return 'right'  // split画像側 / two-column右
    return 'full'
  }

  // グラフを先に抽出（設定JSONごと。Canvasには依存しない）
  // ※ script要素の一括除去より前に読む必要がある
  doc.querySelectorAll('.slide-chart-container').forEach(container => {
    const config = container.querySelector('script.chart-config')?.textContent
    if (config) {
      elements.push({ type: 'chart', region: regionOf(container), content: config })
    }
    container.remove() // 本文テキストとして二重に拾わない
  })

  // 本文として扱わない要素を除去
  // ※ インラインの data-latex 要素はここでは remove しない（段落が分断されるため、
  //    KaTeXの描画テキストごと段落の一部として残す。ブロック数式の独立要素化は Phase 3.6）
  doc.querySelectorAll('script, style, .footer').forEach(el => el.remove())

  // テキストはクラスで役割を取る（クラスなしのタグはフォールバック。
  //  querySelectorAll はセレクタリストに複数マッチしても要素の重複を返さない）
  const pushText = (el: Element, style: PptxSlideElement['style']) => {
    elements.push({
      type: 'text',
      region: regionOf(el),
      content: el.textContent?.trim() ?? '',
      style,
    })
  }
  doc.querySelectorAll('.slide-title, h1').forEach(el => pushText(el, { fontSize: 32, bold: true }))
  doc.querySelectorAll('.slide-subtitle, h2').forEach(el => pushText(el, { fontSize: 24 }))
  doc.querySelectorAll('.slide-text, p').forEach(el => pushText(el, { fontSize: 18 }))

  // リストは items に格納
  doc.querySelectorAll('.slide-list, ul').forEach(ul => {
    elements.push({
      type: 'list',
      region: regionOf(ul),
      content: '',
      items: Array.from(ul.querySelectorAll('li')).map(li => li.textContent?.trim() ?? ''),
    })
  })

  // 画像を抽出（データ解決は Phase 2 で lib/imageStorage.ts を再利用）
  doc.querySelectorAll('img').forEach(img => {
    elements.push({ type: 'image', region: regionOf(img), content: img.getAttribute('src') ?? '' })
  })

  // 表は抽出時点で string[][] に構造化（outerHTMLの再パースを避ける）
  doc.querySelectorAll('table').forEach(table => {
    const rows = Array.from(table.querySelectorAll('tr')).map(tr =>
      Array.from(tr.querySelectorAll('th, td')).map(cell => cell.textContent?.trim() ?? '')
    )
    elements.push({ type: 'table', region: regionOf(table), content: '', rows })
  })

  return elements
}
```

### 8.3 PowerPoint生成の例

座標の固定値は書かず、`getPageGeometry()` と region から計算する（固定座標は A4 / 16:9 の切り替えではみ出す）。

```typescript
import { extractSlides } from '@/lib/slideReorder'
import type { SlideSizeConfig, PptxPageGeometry, PptxRegion } from '@/types'

// sizeConfig からページ寸法を計算（全座標計算の基準）
export function getPageGeometry(sizeConfig: SlideSizeConfig): PptxPageGeometry {
  return sizeConfig.type === '16-9'
    ? { w: 13.33, h: 7.5, margin: 0.5 }   // PowerPoint既定のLAYOUT_WIDE
    : { w: 11.69, h: 8.27, margin: 0.5 }  // A4横向き
}

// region から x / w を計算（full: 全幅、left / right: 半幅）
function regionBox(region: PptxRegion, geo: PptxPageGeometry) {
  const innerW = geo.w - geo.margin * 2
  if (region === 'left')  return { x: geo.margin, w: innerW / 2 - 0.1 }
  if (region === 'right') return { x: geo.margin + innerW / 2 + 0.1, w: innerW / 2 - 0.1 }
  return { x: geo.margin, w: innerW }
}

// pptxgenjs既定のArialでは日本語が崩れるため必ず指定する
const FONT_FACE = 'Yu Gothic'

async function exportToPowerPoint(
  htmlContent: string,
  sizeConfig: SlideSizeConfig
): Promise<void> {
  // クリック時に dynamic import（初期バンドルを肥やさない）
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  const geo = getPageGeometry(sizeConfig)

  // スライドサイズはエディタの現在の設定に追従する
  if (sizeConfig.type === '16-9') {
    pptx.layout = 'LAYOUT_WIDE'
  } else {
    pptx.defineLayout({ name: 'A4_LANDSCAPE', width: geo.w, height: geo.h })
    pptx.layout = 'A4_LANDSCAPE'
  }

  for (const slide of extractSlides(htmlContent)) {
    const pptxSlide = pptx.addSlide()

    // regionごとの縦位置カーソル（簡略化した縦積みパッキング）
    const yCursor: Record<PptxRegion, number> = {
      full: geo.margin,
      left: geo.margin,
      right: geo.margin,
    }

    for (const el of parseSlideHTML(slide.html)) {
      const box = regionBox(el.region, geo)

      if (el.type === 'text' || el.type === 'list') {
        const text = el.type === 'list' ? (el.items ?? []).join('\n') : el.content
        const h = 0.4 + 0.3 * text.split('\n').length  // 簡略化した高さ概算
        pptxSlide.addText(text, {
          x: box.x,
          y: yCursor[el.region],
          w: box.w,
          h,
          fontSize: el.style?.fontSize ?? 18,
          bold: el.style?.bold,
          align: el.style?.alignment ?? 'left',
          fontFace: FONT_FACE,
          bullet: el.type === 'list',
        })
        yCursor[el.region] += h + 0.15
        if (el.region === 'full') {
          // 全幅要素（タイトル等）の下から左右カラムを開始させ、重なりを防ぐ
          yCursor.left = Math.max(yCursor.left, yCursor.full)
          yCursor.right = Math.max(yCursor.right, yCursor.full)
        }
      }
      // image / table / chart は Phase 2 以降で同じ region / yCursor の枠組みに追加する
    }
  }

  // ファイルとしてダウンロード
  // ※ toISOString()はUTCのため日本時間では日付が1日ずれることがある。ローカル日付を使う
  const d = new Date()
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  await pptx.writeFile({ fileName: `スライド_${date}.pptx` })
}
```

---

## 9. テスト計画

### 9.1 単体テスト（オプション）

- `powerpointExporter.ts` の各関数
- HTML解析ロジック
- 画像取得ロジック

### 9.2 統合テスト（手動確認）

- [ ] 基本的なテキストスライドが変換される
- [ ] 画像を含むスライドが変換される
- [ ] 表を含むスライドが変換される
- [ ] グラフを含むスライドが変換され、PowerPoint上で編集できる
- [ ] 数式・コードブロックを含むスライドが変換される（本文テキストの重複なし）
- [ ] 2分割レイアウト（`slide-split` / two-column両方）が正しく変換される
- [ ] スライドサイズ設定（A4横 / 16:9）がpptxのページサイズに反映される
- [ ] 複数のスライドが正しく変換される
- [ ] PowerPointで開いて正しく表示される
- [ ] 生成された.pptxのOOXML構造が妥当（開発環境では `unzip` + XML確認、または `python-pptx` での読み込み検証が可能）
- [ ] ファイルサイズが適切である
- [ ] エラーハンドリングが機能する

---

## 10. 今後の拡張案

### 10.1 アニメーション

- スライド遷移のアニメーション
- 要素のアニメーション

### 10.2 テンプレート

- PowerPointテンプレートの適用
- カスタムテンプレートのサポート

### 10.3 スピーカーノート

- HTMLコメントをスピーカーノートに変換

---

## 11. 実装の優先順位

### 前提条件
✅ グラフ・チャート挿入機能は実装済み（解消）

### 必須（Phase 1-2）
✅ 基本的なテキストスライドの変換
✅ 画像のサポート
✅ メニューからのエクスポート

### 推奨（Phase 3-4）
✅ 表のサポート
✅ グラフ・チャートのサポート（`addChart()` ネイティブ変換）
✅ 数式・コードブロックのサポート
✅ スタイルの再現

### オプション（Phase 5）
✅ エクスポート設定モーダル
✅ エラーハンドリング強化
✅ パフォーマンス最適化

---

## 12. 実装開始前の確認事項

### 必須の前提条件
- [x] **グラフ・チャート挿入機能が実装されている**（Chart.js v4で実装済み）
- [x] グラフ・チャートの実装方法を理解している（設定JSONが `script.chart-config` としてHTMLに埋め込まれる方式）

### 技術的な確認事項
- [ ] 既存のコードベースの理解
- [ ] `extractSlides()` 関数の動作確認（`lib/slideReorder.ts:6` に実在を確認済み）
- [ ] 画像処理ロジックの理解
- [ ] 表処理ロジックの理解
- [ ] pptxgenjsのドキュメント確認（特に `addChart()` の対応グラフタイプとChart.jsタイプとの対応関係）
- [ ] 実装環境の準備

---

## 13. 参考資料

### 既存実装の参考
- `lib/slideReorder.ts` - スライド抽出ロジック
- `lib/imageProcessor.ts` - 画像処理ロジック
- `lib/tableProcessor.ts` - 表処理ロジック
- `lib/imageStorage.ts` - 画像ストレージ管理
- `components/Menu/HamburgerMenu.tsx` - メニュー統合パターン

### 外部リソース
- [pptxgenjs公式ドキュメント](https://gitbrent.github.io/PptxGenJS/)
- [pptxgenjs GitHub](https://github.com/gitbrent/PptxGenJS)
- PowerPointファイル形式（OOXML）の仕様

---

## 14. 変更履歴

- 2025-12-20: 初版作成
- 2025-12-20: 実装順序を更新（グラフ・チャート機能実装後にPowerPoint出力機能を実装する方針を追加）
- 2026-08-16: 現状のコードベースとの齟齬を解消する改訂
  - 前提条件（グラフ・チャート機能）の完了を反映し、着手可能であることを明記
  - スライドサイズをA4固定から既存の `SlideSizeType`（A4横 / 16:9）設定への追従に変更
  - Phase 3.5を具体化: `chart-config` JSON → pptxgenjs `addChart()` ネイティブ変換を採用（Canvas画像化はフォールバック）
  - Phase 3.6を新設: 数式（KaTeX、`data-latex`）・コードブロック（Prism）のサポートを追加
  - HTML解析をregexから `DOMParser` ベースに変更
  - 2分割レイアウトが `slide-split` と two-column テンプレートの2系統ある点を明記
  - 7.6章を新設: 編集可能性優先による見た目の忠実度の制約を明記
  - 型名を `SlideElement` → `PptxSlideElement` に変更（用途を明確化）
- 2026-08-16: レビュー指摘の反映
  - レイアウト模型を追加: `PptxRegion`（full / left / right）と `getPageGeometry(sizeConfig)` ヘルパをPhase 1に導入。要素から固定座標を排除
  - §8のサンプルをPhase 1と整合させた: クラス（`.slide-title` 等）で役割を取り、`fontSize === 48` によるタイトル判定を廃止。region対応の座標計算・縦積みパッキングの例を追加
  - UI責務を整理: ハンドラは `HamburgerMenu` で完結、`page.tsx` 変更なし、設定モーダルはPhase 5まで作らない。`PowerPointExportConfig.slideSize` を削除（`sizeConfig` 引数と重複）
  - グラフ対応表を明示: polarAreaはpptxgenjs非対応、bubble / scatterはデータ形の違いから方式B既定。データ形変換（`{labels, datasets}` → `{name, labels, values}[]`）を必須事項に。方式Bは `chartRenderer.ts` のオフスクリーン描画で足りる旨に修正
  - 画像取得は `getImageFromStorage` / `convertStorageImagesToDataURI` の再利用に変更（`getImageData` 新設を廃止）
  - 日本語フォント: Phase 1から全 `addText` に `fontFace`（Yu Gothic / Meiryo）指定、コードは等幅（Consolas）
  - インライン数式は remove せず段落テキストとして残す方針を明記（段落分断の回避）
  - 表は抽出時点で `rows: string[][]` に構造化、コードブロック検出は `.slide-code-block-container` に限定
  - Phase 4を「CSSパース」から「`useCSSDesignTemplate` の `template.colors` を `addText` に渡す」方式に変更
  - Phase 1の完了条件を「テキストのみ + サイズ追従 + メニュー1ボタン」に限定。pptxgenjsはdynamic import、ファイル名は `スライド_YYYY-MM-DD.pptx`
- 2026-08-16: 再レビュー指摘の反映
  - **region判定の修正**: slide-splitの実HTML（`lib/imageProcessor.ts:100-110`）に合わせ、`.slide-content` → left、`.slide-image` → right に変更。`.slide-split` / `.slide-split-content` 自体は領域判定に使わない（`.slide-split-content` は左右両方を包む親で、タイトルはその外の全幅要素）。旧判定ではタイトルが右カラム・画像が左カラムになっていた
  - §8.3: 全幅要素を置いた後に left / right の yCursor を同期し、左右カラムとの重なりを防止
  - Phase 5 モーダルから「スライドサイズの選択」を削除（エディタ追従の方針と矛盾するため）
  - ファイル名の日付をローカル時刻で生成（`toISOString()` はUTCのため日本時間で1日ずれることがある）
  - `exportToPowerPoint()` に `template?: CSSDesignTemplate` をPhase 1からoptionalで追加（Phase 4でのシグネチャ変更を回避）

---

**注意**: この計画は実装の指針です。実装中に発見された問題や要件変更に応じて柔軟に調整してください。

