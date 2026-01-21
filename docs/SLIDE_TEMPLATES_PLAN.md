# 複数のスライドテンプレート機能 実装計画

## 📋 概要

新しいスライドを追加する際に、複数のテンプレートから選択できる機能を実装します。これにより、ユーザーは用途に応じた最適なレイアウトでスライドを作成できます。

## 🎯 実装するテンプレート

### Phase 1: 基本的なテンプレート（必須）
1. **標準テンプレート**（既存）
   - タイトル、サブタイトル、リスト形式
   - 現在の`getNewSlideTemplate()`の内容

2. **タイトルページテンプレート**
   - 大きなタイトルとサブタイトル
   - プレゼンテーションの開始ページ用

3. **2カラムテンプレート**
   - 左右にコンテンツを配置
   - 比較や対比に適している

4. **画像+テキストテンプレート**
   - 画像とテキストの組み合わせ
   - 説明や解説に適している

5. **クォートテンプレート**
   - 引用や強調メッセージ用
   - 中央配置の大きなテキスト

### Phase 2: 拡張テンプレート（将来）
6. 表テンプレート
7. タイムラインテンプレート
8. プロセスフローテンプレート
9. サマリーテンプレート

## 🏗️ アーキテクチャ設計

### 1. テンプレートの型定義（`types/index.ts`）
```typescript
export interface SlideTemplate {
  id: string              // テンプレートID（一意）
  name: string            // テンプレート名（表示用）
  description: string     // 説明文
  icon: string            // アイコン（絵文字またはアイコン名）
  category: 'basic' | 'layout' | 'special'  // カテゴリ
  html: string            // HTMLテンプレート
  preview?: string        // プレビュー用の短縮版（任意）
}
```

### 2. テンプレート管理（`lib/slideTemplates.ts`の拡張）
- 定義済みテンプレートのリスト
- テンプレートの取得メソッド
- テンプレートのカテゴリ別フィルタリング
- カスタムテンプレートの追加・削除（将来拡張）

### 3. テンプレートストレージ（`lib/slideTemplateStorage.ts`）
- カスタムテンプレートの保存・読み込み（LocalStorage）
- ユーザーが作成したテンプレートの管理
- デフォルトテンプレートとの分離

### 4. テンプレート選択モーダル（`components/SlideTemplateSelector/SlideTemplateSelectorModal.tsx`）
- テンプレート一覧の表示（グリッドまたはリスト）
- カテゴリフィルタ
- テンプレートのプレビュー表示（任意）
- 選択と適用

### 5. メニュー統合
- ハンバーガーメニューの「スライド追加」を「テンプレートからスライド追加」に変更
- または「テンプレートからスライド追加」を新規追加

## 📁 ファイル構成

```
slide-editor-nextjs/
├── types/
│   └── index.ts                          # SlideTemplate型を追加
├── lib/
│   ├── slideTemplates.ts                 # 拡張（テンプレート定義を追加）
│   └── slideTemplateStorage.ts           # 新規作成（カスタムテンプレート管理）
├── components/
│   ├── SlideTemplateSelector/            # 新規ディレクトリ
│   │   ├── SlideTemplateSelectorModal.tsx
│   │   └── SlideTemplateSelectorModal.module.css
│   └── Menu/
│       └── HamburgerMenu.tsx             # テンプレート選択機能を追加
└── app/
    └── page.tsx                          # （変更なし、HamburgerMenu経由）
```

## 🔧 実装詳細

### テンプレート定義の構造

```typescript
export const DEFAULT_TEMPLATES: SlideTemplate[] = [
  {
    id: 'standard',
    name: '標準',
    description: 'タイトル、サブタイトル、リスト形式の標準的なスライド',
    icon: '📄',
    category: 'basic',
    html: `...現在のgetNewSlideTemplate()の内容...`
  },
  {
    id: 'title-page',
    name: 'タイトルページ',
    description: 'プレゼンテーションの開始ページ用',
    icon: '📋',
    category: 'basic',
    html: `...タイトルページのHTML...`
  },
  // ... 他のテンプレート
]
```

### テンプレート選択のフロー

1. ユーザーが「テンプレートからスライド追加」をクリック
2. テンプレート選択モーダルが開く
3. テンプレート一覧を表示（カテゴリでフィルタ可能）
4. ユーザーがテンプレートを選択
5. 選択したテンプレートのHTMLを取得
6. カーソル位置にスライドを挿入
7. ページ番号を更新
8. モーダルを閉じる

### 既存機能との統合

- `SlideTemplates.getNewSlideTemplate()`はデフォルトテンプレート（'standard'）を返すように変更
- 新しいメソッド `SlideTemplates.getTemplate(templateId: string)` を追加
- 既存の`addSlide()`関数は互換性を保つため、デフォルトテンプレートを使用

## 📝 実装手順

### Phase 1: 基盤の構築
1. ✅ 型定義の追加（`types/index.ts`）
2. ✅ テンプレート定義の拡張（`lib/slideTemplates.ts`）
3. ✅ テンプレート選択モーダルの実装（`components/SlideTemplateSelector/SlideTemplateSelectorModal.tsx`）
4. ✅ メニューへの統合（`components/Menu/HamburgerMenu.tsx`）

