# PDFエクスポート機能 実装計画（v2.2）

## 1. 概要

スライドエディタに、**プレビューの見た目をそのまま再現した** PDF形式（.pdf）でのエクスポート機能を追加します。

### 目標

- スライドを**見た目そのまま**（レイアウト・色・グラフ・数式・コードブロック・画像を含む）PDFに変換
- テキスト・数式・コード・表は**選択・検索可能なベクター**として出力
  （※ Chart.jsのグラフはcanvasへのラスター描画、画像はビットマップのまま。「PDF全体がベクター」ではない点に注意）
- クライアントサイドのみで完結（本アプリは `output: 'export'` の静的ホスティングのため、サーバー処理は不可）
- A4横向き・16:9（1920×1080）の両スライドサイズ、CSSデザインテンプレート（プリセット5種＋カスタム）に対応
- 既存アーキテクチャ（`htmlProcessor` / `HamburgerMenu` / `useSlideSize` / `useCSSDesignTemplate`）と統合

### 背景

- WELLBEING_EVALUATION.md で重要度5（最重要）、Phase 5（共有・配布）の最優先機能
- v1計画（2025-12-20版）は html2canvas + jsPDF によるラスター方式だったが、
  「見た目そのまま」の要件を踏まえて**ブラウザ印刷エンジンを使う方式を主軸に全面改訂**
- v2.1: 実装前レビューの指摘（iframeサイズ・待機対象window・末尾空白ページ・タイムアウト設計・
  フォント待機順序、ほか計画と現行コードの食い違い）を反映

---

## 2. 方式の比較と選定

### 2.1 候補方式

| | 方式A: 印刷ダイアログ方式（推奨） | 方式B: html2canvas + jsPDF | 方式C: Lambda + ヘッドレスブラウザ |
|---|---|---|---|
| 仕組み | 非表示iframeにレンダリングし `window.print()` → ユーザーが「PDFに保存」 | 各スライドをCanvasに描画し画像としてPDF化 | サーバー側でChromiumがHTMLをPDF化 |
| 見た目の忠実度 | ◎ ブラウザの描画そのもの（画面表示と同一エンジン） | △ html2canvasはCSSを独自実装で再解釈するため、KaTeXの複雑なレイアウト・影・グラデーション等でズレが出やすい | ◎ Chromiumの描画そのもの |
| テキスト | ◎ ベクター（選択・検索可）。グラフ・画像はラスター | ✕ 全体が画像化（選択不可、拡大でぼやける） | ◎ ベクター（グラフ・画像はラスター） |
| ファイルサイズ | ◎ 小さい | △ 高解像度化すると大きい | ◎ 小さい |
| 操作 | △ 印刷ダイアログで「PDFに保存」を選ぶ1ステップが挟まる | ◎ ワンクリックでダウンロード | ◎ ワンクリック |
| 実装コスト | ◎ 小（印刷用CSS・`@page` の下地が実装済み） | ○ 中 | ✕ 大（Lambda追加、Chromiumレイヤー、コスト・コールドスタート） |
| 追加依存 | なし | jspdf + html2canvas系 | サーバーインフラ |

### 2.2 選定: 方式A（印刷ダイアログ方式）を主軸に採用

理由:

1. **「見た目そのまま」の要件をクライアント完結で満たせる**。画面プレビューと同じブラウザレンダリングエンジンが描画するため、原理的にズレが生じない（同等の忠実度を持つ方式Cは静的配信前提と衝突する）。
2. コードベースには印刷対応の下地が既に仕込まれている:
   - `lib/slideStyleConfig.ts` に `@media print`（背景白・影なし・マージン0）、`@page { size: ...; margin: 0 }`、`.slide` ごとの `page-break-after: always` が実装済み
   - ただしこれは**ビルトインテンプレート限定**。カスタムCSSテンプレートにはサイズ上書きしか乗らないため、エクスポータ側で印刷CSSを独立注入して吸収する（5.3参照）
