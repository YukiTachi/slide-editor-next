# 表作成機能 実装計画

## 1. 概要

スライドエディタに表（テーブル）作成機能を追加します。ユーザーが行数・列数を指定して、スタイル付きのHTMLテーブルを簡単に挿入できるようにします。

### 目標
- 行数・列数を指定して表を挿入
- 複数の表スタイルから選択可能
- 既存のスライドスタイルに統合された見た目
- 直感的なUI/UX

### 背景
- WELLBEING_EVALUATION.md で重要度5（最重要）として評価されている
- Phase 4（表現力向上）の優先機能として位置づけられている
- データ表現に必須の機能

---

## 2. 技術スタック・アーキテクチャ

### 使用技術
- **フレームワーク**: Next.js (既存)
- **言語**: TypeScript
- **スタイリング**: CSS Modules (既存パターンに準拠)
- **状態管理**: React Hooks
- **ポータル**: React Portal (createPortal)

### アーキテクチャパターン
既存の画像挿入機能の実装パターンに従う:
- `ImageInserterModal` の実装パターンを参考
- `lib/imageProcessor.ts` の `insertImageToHTML` 関数パターンを参考
- モーダルUI/UXパターンを参考

---

## 3. ファイル構成

```
slide-editor-nextjs/
├── components/
│   └── TableInserter/
│       ├── TableInserterModal.tsx          # メインの表挿入モーダル
│       ├── TableInserterModal.module.css   # スタイル
│       └── TablePreview.tsx                # 表のプレビューコンポーネント（オプション）
├── lib/
│   └── tableProcessor.ts                   # 表生成・挿入ロジック
├── types/
│   └── index.ts                            # 型定義に追加
└── app/
    └── page.tsx                            # メインページに統合
```

---

## 4. データ構造・型定義

### 4.1 TypeScript型定義

`types/index.ts` に追加:

```typescript
// 表スタイルの型定義
export type TableStyle = 
  | 'simple'        // シンプル（ボーダーなし）
  | 'bordered'      // ボーダー付き
  | 'striped'       // ストライプ（交互の背景色）
  | 'highlight'     // ヘッダー強調
  | 'minimal'       // ミニマル（細いボーダー）

// 表の設定
export interface TableConfig {
  rows: number              // 行数（1-20）
  columns: number           // 列数（1-10）
  style: TableStyle         // スタイル
  hasHeader: boolean        // ヘッダー行があるか
  caption?: string          // 表のキャプション（任意）
}
```

### 4.2 表スタイル定義

`lib/tableStyles.ts` (新規ファイル):

```typescript
import type { TableStyle } from '@/types'

// 表スタイルの説明
export const TABLE_STYLE_INFO: Record<TableStyle, { name: string; description: string; icon: string }> = {
  simple: {
    name: 'シンプル',
    description: 'ボーダーなしのシンプルな表',
    icon: '📋'
  },
  bordered: {
    name: 'ボーダー付き',
    description: 'すべてのセルにボーダー',
    icon: '⬜'
  },
  striped: {
    name: 'ストライプ',
    description: '交互の背景色で見やすく',
    icon: '📊'
  },
  highlight: {
    name: 'ヘッダー強調',
    description: 'ヘッダー行を強調表示',
    icon: '📈'
  },
  minimal: {
    name: 'ミニマル',
    description: '細いボーダーでシンプル',
    icon: '📑'
  }
}
```

---

## 5. コンポーネント設計

### 5.1 TableInserterModal (メインコンポーネント)

**責務**:
- 表の設定（行数・列数・スタイル）の入力
- 表のプレビュー表示
- エディタへの表の挿入

**Props**:
```typescript
interface TableInserterModalProps {
  isOpen: boolean
  onClose: () => void
  htmlContent: string
  setHtmlContent: (content: string) => void
  editorRef?: React.RefObject<EditorHandle | null>
  onStatusUpdate?: (message: string) => void
}
```

**主な機能**:
1. 行数・列数の入力（数値入力またはスライダー）
2. 表スタイルの選択（ラジオボタンまたはカード選択）
3. ヘッダー行の有無の選択
4. キャプションの入力（任意）
5. 表のプレビュー表示
6. エディタへの挿入

### 5.2 tableProcessor (表生成ロジック)

**責務**:
- HTMLテーブルの生成
- エディタへの挿入位置の計算
- カーソル位置の更新

