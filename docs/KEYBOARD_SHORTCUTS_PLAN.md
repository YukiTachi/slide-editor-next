# キーボードショートカットのカスタマイズ機能 実装計画

## 1. 概要

ユーザーがキーボードショートカットをカスタマイズできる機能を実装します。これにより、個人の作業スタイルに合わせた効率的な操作が可能になります。

## 2. 現在の実装状況

### 2.1 グローバルショートカット（`app/page.tsx`）

現在、以下のショートカットが実装されています：

**⚠️ 既知の問題**: `Ctrl+N`がブラウザのデフォルト動作（新しいウィンドウを開く）として動作してしまい、アプリケーションのショートカット（スライド追加）が機能しない場合がある。

**推奨**: カスタマイズ機能実装前の暫定対応として、`Ctrl+N`を別のキーに変更することを推奨します。

| ショートカット | 機能 | 説明 | 推奨変更案 |
|--------------|------|------|-----------|
| `Ctrl+Z` / `Cmd+Z` | アンドゥ | 編集履歴を元に戻す | - |
| `Ctrl+Y` / `Cmd+Y` | リドゥ | 編集履歴をやり直す | - |
| `Ctrl+S` / `Cmd+S` | クリップボードにコピー | HTMLをクリップボードにコピー | - |
| `Ctrl+K` / `Cmd+K` | エディタクリア | エディタの内容をクリア | - |
| `Ctrl+O` / `Cmd+O` | プレビューウィンドウ | 別ウィンドウでプレビューを開く | - |
| ~~`Ctrl+N` / `Cmd+N`~~ → **`Ctrl+M`** / `Cmd+M` | スライド追加 | 新しいスライドを追加 | **変更済み** ✅ |
| `Ctrl+I` / `Cmd+I` | 画像挿入 | 画像挿入モーダルを開く | - |
| `Ctrl+R` / `Cmd+R` | 復元 | 最後に保存した状態に復元 | - |
| `Ctrl+F` / `Cmd+F` | 検索・置換 | 検索・置換モーダルを開く | - |
| `Ctrl+H` / `Cmd+H` | 検索・置換 | 検索・置換モーダルを開く | - |

**推奨変更案の理由**:
- `Ctrl+Shift+N`: 一般的なアプリケーションで「新規作成」に使用される（例: Visual Studio Code、Chrome DevTools）
- `Ctrl+M`: シンプルで覚えやすい
- `Ctrl+Alt+N`: ブラウザとの競合が少ない

**注意**: `Ctrl+Shift+N`は一部のブラウザ（Chrome、Edge）でシークレットモードとして使用されていますが、アプリケーション内での処理を優先すれば問題ありません。

### 2.2 CodeMirrorエディタ内のショートカット

CodeMirrorの標準キーマップが使用されています：
- `Ctrl+Space`: コード補完
- `Ctrl+/`: 行コメント
- `Ctrl+F`: 検索（CodeMirror内）
- など

### 2.3 検索・置換モーダル内のショートカット

- `Enter`: 次の検索結果へ移動
- `Shift+Enter`: 前の検索結果へ移動
- `Ctrl+Enter`: 現在の検索結果を置換
- `Escape`: モーダルを閉じる

## 3. 要件定義

### 3.1 機能要件

1. **ショートカットのカスタマイズ**
   - 各機能に対してカスタムキーバインドを設定可能
   - デフォルトショートカットの変更
   - ショートカットの無効化
   - ショートカットのリセット（デフォルトに戻す）

2. **ショートカットの保存**
   - LocalStorageに保存
   - ブラウザを閉じても設定が保持される

3. **ショートカットの検証**
   - 重複チェック（同じショートカットが複数の機能に割り当てられていないか）
   - システムショートカットとの競合警告（任意）

4. **UI/UX**
   - ショートカット設定モーダル
   - 各機能のショートカット一覧表示
   - ショートカットの編集（キー入力で設定）
   - ショートカットの削除（無効化）
   - デフォルトへのリセット機能

### 3.2 非機能要件

- パフォーマンス: ショートカットの検出が即座に行われること
- 互換性: 既存のショートカットとの後方互換性を維持
- 拡張性: 将来的に新しいショートカットを追加しやすい構造

## 4. アーキテクチャ設計

### 4.1 データ構造

```typescript
// types/index.ts
export interface KeyboardShortcut {
  id: string                    // ショートカットID（一意）
  action: string                // アクション名（例: 'undo', 'redo'）
  label: string                 // 表示名（例: '元に戻す'）
  defaultKey: string            // デフォルトキー（例: 'Ctrl+Z'）
  customKey?: string            // カスタムキー（未設定の場合はdefaultKeyを使用）
  enabled: boolean              // 有効/無効
  category: 'edit' | 'file' | 'view' | 'insert' | 'other'  // カテゴリ
}

export interface KeyboardShortcutsConfig {
  shortcuts: KeyboardShortcut[]
  version: number               // 設定のバージョン（将来の互換性のため）
}
```