3. 静的エクスポート構成（Nginx配信）を変えずに済む。
4. 唯一の弱点（ダイアログ1ステップ）は、`document.title` でデフォルトファイル名を指定できることから実用上の負担が小さい。
   ※ Chromeは前回の出力先を記憶するため「PDFに保存」が既定になる**保証はない**。ステータスバーで「保存先に『PDFに保存』を選択してください」と案内する。

方式B（ワンクリック直接ダウンロード）は、方式Aリリース後にニーズがあれば **Phase 3のオプション**として追加する（併存可能）。方式Cは本構成では見送り。

---

## 3. ファイル構成

```
slide-editor-nextjs/
├── lib/
│   ├── pdfExporter.ts                 # 新規: 印刷用iframe生成・レンダリング待機・印刷CSS注入・印刷呼び出し
│   └── htmlProcessor.ts               # 変更(小): disableAnimation オプションの貫通（グラフのアニメーション無効化）
├── components/
│   └── Menu/
│       └── HamburgerMenu.tsx          # 変更: 「💾 データ」セクションに「📄 PDF出力」を追加（ハンドラはここで完結）
└── （Phase 3でショートカットを入れる場合のみ）
    ├── lib/keyboardShortcutsConfig.ts # ShortcutActions への追加
    ├── hooks/useKeyboardShortcuts.ts  # 配線
    └── app/page.tsx                   # shortcutActions への追加
```

- ハンドラは既存の `openPreviewWindow()` と同様に **HamburgerMenu内で完結**する。
  `page.tsx` を触るのはPhase 3でキーボードショートカットを追加するときだけ。
- 新しい型・ストレージ・モーダルは**不要**（方式Aは設定項目を持たないため）。

---

## 4. 処理フロー（方式A）

```
[📄 PDF出力 クリック]（HamburgerMenu）
        │
        ▼
processHTMLForPreviewAsync(htmlContent, sizeConfig, template, { disableAnimation: true })
  … 既存関数。CSSインライン化・localStorage画像のdata URI化・
     Chart.js / KaTeX / Prism の初期化スクリプト注入まで済んだ
     自己完結HTMLが得られる
        │
        ▼
印刷用CSSの独立注入（テンプレート由来CSSに依存しない）
  … print-color-adjust / break制御(:last-of-type) / @page再指定 など（5.3参照）
        │
        ▼
オフスクリーンiframeを実寸で生成して書き込み
  … document.open/write/close（PresentationModeと同じパターン）
     document.title = スライド_YYYY-MM-DD
        │
        ▼
レンダリング完了待機（共有deadline方式、対象はすべて iframe側のwindow/document）
  1. iframe文書の load / readyState complete（write後に待つ。about:blankのload二重発火に注意）
  2. 全<img>の complete / error
  3. Chart.js: iframe側 Chart.getChart(canvas) がインスタンスを返すまでポーリング
  4. KaTeX: 対象要素に .katex 子要素が現れるまでポーリング
  5. Prism: コードブロックが無ければ即スキップ。有ればdeadlineまで待って打ち切り続行
  6. doc.fonts.ready を【ここで】await（KaTeXのwebfontは描画後に読み込まれるため最後）
  7. 描画反映の保険として短い固定ウェイト（300ms）
        │
        ▼
iframe.contentWindow.print()
        │
        ▼
後片付け（ダイアログ表示中は破棄しない）
  … afterprint受信 → 短い遅延（例: 1s）後に iframe破棄・フラグ解除
     afterprintが来ない場合のみ 60s 上限タイマーで破棄・フラグ解除
```

---

## 5. 実装の詳細

### 5.1 `lib/pdfExporter.ts`（新規）

```typescript
import { processHTMLForPreviewAsync } from './htmlProcessor'
import type { SlideSizeConfig, CSSDesignTemplate } from '@/types'

export interface PDFExportOptions {
  fileName?: string          // 既定: `スライド_YYYY-MM-DD`（document.titleに設定）
  timeoutMs?: number         // レンダリング待機全体の上限（既定: 15000、共有deadline）
}

/**
 * スライドを印刷ダイアログ経由でPDF出力する。
 * プレビューと同一のHTML処理パイプラインを通すため、見た目が一致する。
 */
export async function exportToPDF(
  htmlContent: string,
  sizeConfig: SlideSizeConfig,
  template?: CSSDesignTemplate,
  options?: PDFExportOptions
): Promise<void>
```

