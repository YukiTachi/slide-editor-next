# PDF出力: Ctrl+P ショートカット割り当て 実装計画

Notion タスク: SEN-4（`docs/PDF_EXPORT_PLAN.md` Phase 3 の一項目）

## 1. 概要

### 目標

`Ctrl+P`（Mac は `Cmd+P`）でアプリの PDF 出力（印刷ダイアログ方式）を起動できるようにする。
ブラウザ既定の「ページを印刷」（エディタ画面そのものの印刷）は、このアプリでは意味がないため置き換える。
ショートカットは既存の仕組み（設定モーダルでのキー変更・無効化）に載せ、「📁 ファイル」カテゴリに追加する。

### 背景

- PDF 出力はハンバーガーメニューの「📄 PDF出力」ボタンからのみ実行できる。`docs/PDF_EXPORT_PLAN.md` 5.4 は
  「Ctrl+P はブラウザ既定の印刷を奪う変更であり、`ShortcutActions` 型・`useKeyboardShortcuts`・`page.tsx` を
  セットで変更する必要があるため Phase 3 送り」としていた。
- 現状、エディタ画面で `Ctrl+P` を押すとブラウザの印刷ダイアログが開き、エディタ UI がそのまま印刷対象になる。
  ユーザーが期待する「スライドを PDF にする」動作とは一致しない。

### 前提（現状のアーキテクチャ）

- グローバルショートカットは `hooks/useKeyboardShortcuts.ts` が `window` の `keydown` を **capture フェーズ**で受け、
  `lib/keyboardShortcutsConfig.ts` の `DEFAULT_SHORTCUTS`（localStorage の設定をマージ）と `matchesShortcut()` で照合する。
  一致したら `preventDefault()` / `stopPropagation()` の後、`page.tsx` が渡す `ShortcutActions` のハンドラを呼ぶ。
- `ShortcutActions` のキー（アクション名）は `hooks/useKeyboardShortcuts.ts` のインターフェースで固定されており、
  新しいアクションは **型・既定定義・`page.tsx` の配線の3点をセットで追加**する。
- 設定の読み込み（`lib/keyboardShortcutsStorage.ts` の `loadShortcuts()`）は、保存済み設定を `DEFAULT_SHORTCUTS` の id でマージするため、
  新しい id を追加しても `CONFIG_VERSION` を上げずに既存ユーザーへ届く（`customKey` / `enabled` だけが保存値で上書きされる）。
- 設定モーダル（`components/KeyboardShortcuts/KeyboardShortcutsModal.tsx`）はカテゴリごとにデータ駆動で一覧を描画するため、
  定義を追加すれば UI 側の変更は不要。
- PDF 出力のハンドラ `handleExportPDF` は `components/Menu/HamburgerMenu.tsx` に閉じている
  （`exportToPDF(htmlContent, sizeConfig, template, { onStatus })` を呼び、空コンテンツは `alert`、失敗は `alert`、
  案内メッセージは 8 秒後にクリア）。`page.tsx` からは呼べない。
- 照合（`matchesShortcut()`）は **Ctrl と Cmd / Meta を同一視**する（`ctrlKey` と `metaKey` のどちらでも一致）。
  一方、重複チェック（`findDuplicateShortcut()`）は **キー文字列の完全一致**で、キー入力 UI（`ShortcutKeyInput`）は
  Mac では `Cmd+P`、それ以外では `Ctrl+P` と保存する。つまり `Cmd+P` と `Ctrl+P` は照合では同じキーだが、重複としては検出されない。
- `lib/pdfExporter.ts` の `exportToPDF()` はモジュール変数 `isExporting` で多重起動を防いでいる。
  ショートカット連打や、印刷ダイアログ表示中の再実行はここで無視される。
- `HamburgerMenu` の利用箇所は `app/page.tsx` の 1 箇所のみ。

---

## 2. 設計方針

### 2.1 ハンドラを `page.tsx` に持ち上げ、メニューとショートカットで共有する（採用）

`page.tsx` は `sizeConfig`（`useSlideSize`）、`template`（`useCSSDesignTemplate`）、`setStatusMessage` をすでに持っているため、
`handleExportPDF` を `page.tsx` に移し、`HamburgerMenu` には `onExportPDF` prop として渡す。
メニューの「📄 PDF出力」ボタンとショートカットが同じ関数を呼ぶ。

