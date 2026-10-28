# PDF出力: エクスポート範囲指定（現在のスライドのみ / 全スライド） 実装計画

Notion タスク: SEN-26（`docs/PDF_EXPORT_PLAN.md` Phase 3 の一項目、Effort: Small / Priority: Medium）

## 1. 概要

### 目標

PDF 出力の範囲を「全スライド」（従来どおり）と「現在のスライドのみ」から選べるようにする。
編集中の 1 枚だけを素早く PDF にして確認・共有したい場面（レビュー依頼、1 枚ものの配布）に応える。
出力の見た目・ページ寸法・待機ロジックは既存の PDF 出力と完全に同じにし、変わるのは「iframe に書き込む HTML に含まれるスライドの枚数」だけにする。

### 背景

- PDF 出力は常にエディタの全内容を出力する。1 枚だけ欲しいときは、印刷ダイアログの「ページ指定」で番号を打つか、
  出力後に PDF を分割するしかない。どちらも「何枚目か」を自分で数える必要がある。
- `docs/PDF_EXPORT_PLAN.md` Phase 3 に「エクスポート範囲指定（現在のスライドのみ / 全スライド）」として残っていた。

### 前提（現状のアーキテクチャ）

- PDF 出力のハンドラ `handleExportPDF` は `app/page.tsx` が所有し、メニューの「📄 PDF出力 (Ctrl+P)」ボタン（`HamburgerMenu` の `onExportPDF` prop）と
  `Ctrl+P` ショートカット（`ShortcutActions['export-pdf']`）の両方から呼ばれる（SEN-4、`docs/PDF_CTRL_P_SHORTCUT_PLAN.md`）。
- `lib/pdfExporter.ts` の `exportToPDF(htmlContent, sizeConfig, template, options)` は、受け取った HTML を
  `processHTMLForPreviewAsync()`（プレビューと同一パイプライン）→ 印刷 CSS 注入 → 実寸オフスクリーン iframe に `document.write` → 待機 → `print()` と処理する。
  **何枚出すかは入力 HTML に含まれる `.slide` の数で決まる**ため、入力を 1 枚分に絞れば出力も 1 ページになる。
  グラフ初期化スクリプトは iframe 内で `document.querySelectorAll('.slide-chart-container')` を走査する方式（`addChartInitializationScript`）で、
  待機処理（`waitForCharts` / `waitForKaTeX` / `waitForPrism`）も iframe 内の要素だけを見るため、絞った HTML でそのまま動く。
- 「現在のスライド」の概念は、アプリ内ではエディタの**カーソル位置**で決まっている。
  スライド追加（`handleAddSlide` → `SlideTemplates.findSlideInsertPosition`）、メニューのスライド削除・複製（`HamburgerMenu`、`extractSlides` + カーソル位置）、
  画像・グラフ・コード・数式の挿入（`findCurrentSlide`）がすべてこの方式。プレビュー側に「選択中のスライド」状態はない。
- メニューのボタンをクリックするとエディタ（CodeMirror）はフォーカスを失うが、`EditorHandle.getCursorPosition()` は
  `view.state.selection.main.head` を返すため、直前のカーソル位置がそのまま取れる（スライド削除・複製が既にこれに依存している）。
- スライドの抽出は `lib/slideReorder.ts` の `extractSlides()`（開始タグを正規表現で探し `<div>` の深さを数えて終端を求める）。
  戻り値 `{ html, start, end }` は元文字列のオフセットなので、他のスライドの範囲を文字列から取り除けば
  「`<head>` やスライド間の内容はそのまま、スライドだけ 1 枚」の文書が作れる（`deleteSlide()` が同じ考え方で 1 枚を取り除いている）。
- **既存不具合**: `extractSlides()` の正規表現 `/<div class="slide"[^>]*>/g` は、公式の 2 分割レイアウト `<div class="slide slide-split">`
  （`docs/SLIDE_CSS_CLASS_CONVENTION.md`、`lib/imageProcessor.ts` が生成）に一致しない。
  そのため分割スライドは、プレビューのスライド一覧・プレゼンテーションモード・メニューのスライド削除/複製の対象から**抜け落ちている**
  （`lib/powerpointExporter.ts` はこれを知っていて DOMParser で回避している）。
  手元の確認: `docs/pdf-export-test-slides.html` は現状 7 枚と数えられるが実際は 8 枚、`docs/all-features-template.html` は 17 → 18 枚。
  本件は `extractSlides()` でインデックスを決めるため、この不具合を放置すると「現在のスライド」の番号がずれ、分割スライドは単独出力できない。
- 同じ厳密な正規表現 `/<div class="slide">/g` が他に 3 箇所ある。`SlideTemplates.updatePageNumbers()`（フッターの総ページ数 `n/N` の N を数える。
  スライド追加・テンプレート挿入・削除・複製・並べ替え・AI 生成のたびに呼ばれる）、`SlideTemplates.findSlideInsertPosition()`（スライド追加の挿入位置、
  メニューの削除・複製の判定）、`findCurrentSlide()`（`lib/imageProcessor.ts`、画像・グラフ・コード・数式の挿入先）。
  分割スライドを含むデッキでは、現状でもフッターの N が実際の枚数より少なく振られる。

---

## 2. 設計方針

### 2.1 範囲の選び方: メニューにボタンを 1 つ足す。`Ctrl+P` は全スライドのまま（採用）

「💾 データ」セクションの PDF ボタンを 2 つにする。

```
📄 PDF出力 (Ctrl+P)              ← 全スライド（従来どおり、ラベル変更なし）
📄 PDF出力（現在のスライドのみ）   ← 新規。カーソルのあるスライドだけ
```

| 案 | 判断 | 理由 |
|---|---|---|
| **A. メニューに「現在のスライドのみ」ボタンを追加。`Ctrl+P` は全スライド固定（採用）** | ✅ | クリック 1 回で出せる。既存の `Ctrl+P` → 即ダイアログの操作感を変えない。設定の保存も不要で Effort: Small に収まる |
| B. PowerPoint 出力のようなモーダルで範囲をラジオ選択してから出力 | ❌ | `Ctrl+P` のたびに 1 クリック増える。前回の選択を記憶すると `Ctrl+P` が黙って 1 枚だけ出すことになり、気付きにくい |
| C. プレビューのスライド一覧（📋 複製 / 🗑️ 削除 の並び）に「📄 この1枚を PDF」ボタン | ❌（今回は見送り） | どの 1 枚かが明示的で分かりやすいが、`Preview` にハンドラを配線する必要があり、スライド一覧は 2 枚以上のときしか表示されない。要望があれば別タスクで A に併設できる |
| D. 既存ボタンを押すたびに `confirm` で範囲を聞く | ❌ | 毎回の出力に確認が挟まる |

