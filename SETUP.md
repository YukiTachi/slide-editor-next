# Next.js移行 - セットアップガイド

## 🚀 クイックスタート

### 1. 依存関係のインストール

```bash
cd slide-editor-nextjs
npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 📁 現在の実装状況

### ✅ 完了した機能

- [x] プロジェクトセットアップ（Next.js 14 + TypeScript）
- [x] 基本的なレイアウト構造
- [x] エディタコンポーネント（基本的なHTMLエディタ）
- [x] プレビューコンポーネント（iframeベース）
- [x] ハンバーガーメニューUI
- [x] ステータスバー
- [x] スライドテンプレート管理（基本）

### 🚧 実装が必要な機能

- [ ] パネルリサイズ機能
- [ ] 自動保存機能（useAutoSaveフック）
- [ ] 画像挿入機能（ImageInserterコンポーネント）
- [ ] スライド追加機能
- [ ] キーボードショートカット
- [ ] 画像管理機能
- [ ] Base64変換機能
- [ ] 別ウィンドウプレビュー

## 🔄 次のステップ

### Phase 1: コア機能の実装

1. **パネルリサイズ機能**
   - `hooks/useResize.ts` を作成
   - EditorとPreviewコンポーネントに統合

2. **自動保存機能**
   - `hooks/useAutoSave.ts` を作成
   - LocalStorageとの連携
   - 復元機能

3. **状態管理の改善**
   - Context APIまたはZustandの導入
   - グローバル状態の管理

### Phase 2: 画像機能の実装

1. **画像挿入コンポーネント**
   - `components/ImageInserter/ImageInserter.tsx`
   - ファイル選択、URL入力、ドラッグ&ドロップ

2. **画像管理**
   - `components/ImageInserter/ImageManager.tsx`
   - LocalStorageでの画像保存

3. **画像処理ユーティリティ**
   - `lib/imageProcessor.ts`
   - Base64変換、外部ファイル参照変換

### Phase 3: スライド管理機能

1. **スライド追加機能**
   - テンプレートからの新規スライド作成
   - ページ番号の自動更新

2. **スライド操作**
   - スライドの削除
   - スライドの並び替え（将来）

## 🛠️ 開発のヒント

### コンポーネントの追加

新しいコンポーネントを追加する場合：

```typescript
// components/NewComponent/NewComponent.tsx
'use client'

interface NewComponentProps {
  // propsの型定義
}

export default function NewComponent({ ...props }: NewComponentProps) {
  // コンポーネントの実装
}
```

### カスタムフックの作成

```typescript
// hooks/useCustomHook.ts
import { useState, useEffect } from 'react'

export function useCustomHook() {
  const [state, setState] = useState()
  
  useEffect(() => {
    // 副作用の処理
  }, [])
  
  return { state, setState }
}
```

### スタイリング

- CSS Modulesを使用（`.module.css`）
- グローバルスタイルは `styles/globals.css`
- Tailwind CSSの導入も検討可能

## 📦 ビルドとデプロイ

### 開発ビルド

```bash
npm run build
npm start
```

### 静的エクスポート（Nginx環境用）

`next.config.js` で `output: 'export'` を有効にした後：

```bash
npm run export
```

出力は `out/` ディレクトリに生成されます。

## 🔍 トラブルシューティング

### 型エラーが発生する場合

```bash
npm install --save-dev @types/node @types/react @types/react-dom
```

### ビルドエラーが発生する場合

```bash
rm -rf .next node_modules
npm install
npm run build
```

## 📚 参考リソース

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