| 案 | 判断 | 理由 |
|---|---|---|
| **A. ハンドラを `page.tsx` に移し、`HamburgerMenu` へ `onExportPDF` prop で渡す（採用）** | ✅ | `onUndo` / `onSearchReplace` / `onHierarchyPanelToggle` と同じ分担（`page.tsx` が所有、メニューは呼ぶだけ）。ロジックが 1 箇所になり、空コンテンツ判定・ステータス表示・エラー処理がボタンとショートカットで一致する |
| B. `page.tsx` に `exportToPDF()` 呼び出しをもう 1 つ書く | ❌ | `handleOpenPreviewWindow` が「一時的な解決策」としてメニューの `openPreviewWindow` を複製しているのと同じ構図を増やす。挙動がずれる温床になる |
| C. `HamburgerMenu` に `useImperativeHandle` で `exportPDF()` を生やし、`page.tsx` から ref 経由で呼ぶ | ❌ | メニューの内部実装に `page.tsx` が依存する。既存の prop 方式と不揃い |
| D. ショートカットでメニューの PDF ボタンを DOM 経由でクリックする | ❌ | メニューが閉じていると要素がない。脆い |

`HamburgerMenu` 側の `handleExportPDF` と `exportToPDF` の import は削除する（二重定義を残さない）。
`HamburgerMenu` 内の `sizeConfig` / `template` は PowerPoint 出力で引き続き使うため残す。

### 2.2 ショートカット定義

```ts
// lib/keyboardShortcutsConfig.ts — ファイルカテゴリの末尾（'restore' の次）に追加
{
  id: 'export-pdf',
  action: 'export-pdf',
  label: 'PDF出力',
  defaultKey: 'Ctrl+P',
  enabled: true,
  category: 'file'
}
```

- `Ctrl+P` は Chrome / Edge / Firefox / Safari のいずれでも `preventDefault()` で既定動作（印刷）を抑止できる
  （`Ctrl+N` / `Ctrl+T` / `Ctrl+W` のようなブラウザ予約キーではない）。既存の capture フェーズ処理で十分。
- Mac では `matchesShortcut()` が `ctrlKey` と `metaKey` を同一視するため、`Cmd+P` でも `Ctrl+P` でも発火する。
  表示は `formatShortcutKey()` が `Cmd+P` に置き換える。
- CodeMirror は Mac 向けに Emacs 風の `Ctrl-p`（カーソルを 1 行上へ）を標準キーマップに含むが、
  ショートカットは capture フェーズで先に処理されるため、Mac で `Ctrl+P` を押すと PDF 出力になる。
  既存の `Ctrl+F`（Emacs 風 `Ctrl-f` と競合）と同じ扱いで、`Cmd+P` が本来の操作なので許容する。
- `CONFIG_VERSION` は **上げない**。`loadShortcuts()` の id マージで既存ユーザーにも `export-pdf` が有効状態で届く。
  バージョンを上げると既存ユーザーのカスタムキーがすべてリセットされるため、避ける。既存のカスタムキーと衝突する場合の扱いは 2.4。

### 2.3 `page.tsx` の配線

```ts
// hooks/useKeyboardShortcuts.ts
export interface ShortcutActions {
  // ...既存
  'export-pdf': () => void
}

// app/page.tsx
const handleExportPDF = async () => {
  const trimmedContent = htmlContent.trim()
  if (!trimmedContent) {
    alert('出力するスライドがありません')
    return
  }
  try {
    await exportToPDF(trimmedContent, sizeConfig, template, {
      onStatus: (message) => setStatusMessage(message),
    })
    setTimeout(() => setStatusMessage(''), 8000)   // 案内メッセージを印刷ダイアログ表示中しばらく残す
  } catch (error) {
    console.error('PDF出力に失敗:', error)
    alert('PDF出力に失敗しました。コンソールを確認してください。')
  }
}

const shortcutActions: ShortcutActions = {
  // ...既存
  'export-pdf': handleExportPDF,
}

<HamburgerMenu ... onExportPDF={handleExportPDF} />
```

