# Lambda関数: generate-slides

Claude APIを使用してスライドHTMLを生成するAWS Lambda関数です。

## 前提条件

- AWSアカウント
- AWS CLIがインストールされ、認証情報が設定されていること
- Node.js 18.x、20.x または 24.x

## デプロイ手順

### 1. 初回デプロイ（Lambda関数の作成）

AWSコンソールでLambda関数を作成する必要があります：

1. [AWS Lambdaコンソール](https://console.aws.amazon.com/lambda/)にアクセス
2. 「関数の作成」をクリック
3. 以下の設定で関数を作成：
   - **関数名**: `generate-slides`
   - **ランタイム**: Node.js 18.x、20.x または 24.x
   - **アーキテクチャ**: x86_64
   - **ハンドラー**: `index.handler`
   - **実行ロール**: 新しいロールを作成（基本的なLambda権限）

### 2. Lambda関数の設定

#### タイムアウトとメモリの設定

1. Lambda関数の「設定」タブ > 「一般設定」 > 「編集」
2. 以下の設定を変更：
   - **タイムアウト**: 60秒（推奨）
   - **メモリ**: 1024MB（推奨）

#### 環境変数の設定

1. Lambda関数の「設定」タブ > 「環境変数」 > 「編集」
2. 以下の環境変数を追加：

   - `ANTHROPIC_API_KEY`（必須）: Anthropic APIキー
   - `API_GATEWAY_KEY`（オプション）: API Gateway認証用のキー
   - `ALLOWED_ORIGINS`（オプション）: 許可するオリジン（カンマ区切り）。例: `https://example.com,http://localhost:3000`。末尾に `*` でプレフィックス一致（例: `https://*.example.com`）。未設定時は全オリジン許可
   - `CLAUDE_MODEL`（オプション）: ClaudeモデルID（デフォルト: `claude-3-5-sonnet-20241022`）。例: Haiku 4.5 は `claude-haiku-4-5-20251001`
   - `MAX_TOKENS`（オプション）: 最大トークン数（デフォルト: `8192`）

### 3. コードのデプロイ

デプロイ前に、AWS CLI の認証設定を行ってください。未設定の場合は `aws lambda update-function-code` が失敗します。

```bash
aws configure
```

表示に従って **AWS Access Key ID**、**AWS Secret Access Key**、**Default region name**（例: 東京なら `ap-northeast-1`）を入力します。認証情報は IAM ユーザーの「セキュリティ認証情報」からアクセスキーを作成して取得できます。一度設定すれば、同じ環境では再度の入力は不要です。

#### 方法1: デプロイスクリプトを使用（推奨）

```bash
cd lambda/generate-slides
chmod +x deploy.sh
./deploy.sh
```

または、関数名を指定：

```bash
./deploy.sh generate-slides
```

#### 方法2: 手動でデプロイ

```bash
cd lambda/generate-slides

# 依存関係のインストール
npm install

# zipファイルの作成
zip -r function.zip index.js node_modules/ package.json

# AWS CLIでデプロイ
aws lambda update-function-code \
  --function-name generate-slides \
  --zip-file fileb://function.zip
```

#### 方法3: AWSコンソールからアップロード

1. zipファイルを作成（上記の手順）
2. Lambda関数の「コード」タブ > 「アップロード元」 > 「.zipファイル」を選択
3. 作成した`function.zip`をアップロード

### 4. API Gatewayの設定

#### HTTP API（推奨）の作成

1. [API Gatewayコンソール](https://console.aws.amazon.com/apigateway/)にアクセス
2. 「HTTP API」を選択 > 「構築」
3. 「統合」でLambda関数を選択
4. Lambda関数: `generate-slides`を選択
5. 「次へ」をクリック
6. ルート設定：
   - メソッド: `POST`
   - リソースパス: `/generate-slides`
7. 「次へ」をクリック
8. CORS設定を有効化：
   - Access-Control-Allow-Origin: `*`（または特定のドメイン）
   - Access-Control-Allow-Headers: `Content-Type, x-api-key`
   - Access-Control-Allow-Methods: `POST, OPTIONS`
9. 「次へ」をクリック
10. ステージ名を入力（例: `prod`）
11. 「作成」をクリック
12. エンドポイントURLをコピー（例: `https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/generate-slides`）

#### REST APIを使用する場合（非推奨）

REST APIはデフォルトで29秒のタイムアウトがあるため、Lambda関数のタイムアウトを29秒以下に調整する必要があります。

### 5. 環境変数の設定（フロントエンド側）

フロントエンド側の`.env.local`ファイルに、API GatewayのエンドポイントURLを設定：

```bash
# slide-editor-nextjs/.env.local
NEXT_PUBLIC_LAMBDA_API_URL=https://your-api-id.execute-api.region.amazonaws.com/prod/generate-slides
NEXT_PUBLIC_API_KEY=your-api-key-here  # API_GATEWAY_KEYを設定した場合のみ必要
```

## トラブルシューティング

### デプロイエラー

- **権限エラー**: AWS CLIの認証情報を確認してください
- **関数が見つからない**: Lambda関数が作成されているか確認してください
- **zipファイルが大きすぎる**: `node_modules`を削除して、Lambda Layerを使用することを検討してください

### 実行エラー

- **タイムアウト**: Lambda関数のタイムアウト設定を確認してください（60秒推奨）
- **メモリ不足**: メモリ設定を1024MB以上に増やしてください
- **環境変数エラー**: Lambda関数の環境変数に`ANTHROPIC_API_KEY`が設定されているか確認してください

### API Gatewayエラー

- **CORSエラー**: API GatewayのCORS設定を確認してください
- **403 Forbidden**: `API_GATEWAY_KEY`を設定した場合、リクエストヘッダーに`x-api-key`が含まれているか確認してください

## ファイル構成

```
lambda/generate-slides/
├── index.js          # Lambda関数のメインコード
├── package.json      # 依存関係
├── deploy.sh         # デプロイスクリプト
└── README.md         # このファイル
```

## セキュリティに関する注意事項

- **APIキーは絶対にGitにコミットしない**: `.env.local`や環境変数で管理してください
- **APIキーをコードに直接書かない**: ハードコードは絶対に避けてください
- **API Gateway認証**: `API_GATEWAY_KEY`を設定して、不正なアクセスを防ぐことを推奨します