**API**:
```typescript
// 表のHTMLを生成
export function generateTableHTML(config: TableConfig): string

// エディタに表を挿入
export function insertTableToHTML(
  htmlContent: string,
  cursorPos: number,
  config: TableConfig
): { newContent: string; newCursorPos: number }
```

---

## 6. UI/UX設計

### 6.1 モーダルレイアウト

```
┌─────────────────────────────────────┐
│  📊 表を挿入                    [×]   │
├─────────────────────────────────────┤
│                                     │
│  行数: [3] 列数: [4]                │
│  ┌─┐ ┌─┐ ┌─┐ ┌─┐                  │
│  │ │ │ │ │ │ │ │                  │
│  └─┘ └─┘ └─┘ └─┘                  │
│                                     │
│  スタイル:                           │
│  ○ シンプル  ○ ボーダー付き          │
│  ○ ストライプ  ○ ヘッダー強調        │
│  ○ ミニマル                          │
│                                     │
│  ☑ ヘッダー行を含める                │
│                                     │
│  キャプション（任意）:                │
│  [________________]                  │
│                                     │
│  [キャンセル]  [挿入]                │
└─────────────────────────────────────┘
```

### 6.2 スタイル要件

**モーダル**:
- 既存の `ImageInserterModal` と同じスタイル
- 背景: `var(--bg-modal)`（テーマ対応）
- 角丸: `border-radius: 12px`
- 影: `box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3)`
- 最大幅: `600px`

**入力フィールド**:
- 行数・列数: 数値入力（1-20, 1-10）
- スライダーまたはステッパーで調整可能
- リアルタイムプレビュー

**スタイル選択**:
- カード形式またはラジオボタン
- アイコンと説明文を表示
- 選択中のスタイルをハイライト

**プレビュー**:
- 小さな表のプレビューを表示（オプション）
- 実際のスタイルを反映

### 6.3 アニメーション

- モーダルのフェードイン/アウト: `0.3s ease-out`
- プレビューの更新: スムーズなトランジション

---

## 7. 表のHTML生成

### 7.1 基本的な表構造

```html
<div class="slide-table-container">
  <table class="slide-table slide-table-{style}">
    <caption class="slide-table-caption">{caption}</caption>
    {headerRow}
    {dataRows}
  </table>
</div>
```

### 7.2 スタイル別のHTML例

**シンプル**:
```html
<div class="slide-table-container">
  <table class="slide-table slide-table-simple">
    <thead>
      <tr>
        <th>列1</th>
        <th>列2</th>
        <th>列3</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>データ1</td>
        <td>データ2</td>
        <td>データ3</td>
      </tr>
    </tbody>
  </table>
</div>
```

**ボーダー付き**:
```html
<div class="slide-table-container">
  <table class="slide-table slide-table-bordered">
    <!-- 同様の構造 -->
  </table>
</div>
```

### 7.3 CSSスタイル定義

`lib/slideStyleConfig.ts` または `public/css/slide-styles.css` に追加:

```css
/* 表コンテナ */
.slide-table-container {
  margin: 20px 0;
  overflow-x: auto;
}

/* 基本の表スタイル */
.slide-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 18px;
  margin: 0 auto;
}

/* シンプルスタイル */
.slide-table-simple {
  border: none;
}

.slide-table-simple th,
.slide-table-simple td {
  padding: 12px;
  text-align: left;
  border: none;
}

/* ボーダー付きスタイル */
.slide-table-bordered {
  border: 2px solid #34495e;
}

.slide-table-bordered th,
.slide-table-bordered td {
  padding: 12px;
  border: 1px solid #bdc3c7;
  text-align: left;
}

/* ストライプスタイル */
.slide-table-striped tbody tr:nth-child(even) {
  background-color: #f8f9fa;
}

/* ヘッダー強調スタイル */
.slide-table-highlight thead {
  background-color: #3498db;
  color: white;
}

.slide-table-highlight th {
  font-weight: bold;
  padding: 15px;
}

/* ミニマルスタイル */
.slide-table-minimal {
  border: 1px solid #e0e0e0;
}

.slide-table-minimal th,
.slide-table-minimal td {
  padding: 10px;
  border-bottom: 1px solid #e0e0e0;
}

/* 表のキャプション */
.slide-table-caption {
  font-size: 16px;
  color: #7f8c8d;
  margin-bottom: 10px;
  text-align: center;
  font-style: italic;
}

/* ヘッダーセル */
.slide-table th {
  font-weight: bold;
  background-color: #ecf0f1;
}

/* データセル */
.slide-table td {
  background-color: white;
}
```