### 4.2 キー表現形式

キーの表現は以下の形式を使用：
- `Ctrl+Z`: Ctrlキー + Zキー
- `Cmd+S`: Commandキー（Mac）+ Sキー
- `Ctrl+Shift+N`: Ctrl + Shift + N
- `Alt+F4`: Alt + F4
- `Escape`: 単一キー

### 4.3 ファイル構成

```
lib/
  keyboardShortcutsStorage.ts    # ショートカット設定の保存・読み込み
  keyboardShortcutsConfig.ts     # デフォルトショートカット定義
  keyboardShortcutsManager.ts    # ショートカットの登録・実行管理

hooks/
  useKeyboardShortcuts.ts        # ショートカット管理用カスタムフック

components/
  KeyboardShortcuts/
    KeyboardShortcutsModal.tsx   # ショートカット設定モーダル
    KeyboardShortcutsModal.module.css
    ShortcutEditor.tsx           # 個別ショートカット編集コンポーネント
    ShortcutKeyInput.tsx         # キー入力受付コンポーネント
```

## 5. 実装詳細

### 5.1 ショートカット定義（`lib/keyboardShortcutsConfig.ts`）

```typescript
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'undo',
    action: 'undo',
    label: '元に戻す',
    defaultKey: 'Ctrl+Z',
    enabled: true,
    category: 'edit'
  },
  {
    id: 'redo',
    action: 'redo',
    defaultKey: 'Ctrl+Y',
    label: 'やり直す',
    enabled: true,
    category: 'edit'
  },
  // ... 他のショートカット
]
```

### 5.2 ショートカット管理（`lib/keyboardShortcutsManager.ts`）

- ショートカットの登録
- キーイベントの監視
- アクションの実行
- 重複チェック

### 5.3 ストレージ管理（`lib/keyboardShortcutsStorage.ts`）

- LocalStorageへの保存
- LocalStorageからの読み込み
- デフォルト設定へのリセット
- 設定の検証

### 5.4 UIコンポーネント

#### 5.4.1 ショートカット設定モーダル

- カテゴリ別にグループ化されたショートカット一覧
- 各ショートカットの編集ボタン
- リセットボタン（個別・全体）
- 保存・キャンセルボタン

#### 5.4.2 キー入力コンポーネント

- キー入力の受付
- 押されたキーの表示
- 修飾キー（Ctrl, Shift, Alt, Cmd）の検出
- 入力中の視覚的フィードバック

## 6. 実装ステップ

### Phase 1: 基盤の構築
1. 型定義の追加（`types/index.ts`）
2. デフォルトショートカット定義（`lib/keyboardShortcutsConfig.ts`）
3. ストレージ管理（`lib/keyboardShortcutsStorage.ts`）
4. ショートカット管理クラス（`lib/keyboardShortcutsManager.ts`）

### Phase 2: フックの実装
1. `useKeyboardShortcuts`フックの実装
2. 既存のキーボードイベントハンドラーをフックに統合

### Phase 3: UIコンポーネント
1. キー入力コンポーネント（`ShortcutKeyInput.tsx`）
2. ショートカット編集コンポーネント（`ShortcutEditor.tsx`）
3. ショートカット設定モーダル（`KeyboardShortcutsModal.tsx`）
4. スタイル（`KeyboardShortcutsModal.module.css`）

### Phase 4: 統合
1. ハンバーガーメニューに「キーボードショートカット設定」を追加
2. `app/page.tsx`の既存ショートカット処理を新しいシステムに移行
3. 重複チェック機能の実装
4. エラーハンドリング

### Phase 5: テスト・調整
1. 各ショートカットの動作確認
2. 設定の保存・読み込み確認
3. デフォルトへのリセット確認
4. UI/UXの調整

## 7. 技術的な考慮事項

### 7.1 キーイベントの処理

- `KeyboardEvent`の`key`, `code`, `ctrlKey`, `metaKey`, `shiftKey`, `altKey`を使用
- MacとWindows/Linuxの違い（Cmd vs Ctrl）を考慮
- エディタ内での入力中はショートカットを無効化（既存の実装を維持）

### 7.2 ブラウザのデフォルト動作の防止

**重要**: ブラウザのデフォルトショートカットとの競合を避けるために、以下を実装する必要があります：

1. **イベントリスナーの優先度**
   - `addEventListener`の第3引数で`{ capture: true }`を使用してキャプチャフェーズで処理
   - または、イベントハンドラー内で即座に`e.preventDefault()`を呼び出す

2. **特定のショートカットへの対処**
   - `Ctrl+N`（新しいウィンドウ）: 確実に`preventDefault()`を呼び出す
   - `Ctrl+W`（ウィンドウを閉じる）: アプリケーション側で使用しない
   - `Ctrl+T`（新しいタブ）: アプリケーション側で使用しない
   - `Ctrl+Shift+N`（シークレットモード）: アプリケーション側で使用しない

