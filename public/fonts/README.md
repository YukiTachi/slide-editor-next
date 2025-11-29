# 日本語フォントファイルの配置

PDFエクスポート機能で日本語を正しく表示するために、以下のフォントファイルを配置してください。

## 推奨フォント: Noto Sans JP

### ダウンロード方法

1. Google FontsからNoto Sans JPをダウンロード
   - URL: https://fonts.google.com/noto/specimen/Noto+Sans+JP
   - 「Download family」をクリックしてZIPファイルをダウンロード

2. 以下のファイルを `public/fonts/` フォルダに配置：
   - `NotoSansJP-Regular.ttf` (通常)
   - `NotoSansJP-Bold.ttf` (太字) - オプション

### 代替方法

フォントファイルを配置しない場合、Google Fontsから自動的に読み込まれますが、
**外部アクセスが必要**になります（クライアントサイドのみで完結させる要件に反する可能性があります）。

### 注意事項

- フォントファイルは大きいため（数MB）、ダウンロードに時間がかかる場合があります
- フォントファイルを配置することで、完全にクライアントサイドのみで完結します