---

## 8. 実装フェーズ

### Phase 1: 基盤の構築（必須機能）

**目標**: 基本的な表挿入機能を実装

#### 8.1 型定義とスタイル定義
- [ ] `types/index.ts` に型定義を追加
- [ ] `lib/tableStyles.ts` を作成し、スタイル情報を定義

#### 8.2 表生成ロジック
- [ ] `lib/tableProcessor.ts` を作成
  - [ ] `generateTableHTML()` 実装
  - [ ] `insertTableToHTML()` 実装
  - [ ] カーソル位置の計算
  - [ ] スライド内の位置検出

#### 8.3 基本UIコンポーネント
- [ ] `components/TableInserter/TableInserterModal.tsx` を作成
  - [ ] モーダルオーバーレイ
  - [ ] 行数・列数の入力
  - [ ] スタイル選択
  - [ ] ヘッダー行の選択
  - [ ] キャプション入力
  - [ ] 挿入・キャンセルボタン
  - [ ] キーボード操作（Esc: 閉じる、Enter: 挿入）

#### 8.4 スタイル
- [ ] `components/TableInserter/TableInserterModal.module.css` を作成
  - [ ] モーダルスタイル
  - [ ] 入力フィールドのスタイル
  - [ ] スタイル選択UI
  - [ ] ボタンスタイル
- [ ] `public/css/slide-styles.css` に表スタイルを追加
  - [ ] 基本の表スタイル
  - [ ] 各スタイルバリエーション

#### 8.5 メインページへの統合
- [ ] `app/page.tsx` に統合
  - [ ] `TableInserterModal` コンポーネントを追加
  - [ ] 状態管理（モーダルの開閉）

#### 8.6 メニューへの追加
- [ ] `components/Menu/HamburgerMenu.tsx` に「表を挿入」ボタンを追加
  - [ ] 「📊 表を挿入」メニュー項目
  - [ ] クリックでモーダルを開く

**確認事項**:
- モーダルが表示される
- 行数・列数を設定できる
- スタイルを選択できる
- 表がエディタに挿入される
- プレビューで正しく表示される

---

### Phase 2: プレビュー機能（重要機能）

**目標**: 表のプレビューを表示して確認できるようにする

#### 8.7 プレビューコンポーネント
- [ ] `components/TableInserter/TablePreview.tsx` を作成
  - [ ] 設定に基づいた表のプレビュー表示
  - [ ] リアルタイム更新
  - [ ] スタイルの反映

**確認事項**:
- 設定を変更するとプレビューが更新される
- すべてのスタイルが正しく表示される

---

### Phase 3: 高度な機能（オプション）

**目標**: より使いやすい機能を追加

#### 8.8 キーボードショートカット
- [ ] キーボードショートカットの追加
  - [ ] `Ctrl+T` / `Cmd+T` で表挿入モーダルを開く
  - [ ] `hooks/useKeyboardShortcuts.ts` に追加

#### 8.9 表の編集支援
- [ ] 挿入後の表の編集を容易にする
  - [ ] プレースホルダーテキストの設定
  - [ ] セル内のフォーカス位置の調整

#### 8.10 テンプレート機能
- [ ] よく使う表のテンプレート
  - [ ] 2x2、3x3などのプリセット
  - [ ] カスタムテンプレートの保存（将来の拡張）

**確認事項**:
- キーボードショートカットが機能する
- テンプレートから素早く挿入できる

---

### Phase 4: ポリッシュ（完成度向上）

**目標**: 完成度を高める

#### 8.11 アクセシビリティ
- [ ] ARIA属性の追加
  - [ ] `role="dialog"`
  - [ ] `aria-label`, `aria-labelledby`
  - [ ] `aria-describedby`
- [ ] キーボード操作の完全対応
  - [ ] Tab順序の適切な制御
  - [ ] フォーカストラップ

#### 8.12 エラーハンドリング
- [ ] 無効な入力値の処理
- [ ] エディタが利用できない場合の処理
- [ ] エッジケースの対応

#### 8.13 パフォーマンス最適化
- [ ] 不要な再レンダリングの防止
- [ ] メモ化の適用
- [ ] プレビューの最適化

