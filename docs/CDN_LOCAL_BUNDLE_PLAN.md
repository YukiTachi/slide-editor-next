# CDN依存のローカルバンドル化（Chart.js / KaTeX / Prism）実装計画

## 1. 概要

### 目標

プレビュー・プレゼンテーション・PDF出力のHTMLに注入している Chart.js / KaTeX / Prism.js を、
外部CDN（jsDelivr / cdnjs）からの読み込みではなく、**アプリと同一オリジンで配信するローカルファイル**に切り替える。
これにより、オフライン環境やCDN不達環境でもグラフ・数式・コードブロックが正しく描画されるようにする。

### 背景

- `lib/htmlProcessor.ts` が生成するHTMLには、以下9箇所のCDN参照がハードコードされている。

  | ライブラリ | CDN上のバージョン | 参照先 |
  |---|---|---|
  | Chart.js | 4.4.0（jsDelivr） | `chart.umd.min.js` |
  | KaTeX | 0.16.9（jsDelivr） | `katex.min.js` / `katex.min.css`（CSSがwebfontを相対参照） |
  | Prism.js | 1.29.0（cdnjs） | `prism-core` / `autoloader` / `line-numbers` の JS・CSS、テーマ `prism-tomorrow`、`languages_path`（言語定義の遅延ロード先） |

- 3ライブラリは **すでに `package.json` の dependencies に含まれている**（chart.js ^4.5.1 / katex ^0.16.27 / prismjs ^1.30.0）。
  しかし、エディタ側で `import` して使っているのは `lib/chartRenderer.ts`（PowerPoint出力のグラフ画像化）のみで、
  注入HTML側はCDNに依存したままになっている。
- `docs/PDF_EXPORT_PLAN.md` のリスク表では「CDNに接続できない環境では該当要素が空のまま出力される。
  CDN→ローカルバンドル化は別課題」として先送りされていた。本計画はその課題を解消する。
- README は「オフライン対応: インターネット接続がなくても動作」と謳っているが、
  現状はリッチ要素（グラフ・数式・コード）に限って成り立っていない。

### 前提（現状のアーキテクチャ）

- `output: 'export'` の静的エクスポート運用。`out/` をWebサーバーのルート直下に配置する（本番）。
  開発環境は nginx が `/dev/` を `127.0.0.1:3000/` にプロキシする（`/dev/` プレフィックスは剥がされる）。
- 処理済みHTMLは **src なしの iframe / `window.open('')` の別ウィンドウに `document.write()`** で流し込まれる
  （`Preview.tsx` / `PresentationMode.tsx` / `pdfExporter.ts` / `HamburgerMenu.tsx` / `app/page.tsx`）。
  `document.open()` は書き込み先文書のURLを呼び出し元ページ（アプリ本体）のURLに置き換えるため、
  注入するURLはアプリ本体と同一オリジン・同一ベースで解決される。

---

## 2. 設計方針

### 2.1 配信方式: `public/vendor/` に静的ファイルとして配置する

`node_modules` から必要ファイルをビルド時にコピーし、Next.js の `public/` 経由で配信する。
`next build` は `public/` を `out/` にそのままコピーするため、本番配置の手順は変わらない。

採用理由と、不採用にした代替案:

| 案 | 判断 | 理由 |
|---|---|---|
| **A. `public/vendor/` にコピーして `<script src>` / `<link href>` で参照（採用）** | ✅ | 現在のCDN参照URLを置き換えるだけで注入HTMLの構造が変わらない。Prism autoloader が必要とする「言語定義のディレクトリURL」と、KaTeX CSS が相対参照するフォントディレクトリを自然に満たせる。ブラウザキャッシュも効く |
| B. ライブラリのソースを文字列として注入HTMLにインライン展開 | ❌ | 1プレビューあたり約500KB以上のJSが毎回 `document.write` される。KaTeXのwebfont（CSSからの相対URL）はインライン化できず、結局URL配信が必要。Prism autoloader の言語定義も同様 |
| C. webpack の asset modules（`new URL('katex/dist/katex.min.js', import.meta.url)`）でハッシュ付きURLを得る | ❌ | 1ファイル単位の仕組みのため、Prism の言語ディレクトリ（約300ファイル）や KaTeX CSS→フォントの相対参照を保てない |
| D. ローカル読込失敗時にCDNへフォールバック | ❌ | 「オフラインで確実に動く」ことを検証しづらくなり、注入スクリプトが複雑化する。ローカル配信が失敗するのはビルド/配置ミスなので、開発時に気付ける方が良い |
| E. コピーしたファイルを git にコミット | ❌ | 1.5MB超のバイナリ・minifiedファイルの差分がリポジトリを汚す。`package.json` のバージョンから再現可能なので生成物として扱い `.gitignore` する |