実装上のポイント:

- **iframeは実寸でオフスクリーンに置く（0×0は禁止）**。
  Chart.jsは `responsive: true` で動くため、幅・高さ0のコンテナではcanvasが0×0のまま印刷され、グラフが空になる。
  - 推奨: `position: fixed; left: -10000px; top: 0;` （または `opacity: 0`）で画面外に置く。
  - **幅**: px換算せず `sizeConfig.width` をそのまま設定する（`'297mm'` / `'1920px'`）。換算誤差によるズレを防ぐ。
  - **高さ**: 画面用CSSの `.slide { margin: 20px auto }` が乗るため、スライド高さ×枚数だけでは足りない。
    マージン分を含めないと下方のスライドがクリップされ、そのcanvasが潰れる。
    最も確実なのは、書き込み・load完了後に `doc.documentElement.scrollHeight` を測って
    `iframe.style.height` に設定し直す方法（初期値は `sizeConfig.height` × 枚数＋マージン分の概算でよい）。
  - `display: none` は一部ブラウザで印刷内容が空になるため使わない。
  - `sandbox` 属性は付けない（`print()` には `allow-modals` 相当の権限が必要）。
- **書き込みとload待ち**: `PresentationMode` と同じ `document.open/write/close` パターン。
  about:blank の load は二重発火し得るため、**write後の** load イベントまたは `document.readyState === 'complete'` で待つ。
- **背景・装飾の印刷**: Chrome/Edgeは既定で背景を印刷しないため、`print-color-adjust: exact` を全要素に注入する（5.3のCSSに含める）。
- **ファイル名**: 印刷APIにファイル名指定はないが、Chrome/Edgeは `document.title` を
  「PDFに保存」のデフォルトファイル名に使うことが多い。Phase 1は **`スライド_YYYY-MM-DD` に統一**する
  （現行UIには「開いているプロジェクト名」の単一ソースが無いため、プロジェクト名の反映は名前の単一ソースができてからの拡張とする）。
- **多重起動防止**: エクスポート中フラグを持ち、ボタン連打で複数iframe/printが走らないようにする。
- **後片付け**: **ダイアログ表示中は破棄しない**ことを原則とし、2段構えにする。
  1. `afterprint` を受信したら**短い遅延（例: 1秒）を挟んで**iframe破棄・フラグ解除する。
     即時破棄はSafariでafterprintがダイアログ表示前に発火するケースで早すぎるため、遅延が必要。
  2. afterprintが来ない環境向けの**上限タイマー（60秒）は保険であり、通常経路にしない**。
     常に60秒待ってからフラグ解除する実装にすると「キャンセル後すぐ再実行」ができなくなる。
     afterprint経路で解除された場合は上限タイマーをクリアする。
  なお、印刷ダイアログを60秒以上開いたままにされると上限タイマー破棄で出力が壊れ得る。
  これは既知の限界として受け入れる（afterprint対応ブラウザ＝Chrome/Edgeでは発生しない）。

### 5.2 レンダリング待機ロジック（共有deadline方式）

`timeoutMs` を各waitに直列で渡すと上限が積み上がる（15秒×3=45秒）ため、
**開始時に `const deadline = Date.now() + timeoutMs` を1つ切り、全waitで共有**する。

```typescript
// 前提: exportToPDF() 側で write 後の load / readyState === 'complete' を待ってから呼ぶ（§4 手順1）。
// この関数は load 済みの iframe を受け取る。load待ちをここに含めない場合、呼び出し側で必ず待つこと。
async function waitForRenderComplete(iframe: HTMLIFrameElement, timeoutMs: number): Promise<void> {
  const doc = iframe.contentDocument!
  const win = doc.defaultView!               // ★ 待機対象はすべてiframe側のwindow
  const deadline = Date.now() + timeoutMs    // ★ 共有deadline

  await waitForImages(doc, deadline)         // img.complete / load・errorイベント
  await waitForCharts(win, doc, deadline)    // 下記
  await waitForKaTeX(doc, deadline)
  await waitForPrism(doc, deadline)
  await doc.fonts.ready                      // ★ KaTeX描画後にwebfontが追加されるため、最後に待つ
  await delay(300)                           // 描画反映の保険
}
```

