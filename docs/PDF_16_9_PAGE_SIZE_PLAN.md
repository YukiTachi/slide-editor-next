# PDF出力: 16:9 のページ寸法の正規化（13.33in × 7.5in 化）実装計画

Notion タスク: SEN-16（`docs/PDF_EXPORT_PLAN.md` Phase 3 の一項目）

## 1. 概要

### 目標

16:9 スライドを PDF 出力したときのページ寸法を、現在の **20in × 11.25in**（1920px × 1080px を 96dpi で物理化したもの）から、
PowerPoint 出力と同じ **13.33in × 7.5in**（PowerPoint 既定のワイド画面）に揃える。
見た目はプレビューと同一のまま、ページだけを縮小する。

### 背景

- 16:9 のサイズ定義は `lib/slideSizeConfig.ts` で `width: '1920px', height: '1080px', pageSize: '1920px 1080px'`。
  `@page { size: 1920px 1080px }` は CSS として有効だが、物理寸法は 508mm × 285.75mm になる。
  Chrome の印刷ダイアログには巨大な用紙サイズとして表示され、印刷時には用紙に合わせた縮小が必要になる。
- PowerPoint 出力（`lib/powerpointExporter.ts` の `getPageGeometry`）は 16:9 を `LAYOUT_WIDE`（13.33in × 7.5in）で出力しており、
  同じスライドなのに PDF と PowerPoint で紙のサイズが異なる。
- `docs/PDF_EXPORT_PLAN.md` 5.5 で「Phase 3 の検討事項」として先送りされていた。

### 前提（現状のアーキテクチャ）

- PDF 出力は `lib/pdfExporter.ts` が処理済みHTMLをオフスクリーン iframe（幅 = `sizeConfig.width`）に `document.write()` し、
  `injectPrintCSS()` で印刷CSS（`@page` の再指定を含む）を独立注入してから `contentWindow.print()` する（印刷ダイアログ方式）。
- `@page` はほかに `lib/slideStyleConfig.ts` の `generateSlideStylesCSS()`（ビルトインテンプレート）と
  `getSlideSizeOverrideCSS()`（カスタムテンプレート用のサイズ上書き）も出力する。いずれも `sizeConfig.pageSize` を参照する。
- PDF 出力の主対象ブラウザは **Chrome / Edge**（`docs/PDF_EXPORT_PLAN.md` の既知制限。Firefox / Safari 対応は SEN-20 の別タスク）。
  本計画の `zoom` も Chrome / Edge での動作を完了条件とし、それ以外のブラウザでは「従来どおりの出力に落ちる」ことだけを保証する（2.4）。
- 16:9 のレイアウト（フォントサイズ・余白）は 1920 × 1080 を基準に設計されており、プレビュー・プレゼンテーションモードは
  この寸法を前提にスケール計算している（`Preview.tsx` / `PresentationMode.tsx` / `calculatePreviewScale`）。

---

## 2. 設計方針

### 2.1 採用: ページを 1280px × 720px にし、印刷時だけ `.slide` を `zoom: 2/3` で縮小する

1280px × 720px は 96dpi でちょうど 13.333in × 7.5in。1920 × 1080 のレイアウトを `zoom: calc(2 / 3)` で縮めると
正確に 1280 × 720 になり、1スライド = 1ページに収まる。画面上のレイアウト（1920 基準）は変えない。