`HamburgerMenu` の prop は `onExportPDF: (range: PDFExportRange) => void` に変え、2 つのボタンがそれぞれ `'all'` / `'current'` を渡す。
ショートカット側は `'export-pdf': () => handleExportPDF('all')`。

### 2.2 「現在のスライド」はエディタのカーソル位置で決める

他の「現在のスライド」系操作（追加・削除・複製・各種挿入）と同じ情報源を使う。判定ルールは `lib/slideReorder.ts` に純粋関数として置く。

```ts
// lib/slideReorder.ts
/**
 * カーソル位置から「現在のスライド」のインデックスを返す。
 * - カーソルがスライドの内側（開始タグ〜終了タグ、両端含む）→ そのスライド
 * - スライドの外側（<head>内・スライド間・最後のスライドの後）→ カーソルより前にある直近のスライド
 * - 前にスライドがない（先頭の <head> 内など）→ 0
 * - スライドが 1 枚もない → -1
 */
export function findSlideIndexAtCursor(htmlContent: string, cursorPos: number): number {
  const slides = extractSlides(htmlContent)
  if (slides.length === 0) return -1
  const inside = slides.findIndex(s => cursorPos >= s.start && cursorPos <= s.end)
  if (inside !== -1) return inside
  let preceding = -1
  slides.forEach((s, i) => { if (s.end <= cursorPos) preceding = i })
  return preceding === -1 ? 0 : preceding
}
```

| 案 | 判断 | 理由 |
|---|---|---|
| **A. カーソル位置（上記ルール）（採用）** | ✅ | アプリ内の「現在のスライド」の定義と一致する。エディタを触っていれば直感どおり |
| B. スライド削除・複製と同じ「スライド外なら最後のスライド」ルール | ❌ | `<head>` を編集中に押すと最後の 1 枚が出る。PDF では「直前のスライド／先頭」の方が自然。削除・複製側のルールは本件では変えない（必要なら同じ関数に寄せられる） |
| C. プレビューのスクロール位置から判定 | ❌ | プレビューは iframe で、どのスライドが「見えている」かの状態を持っていない。新しい状態管理が要る |
| D. プレゼンテーションモードの現在ページ | ❌ | プレゼン中でないと存在しない |

どの 1 枚を出したかはユーザーに見えるようにする: ステータスバーに「PDFを準備中…（スライド 3 / 8）」、ファイル名に `_p3`（2.4）。
番号は `extractSlides()` の順序（= プレビューのスライド一覧・プレゼンテーションモードと同じ番号）。

### 2.3 1 枚分の HTML は「元ソースから他のスライドだけを取り除く」（採用）

```ts
// lib/slideReorder.ts
/**
 * 指定インデックスのスライドだけを残した HTML を返す。
 * 他のスライド（開始タグ〜終了タグ）を後ろから順に取り除くだけで、<head>・スライド間のコメント・<script>・
 * その他の要素はすべて元の位置に残る。整数でない・範囲外のインデックスは null。元の文字列は変更しない
 */
export function extractSingleSlideHTML(htmlContent: string, slideIndex: number): string | null {
  if (!Number.isInteger(slideIndex)) return null   // 1.5 や NaN は「どのスライドも残らない」HTML になるため弾く
  const slides = extractSlides(htmlContent)
  if (slideIndex < 0 || slideIndex >= slides.length) return null
  let result = htmlContent
  for (let i = slides.length - 1; i >= 0; i--) {   // 後ろから削るとオフセットがずれない
    if (i === slideIndex) continue
    result = result.slice(0, slides[i].start) + result.slice(slides[i].end)
  }
  return result
}
```

| 案 | 判断 | 理由 |
|---|---|---|
| **A. 元ソースから他のスライドだけを取り除き、既存パイプラインに通す（採用）** | ✅ | 失われるのは他のスライドの中身だけ。ユーザーの `<head>`（独自 `<style>`・`<title>`）も、スライド間に置かれたコメント・`<script>`・その他の要素も元の位置に残るため、見た目がプレビューと一致する。`exportToPDF()` の後段（処理・印刷 CSS・待機・後片付け）は無変更。Node で確認済み: テストデッキ（8 枚）の先頭・中間・分割スライド・末尾のどれを選んでも `.slide` が 1 つ、選んだスライドの HTML は不変、スライド間コメント 9 件と `<head>` は保持。スライド間に `<script>` と `<p>` を置いた合成 HTML でも両方残る |
| A'. 最初のスライドの前・最後のスライドの後だけ残し、その間を選んだスライドで置き換える | ❌ | 実装は 1 行だが、スライド間にあるコメント以外の内容（`<script>`、区切り用の要素など）まで消える。レビュー指摘により A に変更 |
| B. 全スライドを処理し、印刷 CSS で他のスライドを `display: none` | ❌ | 隠したスライドのグラフ・数式・コードも待機対象になる。`:last-of-type` による末尾空白ページ対策が崩れる。`display: none` 内の Chart.js（`responsive: true`）はサイズ 0 で初期化される |
| C. プレゼンテーションモードの `processSlideForPresentation()` を流用 | ❌ | スライドを**新しい空の文書**に包み直すため、ユーザーの `<head>` 内 `<style>` が落ちて見た目がプレビューと変わり得る |

- 取り除かれた他のスライドの中の要素を参照するスライド外の `<script>`（例: 他スライドの要素 id を `getElementById` するもの）は、
  1 枚出力では参照先がなくなる。アプリが生成する HTML にはそのようなスクリプトはなく（グラフ初期化は iframe 内の走査方式）、
  ユーザーが手で書いた場合もプレビュー・全スライド出力には影響しないため、許容する。
- フッターのページ番号（`3 / 8` のような静的テキスト）はソースのまま残るので、1 枚だけ出しても元のデッキでの番号が印字される。
  これは意図どおり（「何枚目か」が分かる）とし、振り直しはしない。
- `exportToPDF()` 冒頭の `extractSlides(trimmedContent).length` による iframe 初期高さの概算は、1 枚分の HTML なら 1 になり、そのまま正しく働く。

### 2.4 `exportToPDF()` のオプションとファイル名・ステータス

切り出しは `exportToPDF()` の中で行い、呼び出し側（`page.tsx`）は「どの 1 枚か」だけを渡す。
ファイル名とステータス文言の責務を `lib/pdfExporter.ts` に閉じ込めるため。