#### 8.14 レスポンシブ対応
- [ ] モバイルでの表示確認
- [ ] 小さな画面でのUI調整

---

## 9. 実装の考慮事項

### 9.1 既存機能との統合

**問題**: 表がスライドのレイアウトに影響を与える可能性
**対策**: 
- 表はスライド内の通常のコンテンツとして配置
- スライドの高さに収まるように表のサイズを調整
- 必要に応じてスクロール可能にする

### 9.2 スタイルの一貫性

**問題**: 既存のスライドスタイルと表のスタイルを統一する必要がある
**対策**:
- 既存のカラーパレットを使用
- フォントサイズをスライドのスタイルに合わせる
- CSS変数を使用してテーマ対応

### 9.3 表のサイズ制限

**問題**: 大きすぎる表はスライドに収まらない
**対策**:
- 行数・列数に上限を設ける（行: 20、列: 10）
- 警告メッセージを表示
- 自動的にフォントサイズを調整（オプション）

### 9.4 カーソル位置の検出

**問題**: カーソル位置がスライド内にあるかどうかを判定する必要がある
**対策**:
- `lib/imageProcessor.ts` の `findCurrentSlide` 関数を参考
- スライド内にいない場合は最後のスライドの後に追加

### 9.5 テーマ対応

**問題**: ダークモード・ライトモードに対応する必要がある
**対策**:
- CSS変数（`var(--bg-modal)` など）を使用
- 既存のテーマシステムを活用
- 表のスタイルもテーマに応じて変更

---

## 10. テスト計画

### 10.1 単体テスト（オプション）

- `tableProcessor.ts` の各関数
- 表のHTML生成ロジック

### 10.2 統合テスト（手動確認）

- [ ] モーダルが正しく開閉する
- [ ] 行数・列数を設定できる
- [ ] すべてのスタイルが正しく表示される
- [ ] 表がエディタに正しく挿入される
- [ ] カーソル位置が正しく更新される
- [ ] プレビューで正しく表示される
- [ ] ヘッダー行の有無が正しく反映される
- [ ] キャプションが正しく表示される
- [ ] キーボード操作が機能する
- [ ] レスポンシブに対応している
- [ ] テーマ（ダーク/ライト）に対応している

---

## 11. 今後の拡張案

### 11.1 表の編集機能

- 挿入後の表を編集可能にする
- 行・列の追加・削除
- セルの結合・分割

### 11.2 表のスタイルカスタマイズ

- ユーザーが独自のスタイルを定義
- 色のカスタマイズ
- フォントサイズの調整

### 11.3 CSVからのインポート

- CSVファイルから表を生成
- Excelからのコピー&ペースト対応

### 11.4 表テンプレート

- よく使う表のテンプレートを保存
- テンプレートの共有機能

### 11.5 表のエクスポート

- 表を画像としてエクスポート
- 表をCSVとしてエクスポート

---

## 12. 実装の優先順位

### 必須（Phase 1）
✅ 基本的な表挿入機能
✅ 行数・列数の設定
✅ スタイル選択
✅ エディタへの挿入

### 推奨（Phase 2）
✅ プレビュー機能
✅ メニューからのアクセス

### オプション（Phase 3-4）
✅ キーボードショートカット
✅ アクセシビリティ強化
✅ パフォーマンス最適化
✅ エラーハンドリング強化

---

## 13. 実装開始前の確認事項

- [ ] 既存のコードベースの理解
- [ ] 画像挿入機能の実装パターンの確認
- [ ] モーダル実装パターンの確認
- [ ] スタイリングパターンの確認
- [ ] 実装環境の準備

---

## 14. 参考資料

### 既存実装の参考
- `components/ImageInserter/ImageInserterModal.tsx` - モーダル実装パターン
- `lib/imageProcessor.ts` - エディタへの挿入ロジック
- `lib/slideStyleConfig.ts` - スタイル定義パターン
- `components/Menu/HamburgerMenu.tsx` - メニュー統合パターン

### 外部リソース（参考用）
- HTML Table要素の仕様
- CSS Tableスタイリングのベストプラクティス

---

## 15. 変更履歴

- 2025-12-20: 初版作成

---

**注意**: この計画は実装の指針です。実装中に発見された問題や要件変更に応じて柔軟に調整してください。