| 案 | 判断 | 理由 |
|---|---|---|
| **A. `@page { size: 1280px 720px }` + `@media print { .slide { zoom: calc(2 / 3) } }`（採用）** | ✅ | レイアウトの基準値を変えずに済む。`zoom` はレイアウト寸法そのものを縮めるため改ページ計算が正しく、テキストはベクターのまま。ヘッドレス Chromium 155 で検証済み（3.3）。`zoom` 非対応環境向けに `@supports (zoom: calc(2 / 3))` で従来の `@page` へ分岐する（2.4） |
| B. `transform: scale(2/3)` + 負のマージンでフロー上の箱を縮める | ❌ | `transform` はレイアウトに影響しないため改ページがずれる。検証では 18 スライドが 36 ページになった（空白ページ混入） |
| C. 16:9 の基準寸法そのものを 1280 × 720 に変更する | ❌ | フォントサイズ・余白・プレビューとプレゼンテーションのスケール計算・既存ユーザーのスライド内インライン指定（px）まで影響する。PDF のためだけに全体を変える理由がない |
| D. 印刷ダイアログの「倍率」をユーザーに設定してもらう | ❌ | 手動設定に依存し、既定の「用紙に合わせる」が環境で異なる。自動化できない |

### 2.2 倍率とページ寸法は「ぴったり」でなければならない

`zoom` 後の `.slide` がページより 1px でも大きいと、スライドごとに空白ページが 1 枚増える（案 B の 36 ページがその症状）。
したがって倍率は小数に丸めず **`calc(2 / 3)`** として CSS に渡し、ページ寸法は `13.33in` ではなく **`1280px 720px`**（= 13.333in）を使う。

- `13.33in` と書くと 1279.68px になり、`zoom: 2/3` の 1280px が 0.32px はみ出す。
- PowerPoint 側の 13.33in（pptxgenjs の `LAYOUT_WIDE`）との差は 0.003in で、印刷解像度以下。実用上同一と扱う。

### 2.3 設定の持ち方: `SlideSizeConfig` に `printScale` を追加し、`@page` とセットで出力する

`pageSize` と `printScale` は必ず対で使う（片方だけ変えると改ページが壊れる）ため、両方を `SLIDE_SIZE_PRESETS` に持たせ、
CSS への展開は 1 箇所のヘルパー `getPrintPageCSS(sizeConfig)` に集約する。`@page` を出力している 3 箇所
（`generateSlideStylesCSS` / `getSlideSizeOverrideCSS` / `injectPrintCSS`）はすべてこのヘルパーを使う。

- A4 横向きは `printScale` を持たない（= 1）。出力される CSS は現状と同じ。
- 画面表示（プレビュー・プレゼンテーションモード）は `@media print` の外なので影響を受けない。

### 2.4 `zoom` 非対応環境では従来の出力に落とす（`@supports` で分岐）

ページ寸法だけを 1280 × 720 にして `zoom` が効かないと、1920 × 1080 の `.slide` が小さいページに載り、
**1 スライドが複数ページに分割される／右下が欠ける**。これは現状より悪い。そこで `@page` と `zoom` を
`@supports (zoom: calc(2 / 3))` の中にまとめ、非対応時は従来どおりの `@page { size: 1920px 1080px }` を出す。
条件式には **実際に使う値（`calc(2 / 3)`）をそのまま入れる**。`(zoom: 1)` では `zoom` プロパティの有無しか判定できず、
`zoom` は知っているが `calc()` 値を解釈できない版が対応側に入ってしまう。値まで含めれば、そうした版も確実にフォールバック側へ倒れる。

```css
@supports (zoom: calc(2 / 3)) {
  @page { size: 1280px 720px; margin: 0; }
  @media print { .slide { zoom: calc(2 / 3) !important; } }
}
@supports not (zoom: calc(2 / 3)) {
  @page { size: 1920px 1080px; margin: 0; }   /* 従来どおり（width × height） */
}
```

- `@page` を `@supports` の中に置けること、`(zoom: calc(2 / 3))` が真と判定されること（`CSS.supports('zoom', 'calc(2 / 3)')` も true）は
  Chromium 155 で確認済み（3.3）。否定側の分岐も、存在しないプロパティ名で `@supports` を偽にした状態で従来寸法（1440 × 810pt）に戻ることを確認した。