```ts
// lib/pdfExporter.ts
export type PDFExportRange = 'all' | 'current'

export interface PDFExportOptions {
  fileName?: string
  timeoutMs?: number
  onStatus?: (message: string) => void
  slideIndex?: number   // 指定時はそのスライドだけを出力する（0 始まり）。未指定は全スライド
}

export async function exportToPDF(htmlContent, sizeConfig, template, options) {
  if (isExporting) return
  let trimmedContent = htmlContent.trim()
  if (!trimmedContent) return

  let slideLabel = ''
  if (options?.slideIndex !== undefined) {
    const total = extractSlides(trimmedContent).length
    const single = extractSingleSlideHTML(trimmedContent, options.slideIndex)
    if (single === null) throw new Error(`スライド ${options.slideIndex + 1} が見つかりません`)
    trimmedContent = single
    slideLabel = `（スライド ${options.slideIndex + 1} / ${total}）`
  }

  isExporting = true
  // ...以降は既存のまま。変更点は 2 箇所:
  onStatus?.(`PDFを準備中…${slideLabel}`)
  printDoc.title = options?.fileName ?? getDefaultFileName(options?.slideIndex)
}

function getDefaultFileName(slideIndex?: number): string {
  // 既存の `スライド_YYYY-MM-DD` に、1 枚出力のときだけ `_p3`（1 始まり）を付ける
}
```

- `isExporting = true` にする**前**に切り出しと範囲チェックを行い、失敗時にフラグが立ったままにならないようにする。
- ファイル名: 全スライド `スライド_YYYY-MM-DD`（変更なし）、1 枚 `スライド_YYYY-MM-DD_p3`。

| ファイル名の案 | 判断 | 理由 |
|---|---|---|
| **`スライド_YYYY-MM-DD_p3`（採用）** | ✅ | 短く、全スライド版と並べても区別でき、同じ日に別の 1 枚を出しても衝突しない |
| `スライド_YYYY-MM-DD_3` | ❌ | 「3 枚目」か「3 版目」か読めない |
| スライドのタイトルをファイル名にする | ❌ | タイトルは空・重複・ファイル名禁止文字を含み得る。サニタイズと既存ルールからの逸脱が増える |

### 2.5 スライド開始タグの正規表現を 1 箇所に集約し、公式の `class="slide slide-split"` に対応させる（前提の不具合修正）

スライドを数える・探す正規表現は 4 箇所（`extractSlides` / `updatePageNumbers` / `findSlideInsertPosition` / `findCurrentSlide`）に
別々に書かれている。`extractSlides()` だけ直すと、**削除・複製・並べ替えのたびに `updatePageNumbers()` が振るフッターの総ページ数 N が、
スライド一覧の枚数と食い違う**（例: 8 枚のデッキで一覧は 8 枚、フッターは `3/7`）。同じ定義を全箇所で使うようにして、この種の不整合を起こさない。

```ts
// lib/slideTemplates.ts（@/types 以外を import しないため、循環なしで他ファイルから参照できる）
/**
 * スライド開始タグ。class 属性が "slide" または "slide ..."（slide-split 等の修飾子付き）の div に一致し、
 * "slide-table-container" のような slide- 接頭辞のクラスには一致しない。
 * g フラグ付き RegExp は lastIndex を持つため、呼び出しごとに新しいインスタンスを作る
 */
export const SLIDE_START_TAG_SOURCE = '<div class="slide(?:\\s[^"]*)?"[^>]*>'
export function createSlideStartRegex(): RegExp {
  return new RegExp(SLIDE_START_TAG_SOURCE, 'g')
}

/**
 * slideStart にある開始タグに対応する </div> の直後の位置を返す（見つからなければ -1）。
 * 深さ計測は開始タグの '>' の次から始める（開始タグの長さに依存しない）
 */
export function findSlideEnd(htmlContent: string, slideStart: number): number {
  let depth = 1
  let pos = htmlContent.indexOf('>', slideStart) + 1
  // ...以降は現行 3 箇所と同じ深さ計測
}
```

スライドの終了位置を求める深さ計測も 3 箇所（`slideReorder.ts` の `findSlideEnd`、`imageProcessor.ts` の `findSlideEnd`、`findSlideInsertPosition()` 内のインライン）に
重複しており、`slideReorder.ts` 版だけが開始タグの `>` から計測を始め、他 2 箇所は固定長 `'<div class="slide">'.length` から始める。
修飾子付きの開始タグ（`<div class="slide slide-split">`）は固定長より長いため、計測が開始タグの途中から始まる。
これも `slideTemplates.ts` の `findSlideEnd()` 1 本に寄せ、開始位置をタグの終端基準にそろえる。

Node で現行の固定長版を再現して確認した結果: 通常の分割スライド（子 `<div>` あり / なし）では、開始タグの残り部分に `<div` も `</div>` も含まれないため
結果はタグ終端基準と一致し、**実運用の HTML で終了位置がずれることはない**。ずれるのは属性値に `<div` や `</div>` の文字列が入る場合のみ
（`data-note="<div>"` で -1、`title="</div>"` で最初の子要素の手前）で、計測の前提が「タグの終端から始める」ことである以上、修正して統一する。

| 箇所 | 変更 |
|---|---|
| `lib/slideTemplates.ts` | `createSlideStartRegex()` と `findSlideEnd()` を追加 |
| `lib/slideReorder.ts` `extractSlides()` | 開始タグ検索を `createSlideStartRegex()` に。ローカルの `findSlideEnd` を削除し、`slideTemplates` の `findSlideEnd()` を使う |
| `lib/slideTemplates.ts` `updatePageNumbers()` | 枚数カウントを `createSlideStartRegex()` に。フッターの置換処理は不変 |
| `lib/slideTemplates.ts` `findSlideInsertPosition()` | 開始タグ検索を `createSlideStartRegex()` に。インラインの深さ計測（固定長開始）を `findSlideEnd()` 呼び出しに置き換える |
| `lib/imageProcessor.ts` `findCurrentSlide()` | 開始タグ検索を `createSlideStartRegex()` に。ローカルの `findSlideEnd`（固定長開始）を削除し、`slideTemplates` の `findSlideEnd()` を使う（`slideTemplates` は `imageProcessor` を参照しないため循環しない） |

Node で確認済み: `<div class="slide">` / `<div class="slide slide-split">` / `<div class="slide" id="x">` に一致し、
`slide-table-container` / `slide-chart-container` / `slide-split-content` には一致しない。
テストデッキの枚数は 7 → 8、`all-features-template.html` は 17 → 18 になる。

この修正で変わる挙動（いずれも「分割スライドが数に入るようになる」という不具合修正方向の変化）:

| 利用箇所 | 変化 |
|---|---|
| プレビューのスライド一覧（`components/Preview/Preview.tsx`） | 分割スライドが一覧に現れ、並び替え・複製・削除の対象になる |
| プレゼンテーションモード（`hooks/usePresentationMode.ts`） | 分割スライドが**飛ばされなくなる**（現状は表示されない） |
| メニューのスライド削除・複製（`HamburgerMenu`） | 分割スライド以降のインデックスが実際の順序と一致し、分割スライド自体も対象になる |
| `reorderSlides` / `deleteSlide` / `duplicateSlide` | 分割スライドを含むデッキで、前後の構造が正しく保たれる |
| `updatePageNumbers()`（上記の各操作と、スライド追加・テンプレート挿入・AI 生成の後に呼ばれる） | フッターの総ページ数 N が分割スライドを含めた実枚数になる。番号が付け直されるのは**次にこれらの操作をしたとき**で、開くだけでは変わらない。本件の PDF 出力は `updatePageNumbers()` を呼ばない |
| スライド追加 / 画像・グラフ・コード・数式の挿入 | 分割スライド内にカーソルがあるとき、末尾ではなくそのスライドの直後 / 中に入る |
| `exportToPDF()` の iframe 初期高さ概算 | 枚数が正確になる（load 後に実測で上書きするため実害はなかった） |