3. **実装例**
   ```typescript
   const handleKeyDown = (e: KeyboardEvent) => {
     // エディタ内で入力中はショートカットを無効化
     const target = e.target as HTMLElement
     if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
       return
     }

     if (e.ctrlKey || e.metaKey) {
       switch (e.key.toLowerCase()) {
         case 'n':
           e.preventDefault()  // ブラウザのデフォルト動作を防止
           e.stopPropagation() // イベントの伝播を停止
           handleAddSlide()
           return false  // 追加の安全策
         // ... 他のショートカット
       }
     }
   }

   // キャプチャフェーズでリスナーを登録
   document.addEventListener('keydown', handleKeyDown, { capture: true })
   ```

### 7.2 CodeMirrorとの統合

- CodeMirrorのキーマップは既存のまま維持
- グローバルショートカットのみをカスタマイズ対象とする
- 将来的にCodeMirrorのキーマップもカスタマイズ可能にする場合は別途検討

### 7.3 パフォーマンス

- ショートカットの検出は`keydown`イベントで行う
- イベントリスナーの登録は最小限に
- ショートカットマッチングは効率的なアルゴリズムを使用

## 8. UI/UX設計

### 8.1 ショートカット設定モーダル

```
┌─────────────────────────────────────────┐
│ キーボードショートカット設定        [×] │
├─────────────────────────────────────────┤
│                                         │
│ 📝 編集                                 │
│ ┌─────────────────────────────────────┐ │
│ │ 元に戻す          Ctrl+Z      [編集] │ │
│ │ やり直す          Ctrl+Y      [編集] │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 📁 ファイル                             │
│ ┌─────────────────────────────────────┐ │
│ │ HTMLコピー        Ctrl+S      [編集] │ │
│ │ エディタクリア    Ctrl+K      [編集] │ │
│ │ プレビュー        Ctrl+O      [編集] │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ...                                     │
│                                         │
│ [すべてデフォルトにリセット]            │
│                                         │
│              [キャンセル]  [保存]       │
└─────────────────────────────────────────┘
```

### 8.2 ショートカット編集ダイアログ

```
┌─────────────────────────────────┐
│ ショートカットを編集             │
├─────────────────────────────────┤
│                                 │
│ 機能: 元に戻す                  │
│                                 │
│ 現在のショートカット: Ctrl+Z    │
│                                 │
│ 新しいショートカット:           │
│ ┌─────────────────────────────┐ │
│ │ [キーを押してください...]   │ │
│ └─────────────────────────────┘ │
│                                 │
│ ⚠️ このショートカットは既に     │
│    「やり直す」で使用されています│
│                                 │
│ [キャンセル]  [保存]            │
└─────────────────────────────────┘
```

## 9. 将来の拡張

- CodeMirrorエディタ内のショートカットもカスタマイズ可能にする
- ショートカットのインポート/エクスポート機能
- ショートカットのプリセット（Vim風、Emacs風など）
- ショートカットの検索機能
- ショートカットの使用頻度統計

## 10. 注意事項

- 既存のショートカットとの互換性を維持
- システムショートカット（Ctrl+W: ウィンドウを閉じるなど）との競合に注意
- ブラウザのデフォルトショートカットとの競合を避ける
- **`Ctrl+N`などのブラウザデフォルトショートカットを使用する場合は、確実に`preventDefault()`を呼び出す必要がある**
- イベントリスナーはキャプチャフェーズで登録するか、確実に`preventDefault()`を実行する
- アクセシビリティを考慮（キーボードのみで操作可能）

## 11. 既存の問題への対処

### 11.1 Ctrl+Nの問題

現在、`Ctrl+N`がブラウザのデフォルト動作として解釈される問題があります。

**解決策（確定）: オプションA - Ctrl+NをCtrl+Shift+Nに変更**

- **選択理由**: 実装が簡単、ブラウザとの競合を完全に回避、確実に動作する
- **変更内容**: `Ctrl+N` / `Cmd+N` → `Ctrl+M` / `Cmd+M`（`Ctrl+Shift+N`はブラウザのシークレットモードと競合するため、`Ctrl+M`に変更）
- **実装**: `app/page.tsx`のキーボードイベントハンドラーを修正
- **影響範囲**: 
  - `app/page.tsx`: キーボードイベントハンドラー
  - `components/Menu/HamburgerMenu.tsx`: メニュー表示テキスト（該当箇所があれば）
  - カスタマイズ機能実装時: デフォルトショートカット定義を`Ctrl+Shift+N`に設定

**将来の拡張**:
- カスタマイズ機能でユーザーが任意のキーに変更可能にする
- デフォルトは`Ctrl+Shift+N`、ユーザーが`Ctrl+N`に戻すことも可能（ブラウザが許可する範囲で）

**実装時の確認事項**（オプションBを選択した場合）:
- `preventDefault()`が確実に呼び出されているか
- イベントハンドラーが適切なタイミングで実行されているか
- ブラウザのデフォルト動作が阻止されているか
- 異なるブラウザ（Chrome、Firefox、Safari、Edge）で動作確認
