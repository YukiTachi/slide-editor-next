# Lambda関数デプロイチェックリスト

## デプロイ前の確認事項

### 1. AWS CLIの設定

- [ ] AWS CLIがインストールされている
- [ ] AWS認証情報が設定されている（`aws configure`）
- [ ] 適切なIAM権限がある（Lambda関数の更新権限）

### 2. Lambda関数の作成（初回のみ）

- [ ] AWSコンソールでLambda関数`generate-slides`を作成
- [ ] ランタイム: Node.js 18.x または 20.x
- [ ] ハンドラー: `index.handler`
- [ ] タイムアウト: 60秒に設定
- [ ] メモリ: 1024MBに設定

### 3. 環境変数の設定

- [ ] `ANTHROPIC_API_KEY`: Anthropic APIキーを設定（必須）
- [ ] `API_GATEWAY_KEY`: API Gateway認証用のキーを設定（オプション）
- [ ] `CLAUDE_MODEL`: ClaudeモデルIDを設定（オプション、デフォルト: `claude-3-5-sonnet-20241022`）
- [ ] `MAX_TOKENS`: 最大トークン数を設定（オプション、デフォルト: `8192`）

### 4. コードのデプロイ

- [ ] 依存関係をインストール（`npm install`）
- [ ] zipファイルを作成（`deploy.sh`スクリプトを使用、または手動で作成）
- [ ] AWS Lambdaにデプロイ（`deploy.sh`スクリプトを使用、またはAWS CLIで手動デプロイ）

### 5. API Gatewayの設定

- [ ] HTTP API（推奨）またはREST APIを作成
- [ ] Lambda関数`generate-slides`と統合
- [ ] ルート: `/generate-slides`、メソッド: `POST`
- [ ] CORSを有効化
- [ ] ステージをデプロイ
- [ ] エンドポイントURLを取得

### 6. フロントエンド側の設定

- [ ] `.env.local`ファイルに`NEXT_PUBLIC_LAMBDA_API_URL`を設定
- [ ] `API_GATEWAY_KEY`を設定した場合、`.env.local`に`NEXT_PUBLIC_API_KEY`を設定

## デプロイコマンド

### デプロイスクリプトを使用（推奨）

```bash
cd lambda/generate-slides
./deploy.sh
```

### 手動デプロイ

```bash
cd lambda/generate-slides
npm install
zip -r function.zip index.js node_modules/ package.json
aws lambda update-function-code \
  --function-name generate-slides \
  --zip-file fileb://function.zip
```

## デプロイ後の確認

- [ ] Lambda関数が正常にデプロイされたことを確認（AWSコンソール）
- [ ] API Gatewayのエンドポイントが正常に動作することを確認（curlまたはPostmanでテスト）
- [ ] フロントエンドからAPIを呼び出して、スライドが生成されることを確認

## トラブルシューティング

### デプロイエラー

- **権限エラー**: `aws configure`で認証情報を確認
- **関数が見つからない**: Lambda関数が作成されているか確認
- **zipファイルが大きすぎる**: Lambda関数のサイズ制限（50MB）を確認

### 実行エラー

- **タイムアウト**: Lambda関数のタイムアウト設定を確認（60秒推奨）
- **メモリ不足**: メモリ設定を1024MB以上に増やす
- **環境変数エラー**: Lambda関数の環境変数を確認

### API Gatewayエラー

- **CORSエラー**: API GatewayのCORS設定を確認
- **403 Forbidden**: `API_GATEWAY_KEY`を設定した場合、リクエストヘッダーに`x-api-key`が含まれているか確認
