#!/bin/bash

# Lambda関数のデプロイスクリプト
# 使用方法: ./deploy.sh [function-name]

set -e

FUNCTION_NAME=${1:-generate-slides}
ZIP_FILE="function.zip"

echo "Lambda関数のデプロイを開始します..."
echo "関数名: $FUNCTION_NAME"

# 依存関係のインストール
echo "依存関係をインストール中..."
npm install

# 既存のzipファイルを削除
if [ -f "$ZIP_FILE" ]; then
  echo "既存のzipファイルを削除中..."
  rm "$ZIP_FILE"
fi

# zipファイルの作成
echo "zipファイルを作成中..."
zip -r "$ZIP_FILE" index.js node_modules/ package.json

# AWS CLIでデプロイ
echo "AWS Lambdaにデプロイ中..."
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file "fileb://$ZIP_FILE"

echo "デプロイが完了しました！"

# zipファイルを削除（オプション）
read -p "zipファイルを削除しますか？ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  rm "$ZIP_FILE"
  echo "zipファイルを削除しました。"
fi