`lib/powerpointExporter.ts` の DOMParser 分割はそのまま残し、理由コメント（「extractSlides の regex は … に一致しないため」）だけ現状に合わせて書き換える。

### 2.6 ショートカットは追加しない（任意: 要望があれば別途）

「現在のスライドのみ」に既定キーを割り当てるのは見送る。

| 案 | 判断 | 理由 |
|---|---|---|
| **A. ショートカットなし。メニューのみ（採用）** | ✅ | 1 枚出力は頻度が低く、メニュー 1 クリックで足りる。ブラウザ予約キーとの衝突を避けられる |
| B. `Ctrl+Shift+P` | ❌ | Edge / Firefox では InPrivate / プライベートウィンドウを開くブラウザ予約キーで `preventDefault()` が効かない。Chrome ではシステム印刷ダイアログ |
| C. `Ctrl+Alt+P` | ❌ | 一部の配列では `AltGr+P` と区別できない。既定で無効（`enabled: false`）の定義を置く前例もない |
| D. 定義だけ追加し既定で無効にする | ❌ | 設定モーダルに「無効のショートカット」が 1 行増えるだけで、キーを決める問題は残る |

必要になれば、SEN-4 で整えた仕組み（`DEFAULT_SHORTCUTS` に id を足すだけで既存ユーザーにも届き、衝突時は無効で届く）にそのまま載せられる。

### 2.7 変更しないもの

- `lib/pdfExporter.ts` の待機ロジック・印刷 CSS・多重起動防止（`isExporting` は 1 枚出力でも共有し、ダイアログ表示中の再実行は無視される）。
  後片付けは 2.8 の title 復元を 1 行足すだけ
- 16:9 の `@page` / `zoom` 正規化（`getPrintPageCSS()`）— 1 枚でも同じ CSS が効く
- PowerPoint 出力（範囲指定は付けない。必要なら別タスク）
- ショートカット定義（`export-pdf` = `Ctrl+P` = 全スライドのまま）
- スライド削除・複製の「現在のスライド」判定ルール（2.2 案 B のとおり据え置き）

### 2.8 「PDFに保存」の既定ファイル名は親ページの `document.title` を差し替えて指定する（実機確認で見つかった既存不具合）

実機 Chrome（Windows）の確認で、全スライド出力の保存ダイアログのファイル名が `スライドエディタ.pdf`（アプリの `<title>`）になっていた。
`exportToPDF()` は印刷用 iframe の `document.title` に `スライド_YYYY-MM-DD` を設定しているが、Chrome / Edge は iframe の `print()` でも
**最上位（親ページ）の title** を「PDFに保存」の既定ファイル名に使う。PDF 出力 Phase 1 からの既存不具合で、本件で付ける `_pN` サフィックスも
このままでは効かないため、スコープに含める。

- `print()` の直前に親ページの `document.title` をファイル名に差し替え、後片付け（`afterprint` → 短い遅延、または上限タイマー）で元の title に戻す。
  失敗時（`catch`）も戻す。印刷文書（iframe）の title も同じ値にしておく（他ブラウザ向け）。
- 差し替え中はブラウザのタブ名もファイル名になるが、ダイアログ表示中だけなので許容する。
- ヘッドレスで確認済み（2026-10-27）: `print()` 時点で親 title が `スライド_2026-10-27` / `スライド_2026-10-27_p3`、`afterprint` 後に `スライドエディタ` に戻る。
  実際の保存ダイアログの既定名は実機で確認する。

| 案 | 判断 | 理由 |
|---|---|---|
| **A. 印刷中だけ親の `document.title` を差し替え、後片付けで戻す（採用）** | ✅ | 既存の後片付け経路（`scheduleCleanup`）に復元を 1 行足すだけ。表示上の影響はタブ名が一時的に変わることのみ |
| B. iframe ではなく別ウィンドウ（`window.open`）で印刷する | ❌ | ポップアップブロック・フォーカス移動の問題が増え、Phase 1 で iframe 方式を選んだ理由（実寸オフスクリーン）を崩す |
| C. そのまま（ユーザーがダイアログで入力する） | ❌ | 既定ファイル名は Phase 1 の完了条件であり、`_pN` も意味を失う |

### 2.9 分割スライドへの画像挿入は確認のうえ右カラム（`.slide-image`）の画像を置き換える（2.5 に伴う挙動変化の修正）

実機確認（項目 14）で、分割スライド内にカーソルを置いて「画像を挿入」しても何も起きないことが分かった。
原因は `insertImageToHTML()`（`lib/imageProcessor.ts`）の流れにある。`findCurrentSlide()` が 2.5 で分割スライドを認識するようになった一方、
その後に呼ぶ `convertToSplitLayout()` は `<div class="slide">` 形式だけを変換対象にしており、分割スライドは**変換されずそのまま返る**ため、
スライドが自分自身で置き換えられて挿入が無効になっていた（2.5 より前は `findCurrentSlide()` が分割スライドを見つけられず、
カーソル位置に画像ブロックを挿入するフォールバックが動いていた）。

右カラム `.slide-image` は `display: flex`（横並び）で `.slide-img` に `max-width: 100%` を当てた「画像 1 枚」前提のレイアウト
（`public/css/slide-styles.css` と各テンプレート CSS）。最初に試した「右カラムに `<img>` を追加する」方式は、実機で 2 枚が横に並んで
スライドから溢れたため却下し、**確認のうえ置き換える**方式にした（2026-10-28、ユーザー判断）。

- 分割スライド（開始タグに `slide-split` を含む）の場合は `convertToSplitLayout()` を通さず、右カラム `<div class="slide-image">` の中身を
  新しい `<img class="slide-img">` 1 枚に置き換える（`replaceImageInSplitSlide()`）。左右の構造・タイトル・フッターはそのまま。
  右カラムに画像が無ければそのまま入る。
- 置き換えの前に、呼び出し側（`ImageInserterModal` の 3 経路と `ImageManager`）が `hasSplitSlideImage(htmlContent, cursorPos)` で
  「既に画像を持つ分割スライド」かを判定し、該当すれば `confirm('このスライドは分割レイアウトで既に画像があります。右側の画像を置き換えますか？')` を出す。
  キャンセルなら何もしない（通常スライドや画像の無い右カラムでは確認を出さない）。