### Phase 2: 機能拡張（将来）
5. カスタムテンプレートの保存機能
6. テンプレートのプレビュー表示
7. テンプレートの編集機能
8. テンプレートのインポート/エクスポート

## 🎨 UI/UX 設計

### テンプレート選択モーダル
- **レイアウト**: グリッド表示（2列または3列）
- **各テンプレートカード**:
  - アイコン（絵文字）
  - テンプレート名
  - 説明文（短い）
  - ホバー時: 詳細表示またはプレビュー
- **カテゴリフィルタ**: タブまたはドロップダウン（基本、レイアウト、特別）
- **検索機能**: （将来拡張）テンプレート名で検索
- **「標準」をデフォルト選択**: クイックアクセス用

### メニュー項目
- オプション1: 「スライド追加」を「テンプレートからスライド追加」に変更
- オプション2: 「スライド追加」はそのまま、新しく「テンプレートからスライド追加」を追加
  - **推奨**: オプション2（既存の動作を維持しつつ、新機能を追加）

## ✨ 実装するテンプレートの詳細

### 1. 標準テンプレート（既存）
```html
<div class="slide">
    <h1>新しいスライド</h1>
    <h2>サブタイトル</h2>
    <ul>
        <li><span class="highlight">ポイント1</span> - 説明</li>
        <li><span class="highlight">ポイント2</span> - 説明</li>
        <li><span class="highlight">ポイント3</span> - 説明</li>
    </ul>
    <p>追加の説明...</p>
    <div class="footer">PAGE_NUMBER_PLACEHOLDER</div>
</div>
```

### 2. タイトルページテンプレート
```html
<div class="slide">
    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%;">
        <h1 style="font-size: 48px; margin-bottom: 20px;">プレゼンテーションタイトル</h1>
        <h2 style="font-size: 32px; color: #7f8c8d; margin-bottom: 40px;">サブタイトル</h2>
        <p style="font-size: 20px; color: #95a5a6;">日付や著者名などをここに記入</p>
    </div>
    <div class="footer">PAGE_NUMBER_PLACEHOLDER</div>
</div>
```

### 3. 2カラムテンプレート
```html
<div class="slide">
    <h1>タイトル</h1>
    <div class="split">
        <div class="left">
            <h2>左側のコンテンツ</h2>
            <ul>
                <li>項目1</li>
                <li>項目2</li>
                <li>項目3</li>
            </ul>
        </div>
        <div class="right">
            <h2>右側のコンテンツ</h2>
            <ul>
                <li>項目A</li>
                <li>項目B</li>
                <li>項目C</li>
            </ul>
        </div>
    </div>
    <div class="footer">PAGE_NUMBER_PLACEHOLDER</div>
</div>
```

### 4. 画像+テキストテンプレート
```html
<div class="slide">
    <h1>タイトル</h1>
    <div class="split">
        <div class="left">
            <h2>説明</h2>
            <p>ここに画像の説明や詳細な情報を記入してください。</p>
            <ul>
                <li>ポイント1</li>
                <li>ポイント2</li>
            </ul>
        </div>
        <div class="right">
            <p style="text-align: center; color: #95a5a6;">
                🖼️ ここに画像を挿入<br>
                <small>画像を挿入すると自動的に配置されます</small>
            </p>
        </div>
    </div>
    <div class="footer">PAGE_NUMBER_PLACEHOLDER</div>
</div>
```

### 5. クォートテンプレート
```html
<div class="slide">
    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80%; padding: 40px;">
        <p style="font-size: 36px; font-style: italic; text-align: center; line-height: 1.6; color: #2c3e50;">
            "重要な引用やメッセージをここに記入してください。"
        </p>
        <p style="font-size: 24px; margin-top: 40px; color: #7f8c8d; text-align: right; width: 100%;">
            — 引用元や著者名
        </p>
    </div>
    <div class="footer">PAGE_NUMBER_PLACEHOLDER</div>
</div>
```

## 🔄 既存機能への影響

- **互換性の維持**: 既存の`getNewSlideTemplate()`は引き続き動作（標準テンプレートを返す）
- **既存のコード**: `HamburgerMenu`や`page.tsx`の既存のスライド追加機能は影響を受けない
- **拡張性**: 将来的にカスタムテンプレート機能を追加しやすい設計

## 📚 参考実装

- `components/EditorSettings/EditorSettingsModal.tsx` - モーダルの実装パターン
- `components/ProjectManager/ProjectManagerModal.tsx` - リスト表示のパターン
- `lib/editorSettingsStorage.ts` - 設定保存のパターン（将来のカスタムテンプレート用）

## 🎯 成功基準

- [ ] 5種類のテンプレートが実装されている
- [ ] テンプレート選択モーダルが表示される
- [ ] 選択したテンプレートでスライドが追加される
- [ ] 既存のスライド追加機能が正常に動作する
- [ ] ページ番号が正しく更新される
- [ ] ダークモードで正常に表示される