`HamburgerMenu` の PDF ボタンは `onClick={(e) => { e.stopPropagation(); onExportPDF(); }}` に変える。
prop は必須にする（利用箇所は `page.tsx` のみで、省略時に黙ってボタンが効かなくなる状態を作らない）。

### 2.4 既存のカスタム設定との競合は「既存設定を優先し、新しい既定は無効で届ける」

新しい既定ショートカット `Ctrl+P` を追加したとき、ユーザーが既に別のアクションへ `Ctrl+P`（Mac では `Cmd+P`）を
カスタム割り当てしていると、照合では同じキーとして衝突する。`DEFAULT_SHORTCUTS` の並び順で先に一致した方だけが動くため、
どちらかが**黙って効かなくなる**（既存アクションが `edit` カテゴリなら PDF 出力が起動せず、`view` / `insert` なら既存アクションが壊れる）。

対策は 2 段構えにする。

1. **重複チェックを Ctrl / Cmd / Meta 同一視の正規化比較にする**（`lib/keyboardShortcutsManager.ts`）
   ```ts
   /** 照合（matchesShortcut）と同じ同一視でキー文字列を正規化する。'Cmd+P' / 'Meta+P' / 'ctrl+p' → 'Mod+P'。修飾キーは固定順 */
   export function normalizeKeyString(keyString: string): string {
     const parsed = parseKeyString(keyString)
     const mods = [
       (parsed.ctrl || parsed.meta) && 'Mod',
       parsed.shift && 'Shift',
       parsed.alt && 'Alt',
     ].filter(Boolean)
     return [...mods, parsed.key.length === 1 ? parsed.key.toUpperCase() : parsed.key].join('+')
   }

   export function findDuplicateShortcut(shortcuts, shortcutId, keyString) {
     const target = normalizeKeyString(keyString)
     return shortcuts.find(s => s.id !== shortcutId && s.enabled
       && normalizeKeyString(s.customKey || s.defaultKey) === target) || null
   }
   ```
   これで設定モーダルは `Cmd+P` と `Ctrl+P`（および `Ctrl+Shift+P` と `Shift+Ctrl+P` のような順序違い）を重複として警告する。
   照合側の `matchesShortcut()` は変えない（同一視の定義を `normalizeKeyString` に合わせただけ）。

2. **読み込み時、新しく追加された既定ショートカットが既存の有効なキーと衝突していたら `enabled: false` で追加する**
   （`lib/keyboardShortcutsStorage.ts` の `loadShortcuts()`）
   ```ts
   // 保存済み設定に存在しない id は「このバージョンで新しく追加された既定」。
   // 既存の有効なショートカット（customKey || defaultKey）と正規化後のキーが衝突する場合は無効で追加し、
   // ユーザーの既存設定を壊さない。設定モーダルには表示されるので、他方のキーを変えてから有効化できる。
   // usedKeys は「有効なキーの集合」として処理中も更新する。有効で追加した新規既定のキーも加えることで、
   // 同時に追加された複数の新規既定が同じキーを持つ場合も 2 件目以降を無効にでき、両方が有効になることはない。
   // 対象は「現行の DEFAULT_SHORTCUTS に id が存在する保存済みエントリ」に限る。既定から削除された古い id の
   // エントリは loadShortcuts() の戻り値に含まれず（照合対象にならない）、そのキーを衝突扱いにすると
   // 新規既定が誤って無効になるため
   const defaultIds = new Set(defaultShortcuts.map(s => s.id))
   const usedKeys = new Set(
     config.shortcuts
       .filter(s => defaultIds.has(s.id) && s.enabled !== false)
       .map(s => normalizeKeyString(s.customKey || s.defaultKey))
   )
   return defaultShortcuts.map(defaultShortcut => {
     const stored = shortcutsMap.get(defaultShortcut.id)
     if (stored) { /* 既存のマージ処理のまま */ }
     const key = normalizeKeyString(defaultShortcut.defaultKey)
     if (usedKeys.has(key)) {
       console.info(`[shortcuts] ${defaultShortcut.id} は既存のキー割り当てと重複するため無効で追加します`)
       return { ...defaultShortcut, enabled: false }
     }
     if (defaultShortcut.enabled) usedKeys.add(key)   // 有効で届ける新規既定のキーも以後の衝突判定に含める
     return defaultShortcut
   })
   ```
   ルールは「**ユーザーの既存設定 > 新しい既定**」、新規既定どうしは「**`DEFAULT_SHORTCUTS` で先に並ぶ方 > 後の方**」。
   衝突がなければ従来どおり有効で届く。このルールは `export-pdf` 固有ではなく、今後追加する既定ショートカットすべてに効く。
   既存の保存済みショートカットどうしの重複（過去に設定モーダルの完全一致チェックをすり抜けたもの）は、この処理では触らない
   （ユーザーが保存した状態を勝手に変えないため。設定モーダルを開けば正規化比較の警告で気付ける）。