- **Chart.js**: Chart.jsは**iframe内に読み込まれる**ため、親windowの `window.Chart` は常にundefined。
  必ず `doc.defaultView.Chart?.getChart(canvas)` を参照する。
  `.slide-chart-container canvas` それぞれについてインスタンスが返るまでポーリング（50ms間隔、deadline打ち切り）。
  CDN読込失敗時はdeadlineで諦めて続行（プレビューと同じ挙動＝グラフ枠が空になるだけで、他要素の出力は継続）。
- **アニメーション対策**: グラフのフェードインアニメーション中に印刷されると中間状態が写る。
  `htmlProcessor.ts` のグラフ初期化スクリプトに `animation: false` を差し込めるよう、
  `addChartInitializationScript()` にオプション引数（`disableAnimation?: boolean`）を追加し、
  `processHTMLForPreviewAsync()` にオプションを貫通させる（既定はfalseでプレビューの挙動は不変）。
- **KaTeX**: `.slide-equation-inline[data-latex], .slide-equation-block[data-latex]` の各要素が
  `.katex` 子要素を持つ（=レンダリング済み）までポーリング（deadline打ち切り）。
- **Prism**: **`.token` 子要素待ちはしない**（plaintext指定やautoloaderの言語遅延ロードで
  永久にタイムアウトし続けるため）。コードブロックが無ければ即スキップ、
  有る場合もdeadlineまでの短い猶予で打ち切って続行する（ハイライト欠けは許容）。
- **fonts.ready の位置**: KaTeXはCDN CSSのwebfontを使い、**描画後にフォント読み込みが始まる**。
  最初に `fonts.ready` を待っても意味がないため、リッチ要素の待機が終わった後に await する。

### 5.3 印刷CSSの独立注入（テンプレートに依存しない）

既存の `@media print` / `@page` は `getSlideStylesCSS()`（ビルトインテンプレート）が出力するが、
**カスタムCSSテンプレートにはサイズ上書き（`getSlideSizeOverrideCSS`）しか乗らず、既存の印刷CSS全文は付かない**。
また、グラフ・数式・コードがあるスライドでは `</body>` 直前に `<script>` が注入されるため、
**最後の `.slide` は `:last-child` にならない** — 既存CSSの `.slide:last-child` では末尾空白ページを防げない。

そこで `pdfExporter` が以下のCSSを**常に独立注入**する（テンプレート種別に関わらず動作を保証）:

```css
@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body { margin: 0 !important; padding: 0 !important; }
  .slide {
    margin: 0 !important;
    box-shadow: none !important;
    overflow: visible !important;  /* カスタムテンプレの overflow: hidden 残留対策（ビルトインは既存printCSSで対応済み） */
    break-after: page !important;
    page-break-after: always !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  .slide:last-of-type {          /* :last-child ではなく :last-of-type（末尾script対策） */
    break-after: auto !important;
    page-break-after: auto !important;
  }
}
@page {
  size: ${sizeConfig.pageSize};  /* カスタムテンプレートでの@page欠落を吸収 */
  margin: 0;
}
```

※ 既存printCSSの `body { background: white }` はそのまま生かす。PDFは余白0でスライド（白背景）が
ページ全面を占めるため、**テンプレートの `background`（プレビュー周囲色）はPDFにはほぼ現れない**。
テンプレートの個性は見出し色・蛍光ペン・リスト記号として出力される（Phase 2の確認観点もこれに合わせる）。

### 5.4 UI統合

1. **`components/Menu/HamburgerMenu.tsx`** — ここで完結させる（`openPreviewWindow()` と同じ責務配置）:
   「💾 データ」セクション（HTMLコピーの並び）に追加:
   ```tsx
   <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); handleExportPDF(); }}>
     📄 PDF出力
   </button>
   ```
   ハンドラは `sizeConfig` / `template` を参照して `exportToPDF()` を呼ぶ。
   空コンテンツ時は `alert('出力するスライドがありません')`。
   `onStatusUpdate` で「PDFを準備中…」→ `print()` 直前に「印刷ダイアログで『PDFに保存』を選択してください」へ切替。