- `.slide-image` が無い分割スライド（手書きなど）は `null` を返し、従来のカーソル位置への画像ブロック挿入にフォールバックする。
  通常スライドは従来どおり 2 分割レイアウトに変換する。
- 画像の `src`（`images/` パスか data URI か）の決定を 1 箇所にまとめた。

| 案 | 判断 | 理由 |
|---|---|---|
| **A. 確認のうえ右カラムの画像を置き換える（採用）** | ✅ | 分割レイアウトの前提（画像 1 枚）を保ち、CSS に手を入れない。黙って消さないよう確認を挟む |
| B. 右カラムに `<img>` を追加する | ❌ | 実機で 2 枚が横並びになりスライドから溢れた（最初の実装。却下） |
| C. 右カラムを縦積みにする CSS 変更 | ❌ | 全テンプレート（5 種 + custom）の `.slide-image` を変える必要があり、1 枚あたりの表示も小さくなる |
| D. 左カラム末尾に画像ブロックを挿入 | ❌ | 構造は壊れないが左右のバランスが崩れやすい |
| E. 2.5 以前のカーソル位置フォールバックに戻す | ❌ | カーソルが `<ul>` の中などにあると画像ブロックが構造の途中に入り、分割レイアウトを崩す |

Node で確認済み（2026-10-28）: テストデッキの分割スライドに挿入すると 8 枚のまま、`slide-split-content` / `slide-content` / `slide-image` は 1 つずつ、
`<img>` は 1 つだけ（新しい画像、元の画像は消える）でタイトル・左カラム・フッター・他のスライドは不変。`hasSplitSlideImage()` は分割スライドのみ true。
通常スライドは従来どおり 2 分割に変換。画像の無い右カラムには新しく入る。`.slide-image` 無しはフォールバック。

### 2.10 画像挿入後の `setCursorPosition()` が RangeError になる既存不具合

実機で画像挿入時に Next.js のエラーオーバーレイ `RangeError: Selection points outside of document`（`Editor.tsx` の `setCursorPosition`）が出た。
`ImageInserterModal` / `ImageManager` は `setHtmlContent(newContent)` の直後に `setTimeout(0)` で新しい内容に基づくカーソル位置を渡すが、
React の再描画（`Editor` の同期エフェクトで CodeMirror に新しい文書を入れる）がまだ走っていないと、位置が古い文書の長さを超えて例外になる。
挿入する内容が大きい（data URI 画像）ほど差が大きい。2.5 / 2.9 とは独立の既存不具合だが、項目 14 の確認を妨げるため直す。

- `Editor.tsx` の `setCursorPosition()` は、位置が現在の文書長を超えていれば `pendingCursorRef` に保持して返る。
  同期エフェクト（`htmlContent` の変更を CodeMirror に反映した直後）で、保持した位置を**必ず消費**して適用する（新しい内容にも収まらなければ末尾に丸める）。
  保留を残すと後の編集で文書が伸びたときに古い位置へ突然移動するため、残さない（コードレビュー指摘）。
- 適用時は `Math.min(position, doc.length)` に丸め、どの経路でも例外にしない。
- 呼び出し側（モーダル）は変更しない。

---

## 3. ファイル構成

```
lib/slideTemplates.ts                # 変更: SLIDE_START_TAG_SOURCE / createSlideStartRegex() / findSlideEnd() を追加し、updatePageNumbers / findSlideInsertPosition で使う（2.5）
lib/slideReorder.ts                  # 変更: extractSlides を createSlideStartRegex() + 共通 findSlideEnd() に（ローカル findSlideEnd を削除、2.5）、findSlideIndexAtCursor / extractSingleSlideHTML を追加（2.2 / 2.3）
lib/imageProcessor.ts                # 変更: findCurrentSlide を createSlideStartRegex() + 共通 findSlideEnd() に（ローカル findSlideEnd を削除、2.5）、
                                     #       分割スライドへの画像挿入は replaceImageInSplitSlide() / hasSplitSlideImage()（2.9）
components/ImageInserter/ImageInserterModal.tsx  # 変更: 既に画像を持つ分割スライドへの挿入前に置き換え確認（2.9）
components/ImageInserter/ImageManager.tsx        # 変更: 同上（2.9）
components/Editor/Editor.tsx         # 変更: setCursorPosition() を文書同期後に適用・文書長で丸め（2.10）
lib/pdfExporter.ts                   # 変更: PDFExportRange 型、options.slideIndex、1 枚出力時のファイル名サフィックスとステータス文言（2.4）
app/page.tsx                         # 変更: handleExportPDF(range) にし、'current' のときカーソルからインデックスを求めて slideIndex を渡す。ショートカットは 'all'
components/Menu/HamburgerMenu.tsx    # 変更: onExportPDF の型を (range) => void に、「📄 PDF出力（現在のスライドのみ）」ボタンを追加
lib/powerpointExporter.ts            # 変更: DOMParser 分割の理由コメントを現状に合わせて修正（コードは不変）
README.md                            # 変更: PDF 出力の説明に「現在のスライドのみ」を追記
docs/PDF_EXPORT_PLAN.md              # 変更: Phase 3 の該当項目をチェック、5.4 に範囲指定の注記
docs/PDF_EXPORT_RANGE_PLAN.md        # 本書
```

`page.tsx` の配線:

```ts
// app/page.tsx
const handleExportPDF = async (range: PDFExportRange = 'all') => {
  const trimmedContent = htmlContent.trim()
  if (!trimmedContent) {
    alert('出力するスライドがありません')
    return
  }
  let slideIndex: number | undefined
  if (range === 'current') {
    const cursorPosition = editorRef.current?.getCursorPosition() ?? 0
    // カーソル位置は trim 前の htmlContent のオフセットなので、判定も htmlContent に対して行う（下記参照）
    slideIndex = findSlideIndexAtCursor(htmlContent, cursorPosition)
    if (slideIndex === -1) {
      alert('スライド（<div class="slide">）が見つかりません')
      return
    }
  }
  try {
    await exportToPDF(trimmedContent, sizeConfig, template, {
      slideIndex,
      onStatus: (message) => setStatusMessage(message),
    })
    setTimeout(() => setStatusMessage(''), 8000)
  } catch (error) { /* 既存のまま */ }
}

const shortcutActions: ShortcutActions = { /* ... */ 'export-pdf': () => handleExportPDF('all') }
<HamburgerMenu ... onExportPDF={handleExportPDF} />
```

カーソル判定は **`trimmedContent` ではなく `htmlContent`** に対して行う（上の例のとおり）。カーソル位置はエディタ内容＝trim 前の文字列のオフセットで、
先頭に空白があると trim 後の文字列とはオフセットがずれるため。`exportToPDF()` 側は `htmlContent.trim()` 後に `extractSlides` し直すが、
trim で消えるのは前後の空白だけなのでスライドの順序（インデックス）は変わらない。