- `zoom` は Chrome / Edge / Safari で従来から、Firefox は 126（2024-05）以降で対応している。したがって現行ブラウザでは
  ほぼ常に対応側を通るが、版による差を `@supports` に吸収させることで「最悪でも現状維持」を保証する。
- 完了条件は Chrome / Edge での正規化。非対応側は「従来どおりになる」ことをヘッドレスで確認するにとどめる。

---

## 3. 影響範囲と検証済み事項

### 3.1 変更するファイル

```
types/index.ts                 # SlideSizeConfig に printScale?: number を追加
lib/slideSizeConfig.ts         # 16-9 の pageSize を '1280px 720px' に変更、printScale: 2 / 3 を追加、getPrintPageCSS() を追加
lib/slideStyleConfig.ts        # generateSlideStylesCSS / getSlideSizeOverrideCSS の @page 出力を getPrintPageCSS() に置き換え
lib/pdfExporter.ts             # injectPrintCSS の @page 出力を getPrintPageCSS() に置き換え
docs/PDF_EXPORT_PLAN.md        # 5.5 の注意書きと Phase 3 のチェック、テスト計画の 16:9 行を更新
docs/SLIDE_SIZE_CONFIG_PLAN.md # pageSize の例と「16:9: size: 1920px 1080px」の記述を更新
docs/POWERPOINT_EXPORT_PLAN.md # 変更なし（PDF と寸法が揃った旨を 1 行追記するのみ）
```

### 3.2 変更しないもの

- 16:9 の `width` / `height`（1920px / 1080px）。プレビュー・プレゼンテーション・PowerPoint 出力・テンプレートのフォントサイズは不変。
- `pdfExporter.ts` の iframe 寸法計算（`sizeConfig.width` と `scrollHeight`）。iframe は画面メディアでレイアウトされるため、
  `zoom` は `print()` 時にだけ効く。
- `waitForCharts` などの待機ロジック。

### 3.3 事前検証（2026-10-25、ヘッドレス Chromium 155 + puppeteer-core、`docs/all-features-template.html` 18 枚）

| 条件 | ページ数 | ページ寸法（pt） | グラフ（7〜10 ページ） | 本文テキスト |
|---|---|---|---|---|
| 現状（`1920px 1080px`、zoom なし） | 18 | 1440 × 810（20in × 11.25in） | 各ページ 2 本 | ベクター |
| **案 A（`1280px 720px` + `zoom: 2/3`）** | **18** | **960 × 540（13.333in × 7.5in）** | **各ページ 2 本** | **ベクター** |
| 案 B（`transform: scale(2/3)` + 負マージン） | 36 | 960 × 540 | ずれて 14/16/18/20 ページ | ベクター |
| 案 A を `@supports (zoom: 1)` で包んだもの | 18 | 960 × 540 | 各ページ 2 本 | ベクター |
| **案 A を `@supports (zoom: calc(2 / 3))` で包んだもの（2.4、採用）** | **18** | **960 × 540** | **各ページ 2 本** | **ベクター** |
| 同上で `@supports` を偽にした場合（非対応環境の模擬） | 18 | 1440 × 810（従来どおり） | 各ページ 2 本 | ベクター |

案 A では、Chart.js の canvas ビットマップ寸法が印刷前後で変わらず（ResizeObserver による再描画は起きない）、
タイトル文字の高さが 49pt → 32.7pt とちょうど 2/3 になっていることを確認した。

---

## 4. 実装詳細

### 4.1 `types/index.ts`

```ts
export interface SlideSizeConfig {
  type: SlideSizeType
  width: string        // CSS値（例: '297mm', '1920px'）
  height: string       // CSS値（例: '210mm', '1080px'）
  pageSize?: string    // @page用（例: 'A4 landscape', '1280px 720px'）
  /**
   * 印刷時に .slide へ適用する zoom 倍率。画面レイアウト（width × height）を pageSize に収めるための係数。
   * 未指定は 1（縮小なし）。pageSize と必ず対で設定する（2.2）
   */
  printScale?: number
}
```