2. **キーボードショートカット（Ctrl+P）はPhase 3送り**。
   ブラウザ既定の印刷を奪う変更であり、`ShortcutActions` 型・`useKeyboardShortcuts`・`page.tsx` の
   `shortcutActions` をセットで変更する必要があるため、Phase 1のスコープには含めない
   （既存ユーザーのlocalStorageはidマージ済みのため、追加時にCONFIG_VERSIONを上げなくても新エントリは届く）。

### 5.5 16:9 サイズの注意点

- `@page { size: 1920px 1080px }` はCSS的に有効（96dpi換算で 508mm × 285.75mm の物理ページになる）。
  Chrome/Edgeは正しく解釈するが、**印刷ダイアログ上の用紙表示が巨大なサイズになる**。
  Phase 1の完了条件は「余白0・1スライド=1ページ」までとし、
  ページ寸法の正規化（PowerPoint既定の13.33in × 7.5in化）はPhase 3の検討事項とする。

---

## 6. 実装フェーズ

### Phase 1: 印刷ベースPDF出力（必須・本体）

- [ ] `lib/pdfExporter.ts` を作成
  - [ ] `exportToPDF()` 本体（実寸オフスクリーンiframe生成 → write → 待機 → print → 後片付け）
  - [ ] 共有deadline方式の `waitForImages` / `waitForCharts`（iframe側window参照） / `waitForKaTeX` / `waitForPrism`（コード無しは即スキップ）
  - [ ] `fonts.ready` はリッチ要素待機の後に await
  - [ ] 印刷CSSの独立注入（5.3の全文: print-color-adjust / `:last-of-type` break制御 / `@page` 再指定）
  - [ ] iframeの幅は `sizeConfig.width` をそのまま使用、高さはload後に `scrollHeight` で設定し直す
  - [ ] `document.title = スライド_YYYY-MM-DD`
  - [ ] 多重起動防止フラグ、後片付けは「afterprint→短遅延→破棄・フラグ解除」＋afterprint不達時のみ60s上限タイマー
- [ ] `lib/htmlProcessor.ts` に `disableAnimation` オプションを追加（`addChartInitializationScript` へ貫通）
- [ ] `HamburgerMenu.tsx` に「📄 PDF出力」ボタンとハンドラを追加（ここで完結、`onStatusUpdate` 連携）

**完了条件**: テキストのみのスライドが、A4横向き・16:9の両方で、プレビューと同じ見た目のPDFとして保存できる（1スライド=1ページ、余白なし、末尾に空白ページなし）。ファイル名既定値が `スライド_YYYY-MM-DD`。

### Phase 2: リッチ要素の検証と調整（必須・品質確認）

実装はPhase 1に含まれるため、このフェーズは**全機能の組み合わせ検証と微調整**:

- [ ] 画像（localStorage参照 → data URI変換済み）を含むスライド
- [ ] 表（`tableStyles` の全スタイル）を含むスライド
- [ ] グラフ（全チャート種別）を含むスライド — **空描画にならないこと**・アニメーション中間状態が写らないこと・**末尾に空白ページが出ないこと**
- [ ] 数式（インライン・ブロック）を含むスライド — KaTeXフォント適用後の見た目で出力されること
- [ ] コードブロック（ハイライト・行番号）を含むスライド
- [ ] 2分割レイアウト（slide-split）
- [ ] CSSデザインテンプレート5種＋**カスタムテンプレート**で、**見出し色・蛍光ペン・リスト記号**が反映されること
  （※ テンプレートの `background` はプレビュー周囲色でありPDFには現れない — 5.3参照）
- [ ] 10枚以上のスライドでページ落ち・ページ跨ぎがないこと
  （Flex + `break-inside: avoid` はChrome印刷の既知の弱点のため重点確認）