| 案 | 判断 | 理由 |
|---|---|---|
| **A. 正規化比較 + 衝突時は無効で追加（採用）** | ✅ | どちらのアクションも黙って壊れない。ユーザーが設定モーダルで意図的に解消できる。既存の保存形式は変えない |
| B. `export-pdf` を `DEFAULT_SHORTCUTS` の先頭に置いて必ず勝たせる | ❌ | ユーザーのカスタム設定を黙って上書きする。カテゴリ順の表示も崩れる |
| C. 衝突時に既存側のカスタムキーを外す | ❌ | ユーザーの設定を勝手に変える。復元できない |
| D. `CONFIG_VERSION` を上げて全員の設定をリセットする | ❌ | 衝突の有無に関わらず全カスタムキーが消える |

### 2.5 設定モーダルでのキー記録中はグローバルショートカットを実行しない

レビューで判明した既存の不具合: グローバル処理（`useKeyboardShortcuts`、`window` の capture）は、設定モーダルの
キー記録処理（`ShortcutKeyInput`、`document` の capture）より先に走り、一致したキーを実行して伝播を止める。
そのため設定画面で割り当て済みのキー（`Ctrl+P` に限らず `Ctrl+S` など）を入力すると、記録されずにそのアクションが実行される。
本件で `Ctrl+P` の重複警告を検証するにはこの不具合の修正が前提になるため、スコープに含める。

- `ShortcutKeyInput` は記録中（`isRecording`）だけ、入力要素に `data-shortcut-recording="true"` を付ける。
- `useKeyboardShortcuts` の `handleKeyDown` は先頭で `document.querySelector('[data-shortcut-recording="true"]')` を見て、
  記録中なら何もせず return する（`preventDefault` もしない。記録側が自分で `preventDefault` / `stopPropagation` する）。
- あわせて、記録が重複拒否や Escape で終わったときに表示が「キーを押してください...」のまま残る既存の表示不具合も直す
  （`ShortcutKeyInput` の表示同期を `value` の変化だけでなく記録モードの終了でも行う）。
- 記録はフォーカス位置に依存せず、記録中である事実だけで判定する（記録用の要素は `div` で、イベントの `target` が
  常にその要素になるとは限らないため）。要素がアンマウントされれば属性も消えるので取り残しは起きない。

### 2.6 修飾キー（Shift / Alt）の照合を厳密にする

実機確認で判明した既存の不具合: `matchesShortcut()` はキー文字列に `Shift` / `Alt` が**含まれているときだけ**その修飾キーを検査していた
（「含まれていないのに押されていたら不一致」の分岐は書かれていたが、到達しない条件になっていた）。そのため `Ctrl+P` が
`Ctrl+Shift+P` にも一致して PDF 出力が起動し、同様に `Ctrl+Z` が `Ctrl+Shift+Z`（一般的には Redo）にも一致して「元に戻す」が動いていた。

- 修正: Shift と Alt について「文字列に含まれているか」と `event.shiftKey` / `event.altKey` の一致を必須にする。
  Ctrl / Meta の同一視（2.2）と、`normalizeKeyString()` が `Ctrl+P` と `Ctrl+Shift+P` を別のキーとして扱う点（2.4）には整合する。
- 影響: 既定・カスタムを問わず全ショートカットが、余分な Shift / Alt を押した状態では発火しなくなる。
  `Ctrl+Shift+Z` はグローバル処理を通らなくなるため、エディタにフォーカスがあれば CodeMirror 側の挙動（CodeMirror 自身の履歴）になる。
  アプリの履歴（`useHistory`）に `Ctrl+Shift+Z` を Redo として割り当てるかは本件のスコープ外とし、必要なら別タスクにする。