---

## 4. 実装フェーズ

### Phase 1: 実装

- [x] `lib/slideTemplates.ts` に `SLIDE_START_TAG_SOURCE` / `createSlideStartRegex()` / `findSlideEnd()`（開始タグの `>` の次から計測）を追加し、
      `updatePageNumbers()` と `findSlideInsertPosition()`（インラインの深さ計測を `findSlideEnd()` に置き換え）で使う（2.5）
- [x] `lib/slideReorder.ts` の `extractSlides()` と `lib/imageProcessor.ts` の `findCurrentSlide()` を `createSlideStartRegex()` + 共通 `findSlideEnd()` に切り替え、
      各ファイルのローカル `findSlideEnd` を削除する（2.5）
- [x] `grep -rn 'class="slide">' lib app components --include=*.ts --include=*.tsx` で、正規表現・固定長計算としての `<div class="slide">` が残っていないこと
      （テンプレート文字列のタグは残る）。`grep -rn "function findSlideEnd" lib` のヒットが `slideTemplates.ts` の 1 件だけになること
- [x] `lib/slideReorder.ts` に `findSlideIndexAtCursor()` と `extractSingleSlideHTML()`（他のスライドを後ろから取り除く方式）を追加（2.2 / 2.3）
- [x] `lib/pdfExporter.ts` に `PDFExportRange` 型と `options.slideIndex` を追加。`isExporting = true` の前に切り出し・範囲チェック。
      ステータス「PDFを準備中…（スライド n / N）」、既定ファイル名に `_pn`（2.4）
- [x] `app/page.tsx` の `handleExportPDF` を `(range)` 付きにし、`'current'` でカーソル（`htmlContent` 基準）からインデックスを求める。
      ショートカットは `'all'` を渡す
- [x] `components/Menu/HamburgerMenu.tsx` の `onExportPDF` の型変更と「📄 PDF出力（現在のスライドのみ）」ボタン追加（既存ボタンの直後）
- [x] `lib/powerpointExporter.ts` の DOMParser 分割の理由コメントを更新
- [x] `npx tsc --noEmit` が通る（2026-10-27 確認。`NODE_ENV=production npm run build` は PR 直前に 1 回だけ。dev サーバー稼働中は実行しない）

### Phase 2: 検証

Node（純粋関数）: **2026-10-27 実施、32 件すべて成功**（`lib/slideReorder.ts` / `slideTemplates.ts` / `imageProcessor.ts` を tsc で CommonJS に変換して実行）

- [x] `extractSlides()`: テストデッキ 8 枚、`all-features-template.html` 18 枚。`slide-table-container` 等の `slide-` 接頭辞クラスを拾わない
- [x] `updatePageNumbers()`: 分割スライドを含むテストデッキで、フッターの N が 8 になる（`PAGE_NUMBER_PLACEHOLDER` 形式と既存 `n/N` 形式の両方）
- [x] `findSlideEnd()`: 通常スライド・分割スライド（子 `<div>` あり / なし）・属性値に `<div` / `</div>` の文字列を含む開始タグで、
      戻り値が対応する `</div>` の直後になる（固定長開始の旧実装では後者 2 件がずれることを確認済み）
- [x] `findSlideInsertPosition()`: 分割スライド内のカーソルで、その分割スライドの終了位置（`extractSlides()` の `end` と同じ値）が返る
- [x] `findCurrentSlide()`: 分割スライド内のカーソルで、その分割スライドが返り、`start` / `end` / `content` が `extractSlides()` の同じスライドと一致する
      （抽出範囲がスライド全体と一致し、分割スライドへの画像挿入でスライド内容を壊さないこと）
- [x] `findSlideIndexAtCursor()`: スライド内 → そのスライド、`<head>` 内 → 0、スライド 3 と 4 の間 → 2、最後のスライドの後 → 最後、スライドなし → -1
- [x] `extractSingleSlideHTML()`: 戻り値の `extractSlides()` が 1 枚で選んだスライドの HTML と同一、`<head>` と `</body></html>` とスライド間のコメントが保持される、
      スライド間に `<script>` / 要素を置いた合成 HTML でもそれらが残る、範囲外は `null`、元の文字列は不変

ヘッドレス Chromium（dev サーバー、`print()` をスタブして呼び出し回数と `document.title` を観測）: **2026-10-27 Chromium 155 で実施、以下すべて確認**。p3 / p4（グラフ 2 canvas とも `Chart.getChart` 定義済み）/ p7（`slide slide-split`）/ p1（カーソル 0）の各 1 枚出力、ステータス「PDFを準備中…（スライド 3 / 8）」、ダイアログ中の再クリックは `print()` が増えない、`afterprint` 後に iframe が 0 件、`Ctrl+P` とメニューの全スライドは 8 枚・サフィックスなし

- [x] 「現在のスライドのみ」で印刷用 iframe 内の `.slide` が 1 つ、`print()` が 1 回、`title` が `スライド_YYYY-MM-DD_p3` 形式
- [x] グラフだけのスライド（テストデッキ 4 枚目）を単独出力し、`Chart.getChart(canvas)` が全 canvas で定義済みになってから `print()` が呼ばれる
- [x] 分割スライド（テストデッキ 7 枚目）を単独出力できる（2.5 の修正が効いていること）
- [x] ダイアログ表示中（`afterprint` 前）に「現在のスライドのみ」を再度押しても `print()` が増えない

実機 Chrome（Windows）:

- [x] メニュー「📄 PDF出力 (Ctrl+P)」と `Ctrl+P` は従来どおり全スライド（テストデッキで 8 ページ、ファイル名 `スライド_YYYY-MM-DD`）
      （2026-10-27 実機で既定ファイル名が `スライドエディタ.pdf` になる既存不具合が見つかり 2.8 で修正。2026-10-28 実機 Chrome / Windows で「8 ページ」・`スライド_2026-10-28.pdf` を確認）
- [x] カーソルをスライド 3 に置いて「現在のスライドのみ」→ 1 ページ、内容はスライド 3、フッターのページ番号は元の番号のまま、
      ステータスに「（スライド 3 / 8）」、「PDFに保存」のファイル名が `スライド_YYYY-MM-DD_p3`
      （2026-10-28 実機 Chrome / Windows でスライド 7 により確認: 1 枚のみ、ステータス「（スライド 7 / 8）」、`スライド_2026-10-28_p7.pdf`）
- [x] A4 横 / 16:9 の両方で、1 枚出力のページ寸法・余白なし・末尾空白ページなしが全スライド出力と同じ
      （16:9 は 2026-10-28 実機出力の `スライド_2026-10-28_p8` を pdfinfo で確認: 1 ページ、960 × 540 pt = 13.33 × 7.5 in、余白なし、数式・フッター `8/8` あり。A4 横も同日 `スライド_2026-10-28_p8_A4_landscape.pdf` で確認: 1 ページ、841.92 × 594.96 pt = A4 横、余白なし）