### 2.2 バージョン付きディレクトリでキャッシュを制御する

本番 nginx には `.css|.js` に `expires 1y` のキャッシュ設定がある。ファイル名が同じままライブラリを更新すると
古いキャッシュが使われ続けるため、配置先は **`vendor/<パッケージ名>@<バージョン>/`** とする。

```
public/vendor/
├── chart.js@4.5.1/
│   └── chart.umd.min.js
├── katex@0.16.27/
│   ├── katex.min.js
│   ├── katex.min.css
│   └── fonts/*.woff2            （CSSが相対パス fonts/ で参照）
└── prismjs@1.30.0/
    ├── components/*.min.js      （autoloader が languages_path から遅延ロード）
    ├── plugins/autoloader/prism-autoloader.min.js
    ├── plugins/line-numbers/prism-line-numbers.min.js
    ├── plugins/line-numbers/prism-line-numbers.min.css
    └── themes/prism-tomorrow.min.css
```

バージョン番号は `node_modules/<pkg>/package.json` から読む（インストール済みの実バージョン）。
`chart.js` は `exports` フィールドで `package.json` の import を禁止しているため、
アプリコードからは直接 import できない。そのためコピースクリプトが
`lib/vendorManifest.generated.ts` にバージョンを書き出し、アプリ側はそれを import する。

### 2.3 URLの解決: ページのベースURLから絶対URLを組み立てる

`/_next/` と同様に **root 相対（`/vendor/...`）で書くと、開発環境の `/dev/` サブパス配信で 404 になる**
（nginx は `/dev/`・`/_next/`・`/__nextjs` しかプロキシしない）。
そのため実行時に `new URL('vendor/', document.baseURI).href` で絶対URLを組み立てる。

- 本番（ルート直下）: `https://example.com/` → `https://example.com/vendor/...`
- 開発（`/dev/`）: `http://localhost:8081/dev/` → `http://localhost:8081/dev/vendor/...` → nginx が `/dev/` を剥がして `next dev` の `public/vendor/...` に届く

絶対URLにしておくことで、処理済みHTMLが別ウィンドウや将来の「HTMLファイル保存」で生成元ページから切り離されても、
配信サーバーに到達できる限り参照が壊れない（オフラインで単体HTMLとして開く用途は本計画の範囲外）。
`document` が無い環境（SSG のプリレンダリング時にうっかり呼ばれた場合）は `/vendor/` にフォールバックする。

### 2.4 コピー対象の選定

| ライブラリ | コピー対象 | 理由 |
|---|---|---|
| Chart.js | `dist/chart.umd.min.js` | CDNで使っていたUMDビルドの同等物 |
| KaTeX | `dist/katex.min.js`, `dist/katex.min.css`, `dist/fonts/*.woff2`（約300KB） | CSSの `@font-face` は woff2 → woff → ttf の順で宣言されており、対象ブラウザ（Chrome/Edge/Firefox/Safari）はすべて woff2 を取得する。woff/ttf を省いてサイズを1/4にする |
| Prism.js | `components/*.min.js` 全言語（約1.4MB）, `plugins/autoloader`, `plugins/line-numbers`, `themes/prism-tomorrow.min.css` | 言語定義は autoloader が必要時に1ファイルずつ取得するため、全言語を置いてもページ重量は増えない。コードブロック挿入UIの対応言語（26種）とその依存（jsx→javascript+markup、tsx→jsx+typescript、cpp→c、scss→css、php→markup-templating 等）を手で列挙するより、全部置く方が将来の言語追加にも安全 |

---

## 3. ファイル構成