- 保存形式・キー文字列・設定モーダルは変更しない。

### 2.7 変更しないもの

- `lib/pdfExporter.ts`（多重起動防止・待機ロジック・印刷CSS）
- `hooks/useKeyboardShortcuts.ts` のイベント処理本体と `matchesShortcut()` の照合ルール（型にキーを 1 つ足すだけ）
- 設定モーダル（データ駆動のため一覧表示の変更は不要。重複警告は既存の `onCheckDuplicate` 経由で正規化比較の結果が出る）。
  `ShortcutKeyInput` は 2.5 の記録中マーカー（属性 1 つ）だけを追加する
- 保存形式（`KeyboardShortcutsConfig`）と `CONFIG_VERSION`

---

## 3. ファイル構成

```
hooks/useKeyboardShortcuts.ts        # 変更: ShortcutActions に 'export-pdf' を追加、キー記録中はグローバル処理を素通り（2.5）
components/KeyboardShortcuts/ShortcutKeyInput.tsx  # 変更: 記録中に data-shortcut-recording="true" を付与（2.5）
lib/keyboardShortcutsConfig.ts       # 変更: DEFAULT_SHORTCUTS に export-pdf（Ctrl+P、file）を追加
lib/keyboardShortcutsManager.ts      # 変更: normalizeKeyString() を追加し findDuplicateShortcut() を正規化比較にする。matchesShortcut() の Shift / Alt 照合を厳密化（2.6）
lib/keyboardShortcutsStorage.ts      # 変更: loadShortcuts() で新規既定が既存キーと衝突する場合は enabled: false で追加
app/page.tsx                         # 変更: handleExportPDF を追加、shortcutActions と HamburgerMenu の onExportPDF に配線、exportToPDF を import
components/Menu/HamburgerMenu.tsx    # 変更: onExportPDF prop を追加、ローカルの handleExportPDF と exportToPDF import を削除
lib/tutorialSteps.ts                 # 変更: ショートカット一覧に Ctrl+P を追加
README.md                            # 変更: デフォルトのショートカットに Ctrl+P を追加
docs/PDF_EXPORT_PLAN.md              # 変更: 5.4-2 の注記を「対応済み」に、Phase 3 の項目をチェック
docs/KEYBOARD_SHORTCUTS_PLAN.md      # 変更: 2.1 の一覧に Ctrl+P を追加
docs/PDF_CTRL_P_SHORTCUT_PLAN.md     # 本書
```

---

## 4. 実装フェーズ

### Phase 1: 実装

- [x] `hooks/useKeyboardShortcuts.ts` の `ShortcutActions` に `'export-pdf'` を追加
- [x] `components/KeyboardShortcuts/ShortcutKeyInput.tsx` に記録中マーカーを付け、`useKeyboardShortcuts` の `handleKeyDown` で記録中は素通りさせる（2.5）
- [x] `lib/keyboardShortcutsManager.ts` の `matchesShortcut()` で Shift / Alt の有無を厳密に照合する（2.6）
- [x] `lib/keyboardShortcutsConfig.ts` に `export-pdf`（`Ctrl+P`、`file`、`'restore'` の次）を追加
- [x] `lib/keyboardShortcutsManager.ts` に `normalizeKeyString()` を追加し、`findDuplicateShortcut()` を正規化比較に変更
- [x] `lib/keyboardShortcutsStorage.ts` の `loadShortcuts()` で、保存済み設定に無い既定 id が既存の有効キー（現行の既定 id に対応する保存済みエントリと、有効で追加した新規既定のキー）と衝突する場合は `enabled: false` で追加
- [x] `app/page.tsx` に `handleExportPDF` を追加し、`shortcutActions` と `HamburgerMenu` の `onExportPDF` に配線
- [x] `components/Menu/HamburgerMenu.tsx` に `onExportPDF` prop を追加し、ローカルの `handleExportPDF` と `exportToPDF` の import を削除
- [x] `grep -rn "exportToPDF" app components` のヒットが `app/page.tsx` だけになっていること
- [x] `npx tsc --noEmit` と `NODE_ENV=production npm run build` が通る

### Phase 2: 検証（実機 Chrome）