### 4.2 `lib/slideSizeConfig.ts`

```ts
'16-9': {
  type: '16-9',
  width: '1920px',
  height: '1080px',
  // PowerPoint 既定のワイド画面（13.333in × 7.5in）。96dpi で 1280px × 720px
  pageSize: '1280px 720px',
  // 1920 × 1080 の画面レイアウトを 1280 × 720 のページに収める倍率。
  // 小数に丸めると 1px はみ出して空白ページが増えるため、CSS には calc(2 / 3) として渡す
  printScale: 2 / 3,
},

/**
 * @page と印刷時の .slide 縮小をセットで出力する。@page を出す箇所は必ずこの関数を使う。
 * printScale がある場合は @supports (zoom: <実際の値>) で分岐し、zoom（またはその値）非対応環境では
 * 画面レイアウト寸法（width × height）をそのままページ寸法にする（従来どおりの出力）。
 */
export function getPrintPageCSS(sizeConfig?: SlideSizeConfig): string {
  const pageSize = sizeConfig?.pageSize ?? 'A4 landscape'
  const scale = sizeConfig?.printScale
  if (!scale || scale === 1) {
    return `@page {\n  size: ${pageSize};\n  margin: 0;\n}\n`
  }
  const fallbackPageSize = `${sizeConfig!.width} ${sizeConfig!.height}`
  const zoomValue = toCSSFraction(scale)          // 例: 'calc(2 / 3)'。条件式と宣言で同じ文字列を使う
  return `@supports (zoom: ${zoomValue}) {
  @page { size: ${pageSize}; margin: 0; }
  @media print { .slide { zoom: ${zoomValue} !important; } }
}
@supports not (zoom: ${zoomValue}) {
  @page { size: ${fallbackPageSize}; margin: 0; }
}
`
}
```

`toCSSFraction` は `2 / 3` のような既知の比を `calc(2 / 3)` の文字列に戻す小さなヘルパーにする
（実装は「`printScale` と一緒に `printScaleCSS: 'calc(2 / 3)'` を持たせる」でもよい。要点は **丸めた小数を CSS に書かない** こと）。

### 4.3 `lib/slideStyleConfig.ts`

- `getSlideSizeOverrideCSS()` の末尾の `@page { ... }` ブロックを `getPrintPageCSS(sizeConfig)` の呼び出しに置き換える。
- `generateSlideStylesCSS()` 内の `@page` も同様に置き換える。`@media print` 内の `.slide` 寸法上書きはそのまま残す
  （`zoom` は寸法指定と独立に効く）。

### 4.4 `lib/pdfExporter.ts`

`injectPrintCSS()` の末尾にある

```css
@page {
  size: ${pageSize};
  margin: 0;
}
```

を `getPrintPageCSS(sizeConfig)` に置き換える。印刷CSSは `</head>` 直前に注入されるため、テンプレート由来の `@page` や
`.slide` 指定より後に評価され、`zoom` の `!important` と合わせて確実に勝つ。

### 4.5 ドキュメント

- `docs/PDF_EXPORT_PLAN.md`: 5.5 を「解消済み（本書参照）」に書き換え、Phase 3 の該当項目をチェック、
  テスト計画の「16:9: ページ寸法がスライドと同比率、余白0」を「16:9: ページ寸法 13.33in × 7.5in（960 × 540pt）、余白0」に更新。
- `docs/SLIDE_SIZE_CONFIG_PLAN.md`: `pageSize` の例と 780 行付近の「16:9: `size: 1920px 1080px;`」を新しい値に更新し、`printScale` を追記。
- `docs/POWERPOINT_EXPORT_PLAN.md`: `LAYOUT_WIDE` の説明に「PDF 出力も同寸法（SEN-16）」と 1 行追記。

---

## 5. 実装フェーズ

### Phase 1: 実装