- [ ] 画面用 `overflow: hidden` と印刷用 `overflow: visible` の差で、はみ出しコンテンツの見え方がプレビューと変わるケースの確認

### Phase 3: オプション機能（必要になったら）

- [ ] **ワンクリック直接ダウンロード（方式B併設)**
  - `jspdf` + `html2canvas-pro`（本家html2canvasはメンテ停滞・モダンCSS非対応のためpro版を採用）
  - メニューに「📄 PDF出力（画像形式・ダイアログなし）」として併設
  - v1計画書（git履歴: 2025-12-20版 PDF_EXPORT_PLAN.md）の設計を流用
- [ ] Ctrl+P ショートカット割り当て（`ShortcutActions` / `useKeyboardShortcuts` / `page.tsx` をセットで変更、fileカテゴリ）
- [ ] エクスポート範囲指定（現在のスライドのみ / 全スライド）
- [ ] 16:9のPDFページ寸法の正規化（13.33in × 7.5in 化）
- [ ] ファイル名へのプロジェクト名反映（「開いているプロジェクト名」の単一ソース整備が前提）

---

## 7. 考慮事項・リスク

| リスク | 影響 | 対策 |
|---|---|---|
| iframeを0×0で作る実装ミス | Chart.jsが `responsive: true` のためグラフが空で印刷される | 実寸オフスクリーン配置を必須要件とする（5.1）。Phase 2でグラフ空描画を重点確認 |
| 待機対象を親windowにする実装ミス | `window.Chart` が常にundefinedでdeadlineまで無駄待ち | `doc.defaultView` 経由の参照を必須要件とする（5.2） |
| 末尾スクリプト注入により `.slide:last-child` が効かない | 最終ページの後に空白ページ | `:last-of-type` を使う印刷CSSを独立注入（5.3） |
| CDN（Chart.js/KaTeX/Prism）に接続できない環境 | 該当要素が空のまま出力される | 待機は共有deadlineで打ち切り、他要素は正常出力。プレビューも同条件で壊れるため既知の制約として扱う。CDN→ローカルバンドル化は別課題 |
| Chromeが前回の出力先（物理プリンタ等）を記憶している | 「PDFに保存」が既定にならない | ステータスメッセージで「保存先に『PDFに保存』を選択してください」と案内 |
| ダイアログの用紙設定をユーザーが変更 | レイアウト崩れ | `@page size` 指定によりChromeは用紙サイズを自動選択する。ヘッダー/フッターも `margin: 0` により実質無効。案内文言で補足 |
| クライアントOSのフォント差 | 指定フォントはHiragino/Meiryo。LinuxなどではOSの代替フォントが埋め込まれ、見た目が変わり得る | 既知制約としてテスト計画・READMEに明記（Webフォント化は別課題） |
| Firefox/Safariでの挙動差（`@page size` の解釈、afterprintの発火タイミング） | ページサイズ不一致・後片付け不全 | 主対象をChrome/Edgeとし、他ブラウザは動作確認の上で既知の制限として明記。afterprintに依存せずフォールバックタイマーで破棄を保証 |
| `display:none` iframeの印刷が空になる | 出力失敗 | 実寸オフスクリーン配置で回避（5.1参照） |
| 印刷中にiframeを破棄すると出力が壊れる / 破棄されずリーク | 出力失敗・メモリリーク | afterprint→短遅延→破棄を通常経路とし、60s上限タイマーはafterprint不達時の保険に限定（afterprint受信時はタイマーをクリア）。ダイアログを60秒超開いたままのケースは既知の限界 |
| ボタン連打による多重実行 | ダイアログ多重表示 | エクスポート中フラグでガード |

---

## 8. テスト計画（手動確認）

