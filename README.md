# スライドエディタ - Next.js版

Next.jsで再構築されたスライドエディタです。

## 🚀 セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 📦 ビルド

```bash
# プロダクションビルド
npm run build

# 静的エクスポート（Nginx環境で使用する場合）
npm run export
```

## 🏗️ プロジェクト構造

```
slide-editor-nextjs/
├── app/                    # Next.js App Router
├── components/             # Reactコンポーネント
├── hooks/                  # カスタムフック
├── lib/                    # ユーティリティ関数
├── types/                  # TypeScript型定義
└── styles/                 # グローバルスタイル
```

## 🔄 移行状況

- [x] プロジェクトセットアップ
- [ ] エディタコンポーネント
- [ ] プレビューコンポーネント
- [ ] 自動保存機能
- [ ] 画像挿入機能
- [ ] スライドテンプレート管理

詳細は [MIGRATION_PLAN.md](../slide-editor/MIGRATION_PLAN.md) を参照してください。