- [x] カーソルが `<head>` 内 → スライド 1、スライド間の空行 → 直前のスライド、`</html>` の後 → 最後のスライド
      （2026-10-28 実機 Chrome / Windows で確認）
- [x] メニューを開いてボタンを押す操作（エディタからフォーカスが外れる）でも、直前のカーソル位置のスライドが選ばれる
      （2026-10-28 実機 Chrome / Windows で確認）
- [x] エディタを一度も触っていない（カーソル 0）→ スライド 1
      （2026-10-28 実機 Chrome / Windows で確認）
- [x] 数式のみ・コードブロックのみ・画像を含む分割スライドを単独出力し、プレビューと同じ見た目になる
      （分割スライドは 2026-10-28 実機で左右カラム・画像を含めて単独出力できることを確認。数式のみ `_p5` / コードのみ `_p6` も同日の実機出力を pdfinfo / pdffonts / 描画で確認: 各 1 ページ A4 横、KaTeX フォント埋め込み・ブロック/インライン数式あり、Prism のダーク背景・ハイライト色・行番号・キャプションあり、フッター `5/8` `6/8`）
- [x] `<div class="slide">` を含まない HTML で「現在のスライドのみ」→ 「スライドが見つかりません」のアラートのみ（全スライド出力は従来どおり動く）
      （2026-10-27 ヘッドレスで確認: アラート 1 件・`print()` 0 回、全スライド側は `print()` 1 回。2026-10-28 実機 Chrome / Windows でも確認）
- [x] 空エディタ → 従来の「出力するスライドがありません」
      （2026-10-28 実機 Chrome / Windows で確認）
- [x] 2.5 の副作用: プレビューのスライド一覧に分割スライドが現れる。プレゼンテーションモードで分割スライドが表示される。
      （2026-10-28 実機で確認: プレゼンテーションモードは「7 / 8」として表示、スライド一覧は 8 件で 7 番目が「分割レイ…」）
      分割スライドにカーソルを置いてメニューの「スライド削除」「スライド複製」を実行すると、その分割スライドが対象になる
      （2026-10-28 実機で確認: 削除の確認ダイアログが「スライド7「分割レイアウトと画像」を削除しますか？」、削除後は一覧 7 件・フッター `6/7`。複製後は一覧 9 件で 7・8 番目が分割スライド）
- [x] 2.5 の副作用: 分割スライドを含むデッキでスライドを複製すると、全フッターの総ページ数 N が実枚数（一覧の枚数と同じ）に振り直される
      （2026-10-28 実機で確認: 複製後のフッターが `7/9`）
- [x] 2.5 の副作用: 分割スライド内にカーソルを置いて「スライド追加」「グラフを挿入」をすると、その分割スライドの直後 / 中に入る
      （2026-10-28 実機で確認: 追加した「新しいスライド」が分割スライドの `</div>` 直後に入り一覧で 8 番目、フッターは `7/9` に更新。グラフはフッターの直前（分割スライドの中）に入りプレビューで描画）
- [x] 2.5 の副作用: 分割スライド内にカーソルを置いて「画像を挿入」をすると、分割スライドの構造（`slide-split-content` と左右の子要素）が壊れずに画像が入る
      （2026-10-28 実機で「何も挿入されない」ことが判明 → 2.9 で修正。追加方式は 2 枚が横並びで溢れたため、確認のうえ置き換える方式に変更。
      あわせて挿入後の RangeError を 2.10 で修正。Node で確認済み。2026-10-28 実機 Chrome / Windows で再確認: 置き換えの確認ダイアログが出て、OK で右カラムの画像が差し替わり（`slide-image` 内の `<img>` 1 つ、フッター `7/8` 保持）、プレゼンテーションモードでも右カラムに収まって表示、エラーオーバーレイなし）
- [x] 他の PDF 関連挙動（`Ctrl+P` のショートカット無効化・キー変更、PowerPoint 出力）に変化がない
      （2026-10-28 実機 Chrome / Windows で確認）

### Phase 3: ドキュメント・タスク整理

- [x] `README.md` の「📄 PDF出力」の説明に「現在のスライドのみ」の出力とファイル名規則を追記
- [x] `docs/PDF_EXPORT_PLAN.md` Phase 3 の「エクスポート範囲指定」をチェックし、5.4 に本書への参照を追加
- [x] Notion の SEN-26 を Done にする（PR マージ後）（2026-10-28、PR #3 マージ・deploy 成功後）

---

## 5. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| スライド開始タグの正規表現変更（2.5）が他機能に波及する | スライド一覧・プレゼンテーションモード・削除/複製・挿入系で分割スライドが数に入る（インデックスが 1 ずつ後ろにずれるデッキがある）。次にスライド操作をしたときフッターの N が変わる | いずれも現状が不具合（分割スライドの取りこぼし）で、変更後が仕様どおり。`slide-` 接頭辞クラスを拾わないことを Node で確認済み。Phase 2 で一覧・プレゼン・削除/複製・ページ番号・挿入位置を確認 |
| 4 箇所の正規表現のうち一部だけ直して枚数の定義が食い違う | 一覧は 8 枚なのにフッターは `3/7`、のような不整合 | 定義を `createSlideStartRegex()` に集約し、Phase 1 の grep チェックで旧パターンが残っていないことを確認する |
| 終了位置の深さ計測が固定長 `'<div class="slide">'.length` から始まる実装が残る | 修飾子付き開始タグで計測がタグの途中から始まる。属性値に `<div` / `</div>` を含む場合は終了位置がずれ、挿入系がスライドを壊す | `findSlideEnd()` を `slideTemplates.ts` に 1 本化し、開始タグの `>` の次から計測する。Phase 1 の grep で `function findSlideEnd` が 1 件だけになることを確認。Phase 2 で抽出範囲が `extractSlides()` と一致することを Node で確認 |
| `findSlideEnd()` の共通化で `extractSlides()` の結果が変わる | スライド一覧・PDF の枚数や範囲が変わる | `slideReorder.ts` 版は既にタグ終端基準で、共通版と同じロジック。Phase 2 の Node テスト（テストデッキ 8 枚、`all-features-template.html` 18 枚、各スライドの `start` / `end`）で変化がないことを確認 |
| 「現在のスライド」がユーザーの想定と違う（プレビューで見ている枚とカーソルの枚が違う） | 意図と違う 1 枚が出る | ステータスに「（スライド n / N）」、ファイル名に `_pn` を出して、どれを出したかを明示する。ルールはアプリ内の他操作と同じ「カーソル位置」 |
| `trim()` によるオフセットずれ | 先頭に空白がある HTML でカーソル判定が 1 枚ずれる | カーソル判定は `htmlContent`（trim 前）に対して行い、`exportToPDF()` 側で trim 後に再抽出する。インデックス（順序）は trim で変わらない |
| 1 枚分に切り出した HTML でグラフ・数式・コードの待機が狂う | 中間状態や空描画が写る | グラフ初期化・待機はいずれも iframe 内の DOM 走査方式で、入力 HTML に依存しない。Phase 2 でグラフのみ・数式のみ・コードのみの単独出力を確認 |
| ユーザー独自の `<head>` 内 `<style>` が落ちる | 1 枚出力だけ見た目が変わる | 元ソースの切り出し方式（2.3 案 A）で `<head>` を保持する。プレゼンテーションモード方式（案 C）は採らない |
| 1 枚出力でスライド以外の内容が失われる | スライド間のコメント・`<script>`・要素が消えると、ユーザーの HTML によっては見た目が変わる | 他のスライドだけを取り除く方式（2.3 案 A）にし、スライド外の内容はすべて残す。失われるのは他のスライドの中身のみ。元の `htmlContent` は変更しない（切り出しは出力用コピー） |
| 範囲外の `slideIndex`（判定と出力の間で内容が変わる） | 例外 | 同一ハンドラ内で同期的に判定→呼び出しするため起きないが、`exportToPDF()` 側でも `null` チェックして `isExporting` を立てる前に例外にする |
| `print()` 中の多重起動 | 二重ダイアログ | 既存の `isExporting` を共有するため、全スライド / 1 枚のどちらで開いていても 2 回目は無視される |
| 「現在のスライドのみ」にショートカットがない | キーボードだけで 1 枚出力できない | 2.6 のとおり意図的に見送り。要望があれば `DEFAULT_SHORTCUTS` に追加するだけで既存ユーザーにも届く |