- [x] `types/index.ts` に `printScale` を追加
- [x] `lib/slideSizeConfig.ts` の 16-9 プリセットを更新し、`getPrintPageCSS()` を追加
- [x] `lib/slideStyleConfig.ts` の `@page` 出力 2 箇所を `getPrintPageCSS()` に置き換え
- [x] `lib/pdfExporter.ts` の `injectPrintCSS()` を `getPrintPageCSS()` に置き換え
- [x] `npx tsc --noEmit` と `NODE_ENV=production npm run build` が通る

### Phase 2: 検証

- [x] ヘッドレス Chromium で `docs/all-features-template.html`（16:9）を PDF 化し、`pdfinfo` で **18 ページ・960 × 540pt** を確認
- [x] 同 PDF で `pdfimages -list` によりグラフが 7〜10 ページに 2 本ずつあること、`pdftotext` で数式・コードのテキストが取れることを確認
- [x] A4 横向きで同じ手順を実行し、**842 × 595pt・18 ページ**で変化がないこと（回帰確認）
- [x] 実機 Chrome で 16:9 の PDF 出力を行い、印刷ダイアログのプレビューが用紙いっぱいに表示され、末尾に空白ページがないことを確認
      （2026-10-26 Chrome 155 / Windows: 18 枚 → 18 ページ、全ページ 960 × 540pt、タイトル罫線が左右端まで・フッターが右下に収まる）
- [x] 保存した PDF のプロパティでページサイズが 13.33 × 7.5 in と表示されること（`pdfinfo` で 960 × 540pt = 13.333 × 7.5in）
- [x] 同じスライドを PowerPoint 出力し、PDF と PowerPoint のページ寸法が一致することを確認
      （2026-10-26: `.pptx` の `p:sldSz` は 12192000 × 6858000 EMU = 13.333 × 7.5in = 960 × 540pt。PDF の 960 × 540pt と同一）
- [x] ビルトインテンプレート（スタンダードと、それ以外から 1 つ、例: ナチュラル）を適用した 16:9 でも 18 ページ・960 × 540pt になること
      （`generateSlideStylesCSS` 経路の確認。全機能テンプレートのヘッドレス検証はテンプレート未指定 = スタンダード相当なので、別のビルトインを 1 つ加える）
- [x] カスタム CSS テンプレート適用時も 16:9 で 1 スライド = 1 ページになること（`getSlideSizeOverrideCSS` 経路の確認）
- [x] 実機 Chrome の Console で `CSS.supports('zoom', 'calc(2 / 3)')` が true を返すこと（条件式が対応側に入ることの確認）
      （実機 PDF が 960 × 540pt になっていることから、`@supports` の対応側が選ばれたと確認）
- [x] `getPrintPageCSS()` の出力をそのまま使い、`@supports` の条件を偽（例: 存在しないプロパティ名）に差し替えたHTMLをヘッドレスで PDF 化し、
      18 ページ・1440 × 810pt（従来どおり）に戻ること（`zoom` 非対応環境の模擬。2.4）
- [x] `grep -rn "@page" lib` のヒットが `getPrintPageCSS()` の中だけになっていること
- [x] プレビューとプレゼンテーションモードの表示が変わっていないこと（`@media print` 外に影響がないことの確認）（2026-10-26 実機で確認）

実施記録（2026-10-25、ヘッドレス Chromium 155、`docs/all-features-template.html` 18 枚、印刷CSSは `injectPrintCSS` と同内容 + `getPrintPageCSS()`）:

| ケース | ページ数 | ページ寸法（pt） | グラフ（7〜10 ページ） | canvas 寸法の変化 |
|---|---|---|---|---|
| A4 横向き・スタンダード（回帰） | 18 | 841.92 × 594.96（A4） | 各 2 本 | なし |
| 16:9・スタンダード | 18 | 960 × 540 | 各 2 本 | なし |
| 16:9・ナチュラル（`generateSlideStylesCSS` 経路） | 18 | 960 × 540 | 各 2 本 | なし |
| 16:9・カスタム CSS テンプレート（`getSlideSizeOverrideCSS` 経路） | 18 | 960 × 540 | 各 2 本 | なし |
| 16:9・`@supports` 条件を偽に差し替え（非対応環境の模擬） | 18 | 1440 × 810（従来どおり） | 各 2 本 | なし |

