# エディタ設定機能 実装計画

## 📋 概要

エディタのフォントサイズ、フォントファミリーなどの設定を保存・変更できる機能を実装します。

## 🎯 実装する設定項目

### 必須項目（Phase 1）
1. **フォントサイズ**（10px, 12px, 14px, 16px, 18px, 20px, 24px）
2. **フォントファミリー**（Courier New, Monaco, Consolas, Fira Code, Source Code Pro, Menlo, Roboto Mono, 'Courier New'）
3. **行の高さ（line-height）**（1.2, 1.4, 1.6, 1.8, 2.0）
4. **タブサイズ**（2, 4, 8スペース）

### オプション項目（将来拡張）
5. 行番号の表示/非表示
6. 折りたたみ（fold）機能のON/OFF
7. 空白文字の表示
8. 自動インデント

## 🏗️ 実装アーキテクチャ

### 1. 設定の型定義 (`types/index.ts`)
```typescript
export interface EditorSettings {
  fontSize: number        // px単位（10-24）
  fontFamily: string      // フォント名
  lineHeight: number      // 倍率（1.2-2.0）
  tabSize: number         // スペース数（2, 4, 8）
}
```

### 2. 設定ストレージ (`lib/editorSettingsStorage.ts`)
- LocalStorageに設定を保存・読み込み
- デフォルト値の定義
- テーマ設定（themeStorage.ts）と同じパターンで実装

### 3. カスタムフック (`hooks/useEditorSettings.ts`)
- 設定の読み込み・保存・更新
- リアルタイムでのエディタへの適用

### 4. 設定モーダル (`components/EditorSettings/EditorSettingsModal.tsx`)
- 設定UIコンポーネント
- フォントサイズ：スライダーまたは選択式
- フォントファミリー：ドロップダウン
- 行の高さ：スライダー
- タブサイズ：ラジオボタン
- プレビュー機能（任意）

### 5. Editorコンポーネントの拡張 (`components/Editor/Editor.tsx`)
- 設定をpropsで受け取る
- CodeMirrorの`Compartment`を使用して動的にextensionsを更新
- `EditorView.theme`を設定に応じて変更

### 6. メニュー統合 (`components/Menu/HamburgerMenu.tsx`)
- 「⚙️ エディタ設定」メニュー項目を追加
- 設定モーダルを開く機能

## 📁 ファイル構成

```
slide-editor-nextjs/
├── types/
│   └── index.ts                          # EditorSettings型を追加
├── lib/
│   └── editorSettingsStorage.ts          # 新規作成
├── hooks/
│   └── useEditorSettings.ts              # 新規作成
├── components/
│   ├── Editor/
│   │   ├── Editor.tsx                    # 設定を受け取り、動的に適用
│   │   └── Editor.module.css             # （変更なし）
│   ├── EditorSettings/                   # 新規ディレクトリ
│   │   ├── EditorSettingsModal.tsx       # 新規作成
│   │   └── EditorSettingsModal.module.css # 新規作成
│   └── Menu/
│       └── HamburgerMenu.tsx             # 設定メニュー項目を追加
└── app/
    └── page.tsx                          # useEditorSettingsを使用
```

## 🔧 技術的な詳細

### CodeMirror設定の動的更新
CodeMirror 6では、`Compartment`を使用してextensionsを動的に更新できます。

```typescript
import { Compartment } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

const themeConfig = new Compartment()
const extensions = [
  // ... 他のextensions
  themeConfig.of(EditorView.theme({
    '&': {
      fontSize: '14px',
      fontFamily: 'monospace',
    },
  })),
]

// 設定変更時に更新
view.dispatch({
  effects: themeConfig.reconfigure(
    EditorView.theme({
      '&': {
        fontSize: `${settings.fontSize}px`,
        fontFamily: settings.fontFamily,
      },
    })
  ),
})
```

### 設定の保存
- LocalStorageのキー: `slideEditor_editorSettings`
- JSON形式で保存
- デフォルト値は以下の通り：

```typescript
const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  fontFamily: "'Courier New', monospace",
  lineHeight: 1.6,
  tabSize: 2,
}
```

## 📝 実装手順

### Phase 1: 基盤の構築
1. ✅ 型定義の追加（`types/index.ts`）
2. ✅ 設定ストレージの実装（`lib/editorSettingsStorage.ts`）
3. ✅ カスタムフックの実装（`hooks/useEditorSettings.ts`）

### Phase 2: UIコンポーネント
4. ✅ 設定モーダルの実装（`components/EditorSettings/EditorSettingsModal.tsx`）
5. ✅ メニューへの統合（`components/Menu/HamburgerMenu.tsx`）

### Phase 3: エディタ統合
6. ✅ Editorコンポーネントの拡張（`components/Editor/Editor.tsx`）
7. ✅ メインページでの使用（`app/page.tsx`）

### Phase 4: テスト・調整
8. ✅ 動作確認
9. ✅ スタイリング調整
10. ✅ レスポンシブ対応（必要に応じて）

## 🎨 UI/UX 設計

### 設定モーダル
- モーダル形式（既存のImageInserterModalなどと同じパターン）
- セクション分け：
  - 📝 フォント設定
  - 📏 レイアウト設定
- 各設定項目には説明を追加
- 「リセット」ボタンでデフォルトに戻す
- 「適用」ボタンで保存（即座に適用）

### メニュー項目
- HamburgerMenuの「🔗 表示」セクションに追加
- または新しい「⚙️ 設定」セクションを作成

## 🔄 既存機能への影響

- エディタの初期化時はデフォルト設定を使用
- 設定変更時はエディタを再初期化せず、extensionsを動的に更新
- テーマ機能（ダークモード）との互換性を保持

## 📚 参考実装

- `lib/themeStorage.ts` - テーマ設定の保存パターン
- `hooks/useTheme.ts` - 設定フックのパターン
- `components/ThemeToggle/ThemeToggle.tsx` - 設定UIのパターン
- `components/ImageInserter/ImageInserterModal.tsx` - モーダルのパターン

## ✨ 将来の拡張

- フォントプレビュー機能
- カスタムフォントの追加
- エディタテーマのカスタマイズ（色設定など）
- 設定のインポート/エクスポート
- 複数の設定プロファイル