```
scripts/
└── copy-vendor-assets.mjs        # 新規: node_modules → public/vendor/ コピー、manifest生成
lib/
├── vendorManifest.generated.ts   # 新規（生成物だがコミットする）: バージョン定数
├── vendorAssets.ts               # 新規: ベースURL解決と各ファイルURLの組み立て
├── htmlProcessor.ts              # 変更: CDN URL → vendorAssets のURL
└── pdfExporter.ts                # 変更: コメントのみ（「CDN不達」→「ライブラリ読込失敗」）
public/
└── vendor/                       # 生成物（.gitignore）
package.json                      # 変更: predev / prebuild フック、export スクリプト
.gitignore                        # 変更: /public/vendor/
docs/
├── CDN_LOCAL_BUNDLE_PLAN.md      # 本書
└── PDF_EXPORT_PLAN.md            # 変更: リスク表のCDN行を更新
README.md                         # 変更: セットアップ手順に vendor 生成の説明（自動実行の旨）
```

`lib/vendorManifest.generated.ts` をコミットする理由: `.gitignore` すると、clone 直後に `npm run dev` を
実行する前の段階で型チェック（IDE / `tsc`）が壊れる。スクリプトは内容が変わる時だけ書き換えるため、
通常のコミットでは差分が出ない。

---

## 4. 実装詳細

### 4.1 `scripts/copy-vendor-assets.mjs`

Node 標準モジュールのみで実装する（追加依存なし）。

```js
// 概要（擬似コード）
const ROOT = プロジェクトルート
const pkgVersion = (name) => JSON.parse(readFileSync(`${ROOT}/node_modules/${name}/package.json`)).version

const targets = [
  { name: 'chart.js', files: ['dist/chart.umd.min.js' → 'chart.umd.min.js'] },
  { name: 'katex',    files: ['dist/katex.min.js', 'dist/katex.min.css', 'dist/fonts/*.woff2' → 'fonts/'] },
  { name: 'prismjs',  files: ['components/*.min.js' → 'components/',
                              'plugins/autoloader/prism-autoloader.min.js',
                              'plugins/line-numbers/prism-line-numbers.min.js',
                              'plugins/line-numbers/prism-line-numbers.min.css',
                              'themes/prism-tomorrow.min.css'] },
]

1. public/vendor/ を削除して作り直す（古いバージョンのディレクトリを残さない）
   ※ dev サーバー起動中に手動実行すると作り直しの瞬間だけ 404 になる。通常は predev / prebuild 経由で使う
2. 各 target を public/vendor/<name>@<version>/ 配下にコピー
3. lib/vendorManifest.generated.ts を生成（内容が同一なら書き込まない）:
     export const VENDOR_VERSIONS = { chartjs: '4.5.1', katex: '0.16.27', prismjs: '1.30.0' } as const
4. コピー元が見つからなければ非0終了（npm install 忘れを早期に検出）
```

`package.json`:

```json
"scripts": {
  "vendor": "node scripts/copy-vendor-assets.mjs",
  "predev": "npm run vendor",
  "prebuild": "npm run vendor",
  "dev": "next dev",
  "build": "next build",
  "export": "npm run build"
}
```

- `export` は現在 `next build` を直接呼んでいるため `prebuild` が走らない。`npm run build` 経由に変更する。
- `postinstall` は使わない（CI等で `--ignore-scripts` されると不整合になるため、常に `dev`/`build` 直前に生成する）。

### 4.2 `lib/vendorAssets.ts`

```ts
import { VENDOR_VERSIONS } from './vendorManifest.generated'

/** 配信ベースURL（末尾スラッシュ付き絶対URL）。about:blank文書に注入しても解決できるよう絶対化する */
export function getVendorBaseURL(): string {
  if (typeof document === 'undefined') return '/vendor/'
  return new URL('vendor/', document.baseURI).href
}

export function getVendorAssetURLs() {
  const base = getVendorBaseURL()
  const chart = `${base}chart.js@${VENDOR_VERSIONS.chartjs}/`
  const katex = `${base}katex@${VENDOR_VERSIONS.katex}/`
  const prism = `${base}prismjs@${VENDOR_VERSIONS.prismjs}/`
  return {
    chartJs: `${chart}chart.umd.min.js`,
    katexJs: `${katex}katex.min.js`,
    katexCss: `${katex}katex.min.css`,
    prismCore: `${prism}components/prism-core.min.js`,
    prismAutoloader: `${prism}plugins/autoloader/prism-autoloader.min.js`,
    prismLineNumbersJs: `${prism}plugins/line-numbers/prism-line-numbers.min.js`,
    prismLineNumbersCss: `${prism}plugins/line-numbers/prism-line-numbers.min.css`,
    prismTheme: `${prism}themes/prism-tomorrow.min.css`,
    prismLanguagesPath: `${prism}components/`,   // autoloader の languages_path
  }
}
```