- [x] エディタにフォーカスがある状態で `Ctrl+P` → アプリの PDF 出力が始まり（ステータスバーに「PDFを準備中…」→ 案内文）、
      ブラウザ既定の印刷ダイアログ（エディタ画面の印刷）は**開かない**
      （2026-10-26 ヘッドレス Chromium 155 で確認: CodeMirror にフォーカスした状態の Ctrl+P で `defaultPrevented: true`、ステータス 2 種を表示、印刷用 iframe の `print()` が 1 回呼ばれた。実機でも要確認）
- [x] CodeMirror の外（プレビュー側やメニュー）にフォーカスがある状態でも同様に動く
      （2026-10-27 実機 Chrome / Windows で確認）
- [x] 空エディタで `Ctrl+P` → 「出力するスライドがありません」のアラートのみ
      （2026-10-27 実機 Chrome / Windows で確認）
- [x] 印刷ダイアログ表示中に `Ctrl+P` を連打しても二重起動しない（ダイアログを閉じた後、再度 `Ctrl+P` で再実行できる）
      （ヘッドレスで 2 回目の Ctrl+P が `isExporting` で無視され `print()` 呼び出しが 1 回のままであることを確認。ダイアログを閉じた後の再実行は実機で確認）
- [x] メニューの「📄 PDF出力」ボタンが従来どおり動く（同じハンドラ経由）
      （2026-10-27 実機 Chrome / Windows で確認）
- [x] ショートカット設定モーダルの「📁 ファイル」に「PDF出力 Ctrl+P」が表示され、無効化すると `Ctrl+P` がブラウザ既定の印刷に戻る
      （一覧に 12 件目として表示されることはヘッドレスで確認。無効化で既定の印刷に戻ることは実機で確認）
- [x] 設定モーダルで別のキー（例: `Ctrl+Shift+P`）に変更すると、そのキーで PDF 出力が起動し `Ctrl+P` はブラウザ既定に戻る
      （2026-10-27 実機 Chrome / Windows で確認）
- [x] 「デフォルトにリセット」で `Ctrl+P` に戻る
      （2026-10-27 実機 Chrome / Windows で確認）
- [x] 既存ユーザーの再現: localStorage の `slideEditor_keyboardShortcuts` に `export-pdf` を含まない旧設定（version 1）を入れた状態でリロードし、
      `export-pdf` が有効で追加され、他のカスタムキーが保持されること
      （`loadShortcuts()` を Node で旧設定を与えて確認（以下 3 件も同様）。ブラウザ上での再現は任意）
- [x] 旧設定に **`Cmd+P`**（Mac 形式の文字列）を別アクション（例: `undo` の `customKey`）として含めた状態でリロードし、
      `export-pdf` が**無効**で追加され、`Ctrl+P` / `Cmd+P` で既存アクションが従来どおり動き、設定モーダルに「PDF出力（無効）」が表示されること
      （Node で `export-pdf.enabled === false`、`undo.customKey === 'Cmd+P'` を確認。モーダル表示は実機で確認）
- [x] 同じく旧設定に **`Ctrl+P`** を別アクションとして含めた場合も、`export-pdf` が無効で追加されること
- [x] 旧設定に、現行の既定に存在しない古い id（例: `id: 'old-action'`、`customKey: 'Ctrl+P'`）だけが `Ctrl+P` を持つ状態でリロードし、
      その古いエントリは衝突扱いにならず `export-pdf` が**有効**で追加されること
- [x] 上の状態で既存アクションのキーを別のものに変えてから `export-pdf` を有効化すると、`Ctrl+P` で PDF 出力が起動すること
      （2026-10-27 実機 Chrome / Windows で確認（旧設定は Console から書き込んで再現））
- [x] 設定モーダルでキー記録中に `Ctrl+P` や `Ctrl+S` を押しても、PDF 出力や HTML コピーが**実行されず**、キーが記録されること（2.5）
      （2026-10-26 ヘッドレス Chromium 155 で確認: 記録中の Ctrl+P / Ctrl+S は実行されず重複警告が出る。未使用の Ctrl+Shift+Q は記録される。記録モード外の Ctrl+P は PDF 出力が走る）