いずれも `CSS.supports('zoom', 'calc(2 / 3)')` は true。11・13 ページ（数式・コード）のテキストは `pdftotext` で取得できた。

### Phase 3: ドキュメント・タスク整理

- [x] 4.5 のドキュメント更新
- [x] Notion の SEN-16 を Done にする（2026-10-26、PR #1 マージ後）

---

## 6. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| 倍率の丸めで `.slide` がページをわずかに超える | スライドごとに空白ページが増える | 倍率は `calc(2 / 3)`、ページ寸法は `1280px 720px` で固定（2.2）。検証でページ数 = スライド数を必ず確認 |
| `zoom` 非対応ブラウザ（古い Firefox など） | `@page` だけが 1280 × 720 になると、1920 × 1080 の `.slide` が複数ページに分割されたり右下が欠けたりして**現状より悪化**する | `@page` と `zoom` を `@supports (zoom: calc(2 / 3))` でまとめ（値まで含めて判定）、非対応時は従来の `@page { size: 1920px 1080px }` に落とす（2.4）。否定側の分岐はヘッドレスで検証済み。完了条件は Chrome / Edge とし、それ以外は「従来どおりになる」ことまでを保証する |
| 印刷時の `zoom` で Chart.js の ResizeObserver が発火し再描画される | グラフが空または寸法違いで印刷される | ヘッドレス検証で canvas ビットマップが不変であることを確認済み（3.3）。実機 Chrome でも Phase 2 で確認する |
| `@page` を出力する箇所の片方だけ更新する | テンプレートによって改ページ結果が変わる | `getPrintPageCSS()` に集約し、`grep -rn "@page" lib` が同関数以外にヒットしないことを完了条件にする |
| カスタム CSS テンプレートが独自に `@page` や `.slide { zoom }` を含む | 想定外の寸法になる | 注入順で `injectPrintCSS` が最後に評価されるため上書きできる。`zoom` には `!important` を付ける |
| フォントサイズが 2/3 になり、PDF 上で文字が小さく感じる | 可読性の印象差 | PowerPoint 出力と同じ物理寸法に揃える変更であり、紙に印刷したときの大きさは PowerPoint 出力と一致する。A4 横向きは変更しない |

---

## 7. 工数見積

| フェーズ | 目安 |
|---|---|
| Phase 1 | 0.5h |
| Phase 2 | 0.5h |
| Phase 3 | 0.25h |

Notion の Effort level「Small」と整合する。

---

## 8. 変更履歴

- 2026-10-25: 再レビュー反映。`@supports` の条件式を `(zoom: 1)` から実際に使う値を含む `(zoom: calc(2 / 3))` に変更。
  `zoom` は知っているが `calc()` 値を解釈できない版もフォールバック側へ倒すため。Chromium 155 で真と判定されることを確認し 3.3 に追加。

- 2026-10-25: レビュー反映。
  - `zoom` 非対応時の影響を「巨大ページのまま」から「1 スライドが分割・欠けして現状より悪化する」に訂正し、
    `@supports (zoom: 1)` で従来の `@page` へ分岐する設計（2.4）を追加。対象ブラウザが Chrome / Edge である前提を「前提」節に明記。
    `@supports` 内の `@page` と否定側の分岐をヘッドレスで検証し、3.3 の表に追加。
  - 検証計画に、ビルトインテンプレート（`generateSlideStylesCSS` 経路）のケースと、非対応分岐の模擬確認、`@page` 出力箇所の grep 確認を追加。
- 2026-10-25: 初版。