### 4.3 `lib/htmlProcessor.ts` の変更

- `addChartInitializationScript` / `addEquationRendering` / `addCodeBlockHighlighting` の冒頭で
  `getVendorAssetURLs()` を呼び、テンプレート文字列内のCDN URLを置き換える。
- Prism の `languages_path` も `prismLanguagesPath` に置き換える。
  autoloader は自身の `<script src>`（`plugins/autoloader/prism-autoloader.min.js`）から `components/` を自動導出するため
  2.2 の配置なら明示設定は冗長だが、配置を変えた時に黙って壊れないよう保険として残す。
- 注入する `<script>` / `<link>` に `onerror` を付け、読み込み失敗を `console.error` で可視化する
  （例: `onerror="console.error('[vendor] 読み込み失敗:', this.src || this.href)"`）。
  CDNフォールバックを設けない代わりの検知手段で、配置ミス・パス解決ミスを開発中に気付けるようにする（2.1-D の前提）。
- 初期化スクリプト本体（Chart生成、KaTeX render、Prism highlight）のロジックは変更しない。
- コメントの「CDNスクリプト」表記を「ローカル配信スクリプト」に直す。

### 4.4 `lib/pdfExporter.ts` の扱い

`waitForCharts` / `waitForKaTeX` / `waitForPrism` は「ライブラリが読み込めなかった場合に deadline を待たず打ち切る」
設計になっており、ローカル配信でも（配置ミス等で）同じ失敗モードはあり得るため **ロジックは変更しない**。
コメント中の「CDN不達」を「ライブラリ読込失敗（配置ミス等）」に書き換えるのみ。

`fonts.ready` をリッチ要素の後に待つ順序も、KaTeX フォントがローカル配信になっても
「描画後にフォント読み込みが始まる」性質は変わらないので維持する。

### 4.5 バージョン差分の確認事項

CDNで固定していたバージョンとインストール済みバージョンに差がある。切り替え時に見た目の回帰がないか確認する。

| ライブラリ | CDN固定 | 切替後（インストール済み） | 確認ポイント |
|---|---|---|---|
| Chart.js | 4.4.0 | 4.5.x | 凡例・タイトル・スケール描画。`animation: false` の同期描画（PDF） |
| KaTeX | 0.16.9 | 0.16.2x | インライン/ブロック数式、エラー表示色、フォント欠けの有無 |
| Prism.js | 1.29.0 | 1.30.0 | autoloader の依存解決（jsx/tsx/scss/php）、line-numbers の `data-start` |

---

## 5. 実装フェーズ

### Phase 1: 配信基盤（コピースクリプトとビルド連携）

- [ ] `scripts/copy-vendor-assets.mjs` を作成（2.4 の対象、バージョン付きディレクトリ、manifest 生成、エラー時非0終了）
- [ ] `lib/vendorManifest.generated.ts` を生成してコミット
- [ ] `package.json` に `vendor` / `predev` / `prebuild` を追加し、`export` を `npm run build` に変更
- [ ] `.gitignore` に `/public/vendor/` を追加
- [ ] `npm run vendor` 実行後、`public/vendor/` の構成が 2.2 の図と一致することを確認
- [ ] `npm run build` 後、`out/vendor/` に同じ構成が出力されることを確認

### Phase 2: 注入HTMLの切り替え

- [ ] `lib/vendorAssets.ts` を作成
- [ ] `lib/htmlProcessor.ts` の9箇所のCDN URLと `languages_path` を置き換える
- [ ] `grep -rn "cdn.jsdelivr.net\|cdnjs.cloudflare.com" lib app components` がヒットしないことを確認
- [ ] プレビュー（iframe）・別ウィンドウプレビュー・プレゼンテーションモードでグラフ・数式・コードが描画される
- [ ] DevTools の Network でリクエスト先が `.../vendor/...` のみになっている（開発環境 `/dev/vendor/...` を含む）
- [ ] `public/vendor/` を一時的にリネームした状態でプレビューを開き、Console に `[vendor] 読み込み失敗` が出ることを確認（検知経路の動作確認）

### Phase 3: PDF出力・ドキュメント整合