- [x] 設定モーダルで、`Ctrl+P` が割り当て済みのときに別アクションへ `Cmd+P`（Mac）や `Ctrl+P` を入力すると重複警告が出ること。
      （ヘッドレスで `Ctrl+P` 入力時に「このショートカットは「PDF出力」で既に使用されています」を確認。`Cmd+P` と修飾キー順の違いは Node の正規化テストで確認）
      `Ctrl+Shift+P` と `Shift+Ctrl+P` のような修飾キー順の違いも重複として扱われること
- [ ] Mac（または Mac 相当の環境）で `Cmd+P` により PDF 出力が起動し、ブラウザ既定の印刷が開かないこと
      （**未確認: Mac 環境がないため。** 照合ロジック上は `Cmd+P` と `Ctrl+P` を同一視しており、Node の単体テストで `Meta+P` が一致することは確認済み）
- [x] `Ctrl+Shift+P` では PDF 出力が**起動しない**こと（2.6。修正前は起動していた）
      （2026-10-27 ヘッドレスで `print()` 呼び出し 0 回を確認。実機でも要確認）
- [x] `Ctrl+Shift+Z` で「元に戻す」が**動かない**こと（2.6。修正前はアプリの Undo が動いていた）
      （ヘッドレスでアプリの Undo ステータスが出ないことを確認）
- [x] 他のショートカット（`Ctrl+S` / `Ctrl+O` / `F5` など）の動作に変化がないこと
      （2026-10-27 実機 Chrome / Windows で確認）

### Phase 3: ドキュメント・タスク整理

- [x] `lib/tutorialSteps.ts` のショートカット一覧に `Ctrl+P` / `Cmd+P`: PDF出力 を追加
- [x] `README.md` の「デフォルトのショートカット」に `Ctrl+P` / `Cmd+P`: PDF出力 を追加
- [x] `docs/PDF_EXPORT_PLAN.md` 5.4-2 を「対応済み（本書参照）」に書き換え、Phase 3 の該当項目をチェック
- [x] `docs/KEYBOARD_SHORTCUTS_PLAN.md` 2.1 の一覧に `Ctrl+P` を追加
- [x] Notion の SEN-4 を Done にする（2026-10-27、PR #2 マージ後）

---

## 5. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| ユーザーが既に別のショートカットに `Ctrl+P` または `Cmd+P`（Mac 形式の保存文字列）をカスタム割り当てしている | 照合は Ctrl / Cmd を同一視するため衝突し、`DEFAULT_SHORTCUTS` の順序で先に一致した方だけが動く。既存アクションが `edit` カテゴリなら PDF 出力が起動せず、後ろのカテゴリなら既存アクションが黙って壊れる | 読み込み時に、新規既定が既存の有効キーと**正規化比較**で衝突する場合は `enabled: false` で追加する（既存設定を優先、2.4）。設定モーダルには無効状態で表示され、ユーザーが他方のキーを変えてから有効化できる。Phase 2 で `Cmd+P` / `Ctrl+P` 両方の旧設定を再現して確認 |
| 重複チェックが文字列の完全一致で、`Cmd+P` と `Ctrl+P` の重複を見逃す | 設定モーダルで警告なしに同一キーを二重割り当てできる | `findDuplicateShortcut()` を `normalizeKeyString()` による正規化比較にする（2.4）。照合ルール自体は変えない |
| `CONFIG_VERSION` を上げてしまう | 既存ユーザーのカスタムキーが全リセットされる | 上げない。id マージで新定義が届くことを Phase 2 の「既存ユーザーの再現」で確認する |
| Mac で CodeMirror の Emacs 風 `Ctrl-p`（1 行上へ）が使えなくなる | Mac で `Ctrl+P` によるカーソル移動を使っていた人は PDF 出力が開く | 既存の `Ctrl+F` 等と同じ扱い。`Cmd+P` が主操作であり、必要なら設定モーダルで無効化できる |
| ブラウザ既定の印刷（エディタ画面の印刷）が使えなくなる | 意図してエディタ画面を印刷したい場合 | このアプリでは用途がない。必要ならショートカットを無効化すれば既定動作に戻る |
| プレゼンテーションモード中に親ウィンドウへフォーカスがあると `Ctrl+P` が効く | プレゼン画面の上に印刷ダイアログが開く | 既存ショートカット（`Ctrl+O` 等）と同じ挙動で、本件のスコープ外。プレゼン中のショートカット抑止は別課題にする |
| 設定モーダルでキーを記録中にグローバルショートカットが先に実行される（既存不具合） | 割り当て済みキーを入力すると記録されずアクションが走り、`Ctrl+P` の重複警告も確認できない | 記録中マーカー `data-shortcut-recording` でグローバル処理を素通りさせる（2.5）。Phase 2 で `Ctrl+P` / `Ctrl+S` の記録を確認 |
| 修飾キー照合の厳密化で、余分な Shift / Alt を押した入力で発火していた操作が発火しなくなる（既存不具合の修正に伴う挙動変更） | `Ctrl+Shift+Z` で Undo が動いていた等の誤動作が止まる。意図してその挙動に頼っていた場合は操作感が変わる | 2.6 に記載。`Ctrl+Shift+Z` を Redo に割り当てるかは別タスク。Phase 2 で `Ctrl+Shift+P` / `Ctrl+Shift+Z` を確認 |
| `handleExportPDF` の移動でメニューの挙動が変わる | ボタン経由の空判定・ステータス・エラー処理が変わる | `HamburgerMenu` の実装をそのまま `page.tsx` に移す（`onStatusUpdate` → `setStatusMessage`）。Phase 2 でボタン経由も確認 |