---

## 6. 影響範囲（変更しないもの）

- PDF 出力本体の待機・印刷 CSS・後片付け、16:9 正規化、`Ctrl+P` ショートカット定義
- PowerPoint 出力（DOMParser 分割はそのまま。コメントのみ更新）
- スライド削除・複製・追加・挿入の「現在のスライド」判定ルール（2.5 で正規表現は直すが、ルール自体は変えない）
- `updatePageNumbers()` のフッター置換ロジック（枚数カウントの正規表現だけ変える）
- 保存形式・localStorage（新しい設定は増やさない）

---

## 7. 工数見積

| フェーズ | 目安 |
|---|---|
| Phase 1 | 1.0h（2.5 の 4 箇所集約を含む） |
| Phase 2 | 1.0h（Node テスト・ヘッドレス・実機。ページ番号と挿入位置の確認を含む） |
| Phase 3 | 0.25h |

Notion の Effort level「Small」と整合する。

---

## 8. 変更履歴

- 2026-10-28: 実装後のコードレビュー反映（軽微 1 件）。2.10 の保留カーソル位置が新しい文書長を超えると残り続ける問題を修正（同期時に必ず消費し、範囲外は末尾に丸めて適用）。

- 2026-10-28: 実機確認の指摘反映（2 件）。(1) 2.9 の「右カラムに追加」は 2 枚が横並びで溢れたため、ユーザー判断で「確認のうえ置き換え」に変更
  （`replaceImageInSplitSlide()` / `hasSplitSlideImage()`、モーダルと画像管理に確認ダイアログ）。(2) 画像挿入後の `setCursorPosition()` が
  `RangeError: Selection points outside of document` になる既存不具合を 2.10 として修正（文書同期後に適用・文書長で丸め）。

- 2026-10-28: 実機確認（項目 14）の指摘反映。分割スライドへの「画像を挿入」が 2.5 の結果として無効になっていた
  （`findCurrentSlide()` は分割スライドを返すが `convertToSplitLayout()` が変換せずそのまま返す）ため、2.9 として右カラム `.slide-image` に `<img>` を追加する方式に修正。

- 2026-10-27: 実機確認の指摘反映。全スライド出力の「PDFに保存」既定ファイル名が `スライドエディタ.pdf`（親ページの title）になる既存不具合を 2.8 として修正
  （印刷中だけ親の `document.title` を差し替え、後片付けで復元）。ヘッドレスで差し替えと復元を確認。

- 2026-10-27: 実装後のコードレビュー反映（軽微 1 件）。`extractSingleSlideHTML()` が `1.5` や `NaN` を弾かず、全スライドを取り除いた HTML を返して
  `exportToPDF()` が空の出力を進めてしまうため、`Number.isInteger()` チェックを追加（`null` → `exportToPDF()` 側で例外）。Node テストにケースを追加。

- 2026-10-27: 3 回目レビュー反映（軽微 1 件）。`page.tsx` の配線例が `findSlideIndexAtCursor(trimmedContent, …)` のままで直後の説明（`htmlContent` を渡す）と食い違っていたため、
  例を `findSlideIndexAtCursor(htmlContent, cursorPosition)` に修正し、説明を例に合わせて整理。
- 2026-10-27: 再レビュー反映（1 件）。`imageProcessor.ts` の `findSlideEnd()` が固定長 `'<div class="slide">'.length` から深さ計測を始めている点を 2.5 に追加。
  Node で再現したところ、通常の分割スライドでは結果は変わらず（開始タグの残りに `<div` / `</div>` が含まれないため）、属性値にそれらの文字列を含む場合だけずれることを確認。
  重複する 3 つの深さ計測を `slideTemplates.ts` の `findSlideEnd()`（タグの `>` の次から計測）に 1 本化する方針にし、Phase 1・Phase 2・リスク表を更新。
- 2026-10-27: レビュー反映（2 件）。
  (1) `updatePageNumbers()` も厳密な正規表現でスライドを数えており、`extractSlides()` だけ直すとフッターの総ページ数と一覧の枚数が食い違うため、
  2.5 を「スライド開始タグの正規表現を `createSlideStartRegex()` に集約し、4 箇所（`extractSlides` / `updatePageNumbers` / `findSlideInsertPosition` / `findCurrentSlide`）
  すべてで使う」に変更。任意項目だった 2 箇所も必須にし、影響表・Phase 1・Phase 2・リスク表・工数を更新。
  (2) `extractSingleSlideHTML()` を「最初と最後のスライドの間を置き換える」方式から「他のスライドだけを後ろから取り除く」方式に変更。
  スライド間のコメントだけでなく `<script>` や要素も残ることを Node で確認（テストデッキ 4 位置 + 合成 HTML）。
- 2026-10-27: 初版。設計の前提として、`extractSlides()` が `class="slide slide-split"` に一致しない既存不具合を Node で確認し、2.5 として修正対象に含めた。
  1 枚切り出し方式（2.3 案 A）はテストデッキで `.slide` 1 つ・`<head>` 保持を確認済み。