- [ ] Chrome / Edge で「PDFに保存」した結果がプレビューと目視で一致する
- [ ] PDF内のテキスト・数式・コードが選択・検索できる（グラフ・画像はラスターで正しい）
- [ ] 1スライド=1PDFページ、**グラフ・数式・コード入りでも**末尾に空白ページが増えないこと
- [ ] A4横向き: ページ寸法 297×210mm、余白0
- [ ] 16:9: ページ寸法がスライドと同比率、余白0
- [ ] ファイル名の既定値が `スライド_YYYY-MM-DD` になっている
- [ ] 空エディタで実行した際にアラートが出て何も起きない
- [ ] エクスポート中にもう一度ボタンを押しても二重実行されない
- [ ] キャンセル（ダイアログを閉じる）後、再実行できる（iframeリーク・フラグ残留がない）
- [ ] カスタムCSSテンプレート適用時も余白0・改ページ・背景印刷が正しい（独立注入CSSの確認）
- [ ] オフライン（CDN不達）時、グラフ・数式が空でも他要素は出力され、deadline内に完了する
- [ ] Phase 2 のリッチ要素チェックリスト全項目

---

## 9. 参考資料

### 既存実装の参考

- `lib/htmlProcessor.ts` — 自己完結HTML生成（CSSインライン化・画像data URI化・スクリプト注入）
- `lib/slideStyleConfig.ts` — ビルトインの `@media print` / `@page` / page-break（独立注入CSSの元ネタ）
- `components/Menu/HamburgerMenu.tsx` — `openPreviewWindow()` のHTML処理・ウィンドウ書き込みパターン（責務配置もこれに合わせる）
- `components/PresentationMode/PresentationMode.tsx` — iframeへの `document.open/write/close` の先行事例
- `hooks/useSlideSize.ts` / `hooks/useCSSDesignTemplate.ts` — サイズ・テンプレート状態の取得

### 外部リソース

- [CSS paged media (@page) - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@page)
- [print-color-adjust - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/print-color-adjust)
- [Marp](https://marp.app/) — 印刷ベースPDF出力の先行事例（※ Marp CLIにはPuppeteer経路もあるため補助根拠に留める）
- [jsPDF](https://github.com/parallax/jsPDF) / [html2canvas-pro](https://github.com/yorickshan/html2canvas-pro)（Phase 3用）

---

## 10. 変更履歴

- 2026-08-16: v2.2 実装時の取り違え防止の追記。
  - 後片付けを2段構えに明確化: afterprint→短遅延→破棄・フラグ解除を通常経路、60sタイマーはafterprint不達時のみの保険（常時60s待ちにするとキャンセル後の再実行テストと衝突する）
  - `waitForRenderComplete` はload済みiframeが前提であることをコード断片に明記（load待ちは `exportToPDF` 側の責務）
  - 独立注入CSSの `.slide` に `overflow: visible !important` を追加（カスタムテンプレの `overflow: hidden` 残留対策）
  - iframeの幅は `sizeConfig.width` をそのまま使用（px換算しない）、高さは画面用 `margin: 20px auto` を含める必要があるためload後に `scrollHeight` で設定し直す方式を推奨
- 2026-08-16: v2.1 実装前レビュー反映。
  - 必須修正: iframeは実寸オフスクリーン配置（0×0禁止・sandboxなし）／待機はiframe側window（`doc.defaultView.Chart`）／印刷CSSはエクスポータが独立注入し `:last-of-type` で末尾空白ページを防止／待機は共有deadline方式（直列45秒問題の解消）／`fonts.ready` はKaTeX描画後に待機
  - 記述修正: ベクター期待値の明確化（グラフ・画像はラスター）／「PDFに保存」既定の保証なし／ハンドラはHamburgerMenu完結・Ctrl+PはPhase 3へ統一／ファイル名は `スライド_YYYY-MM-DD` に統一／テンプレ背景はPDFに現れないためPhase 2の確認観点を見出し色・蛍光ペン・リスト記号に変更／Prismは `.token` 待ちをしない
- 2026-08-16: v2 全面改訂。「見た目そのまま」要件に基づき、html2canvas+jsPDF（ラスター）主軸から、ブラウザ印刷エンジンによるベクターテキスト出力（印刷ダイアログ方式）主軸へ変更。旧方式はPhase 3のオプションに降格。旧版はgit履歴を参照。
- 2025-12-20: 初版作成（html2canvas + jsPDF 方式）

---

**注意**: この計画は実装の指針です。実装中に発見された問題や要件変更に応じて柔軟に調整してください。