---

## 6. 影響範囲（変更しないもの）

- PDF 出力本体（`lib/pdfExporter.ts`）と印刷CSS、`docs/PDF_16_9_PAGE_SIZE_PLAN.md` で入れた 16:9 の正規化
- PowerPoint 出力（ショートカットは付けない。モーダルを挟むため別途検討）
- ショートカットの照合ルール（`matchesShortcut()`）、保存形式、設定モーダルの実装（重複チェックと読み込み時の衝突処理は 2.4 のとおり変更する）

---

## 7. 工数見積

| フェーズ | 目安 |
|---|---|
| Phase 1 | 0.75h（2.4 の正規化比較と読み込み時の衝突処理を含む） |
| Phase 2 | 0.75h（旧設定の再現ケースを含む） |
| Phase 3 | 0.25h |

Notion の Effort level「Small」と整合する。

---

## 8. 変更履歴

- 2026-10-27: 実機確認で `Ctrl+Shift+P` でも PDF 出力が起動する（Shift / Alt が未検査）既存不具合が見つかり、`matchesShortcut()` の修飾キー照合を厳密化（2.6）。

- 2026-10-26: 設定モーダルで重複拒否・Escape の後に入力欄の表示が「キーを押してください...」のまま残る既存不具合の修正を 2.5 に追加。

- 2026-10-26: コードレビュー反映。設定モーダルでのキー記録中にグローバルショートカットが先に実行される既存不具合を 2.5 として修正対象に追加
  （記録中マーカー `data-shortcut-recording` で素通り）。Phase 3 のドキュメント更新（チュートリアル・README・PDF 計画書・ショートカット計画書）を同じ差分に含めた。

- 2026-10-26: 再々レビュー反映。`usedKeys` の対象を「現行の `DEFAULT_SHORTCUTS` に id が存在する保存済みエントリ」に限定する旨を 2.4 に明記
  （既定から削除された古い id のキーで新規既定が誤って無効になるのを防ぐ）。Phase 2 に古い id を含む旧設定の再現ケースを追加。

- 2026-10-26: 再レビュー反映。読み込み時の衝突判定で、有効で追加した新規既定のキーも `usedKeys` に加える仕様を 2.4 に明記
  （同時に追加された複数の新規既定が同じキーを持つ場合に両方が有効にならないようにする）。既存の保存済み設定どうしの重複には触れないことも明記。

- 2026-10-26: レビュー反映。照合が Ctrl / Cmd / Meta を同一視する一方で重複チェックが文字列の完全一致であるため、
  Mac の既存カスタム設定 `Cmd+P` と新しい既定 `Ctrl+P` が重複検出されずに衝突し、どちらかが黙って効かなくなる問題に対応。
  2.4 として「重複チェックの正規化比較」と「新規既定が既存キーと衝突する場合は無効で追加（既存設定を優先）」を追加し、
  ファイル構成・Phase 1・Phase 2・リスク表を更新。
- 2026-10-26: 初版。