- [ ] `lib/pdfExporter.ts` のコメントを更新（ロジック変更なし）
- [ ] `docs/PDF_EXPORT_PLAN.md` リスク表の「CDNに接続できない環境」行を「解消済み（本書参照）」に更新し、
      テスト計画の「オフライン（CDN不達）時…」項目を「オフライン時もグラフ・数式・コードが描画される」に書き換える
- [ ] `README.md` のセットアップ手順に、`npm run dev` / `npm run build` が `public/vendor/` を自動生成する旨を1行追記
- [ ] `README.md` のデプロイ節に、配信サーバーで `vendor/` 配下（特に woff2）を長期キャッシュ対象にする推奨を追記
- [ ] Notion「Slide Editor Next」の本タスクを Done にする

### Phase 4: 検証（オフライン再現）

- [ ] 検証用スライドの確定: グラフ・数式・コードブロックを含む `docs/all-features-template.html`（現在未コミット）を
      Phase 4 着手前にコミットして検証入力にする。コミットしない判断なら、リポジトリ内の `docs/pdf-export-test-slides.html` を使う
- [ ] ヘッドレス Chromium（CDP）で `Network.setBlockedURLs(['*cdn.jsdelivr.net*', '*cdnjs.cloudflare.com*'])` を設定し、
      上記の検証用スライドでプレビューを描画してスクリーンショットで3要素を確認
- [ ] 同条件で PDF 出力し、poppler（`pdftotext` / `pdftoppm`）で数式・コードが空でないことを確認
- [ ] `out/` を nginx のルート直下で配信し、オフライン（ネットワーク切断）でもリッチ要素が描画されることを手動確認
- [ ] 4.5 のバージョン差分確認ポイントを目視

---

## 6. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| `public/vendor/` 未生成のまま `next dev` / `next build` が走る | リッチ要素が空になる | `predev` / `prebuild` で必ず生成。スクリプトはコピー元欠落で非0終了 |
| サブパス配信（`/dev/` 等）で root 相対URLが404 | 開発環境で描画されない | `document.baseURI` 基準の絶対URL生成（2.3） |
| nginx の `expires 1y` でライブラリ更新後も旧ファイルがキャッシュされる | 新旧混在・描画崩れ | バージョン付きディレクトリ（2.2）。更新時はURLが変わる |
| 本番 nginx の長期キャッシュ対象が css/js/画像のみで woff2 が含まれない | プレビューは入力ごとに iframe を書き直すため、数式を含むスライドでは入力のたびに使用中の KaTeX フォントファイル（woff2）が再検証される | **運用事項（リポジトリ外）**: 配置先サーバーのキャッシュ規則に `woff2` を追加する。バージョン付きディレクトリ配下なので長期キャッシュしても安全。README のデプロイ節に注記する |
| CDN固定版からのバージョン差で見た目が変わる | 微細なレンダリング差 | 4.5 の確認ポイントで目視。問題があれば `package.json` でピン止め |
| KaTeX の woff/ttf を省いたことによるフォント欠け | 古いブラウザで数式フォントが代替になる | 対象ブラウザは全て woff2 対応。必要になれば全フォーマットをコピー対象に追加するだけ |
| Prism autoloader が依存言語を取得できない | 一部言語のハイライト欠け | 全 `components/*.min.js` を配置（2.4） |
| 処理済みHTMLを別ウィンドウで開いた後にアプリをデプロイし直す | 旧バージョンURLが404 | 別ウィンドウは一時的な表示であり再プレビューで解消。既知の限界として扱う |
| `postinstall` に依存した運用 | `--ignore-scripts` 環境で不整合 | `postinstall` は使わず `dev`/`build` 直前に生成（4.1） |

---

## 7. 影響範囲（変更しないもの）

- PowerPoint出力（`lib/powerpointExporter.ts` / `lib/chartRenderer.ts`）は `chart.js` を npm から import しており、
  本件の影響を受けない。KaTeX 画像化・Prism 配色再現は Notion 上の別タスク。
- スライドHTML（ユーザーが編集するエディタ内容）にはライブラリ参照が含まれない（注入は `htmlProcessor` 側）。
  既存プロジェクトの互換性に影響しない。
- `public/fonts/`（Noto Sans JP）の扱いは変更しない。

---

## 8. 工数見積

| フェーズ | 目安 |
|---|---|
| Phase 1 | 1.5h |
| Phase 2 | 1h |
| Phase 3 | 0.5h |
| Phase 4 | 1h |

Notion の Effort level「Medium」と整合する。
