#!/bin/bash
# API Gateway エンドポイントの動作確認スクリプト
# 使い方: ./verify-api.sh <エンドポイントURL>
# 例: ./verify-api.sh https://wvhu365c68.execute-api.ap-northeast-1.amazonaws.com/production/generate-slides

API_URL="${1:?Usage: $0 <API_ENDPOINT_URL>}"

echo "エンドポイント: $API_URL"
echo "テストリクエストを送信しています...（最大90秒待機）"
echo ""

# API Key が設定されていれば -H を追加
# --max-time 90: Lambda コールドスタート・処理時間を考慮
CURL_OPTS=(-s -w "\n%{http_code}" --max-time 90 -X POST "$API_URL" -H "Content-Type: application/json")
if [ -n "$NEXT_PUBLIC_API_KEY" ]; then
  CURL_OPTS+=(-H "x-api-key: $NEXT_PUBLIC_API_KEY")
fi

RESPONSE=$(curl "${CURL_OPTS[@]}" -d '{
    "theme": "テストテーマ",
    "content": "これは動作確認用の短い内容です。",
    "chapters": ["はじめに", "まとめ"]
  }' 2>&1) || true

HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo "HTTP ステータス: ${HTTP_CODE:-（なし）}"
echo ""

# curl が接続失敗・タイムアウトした場合（HTTP_CODE が空または 000）
if [ -z "$HTTP_CODE" ] || [ "$HTTP_CODE" = "000" ]; then
  echo "接続エラー: API に届いていません。"
  echo "考えられる原因: ネットワーク不可、タイムアウト、URL 誤り、ファイアウォール/プロキシ。"
  echo "curl の出力: $HTTP_BODY"
  exit 1
fi

if [ "$HTTP_CODE" = "200" ]; then
  if echo "$HTTP_BODY" | grep -q '"html"'; then
    echo "OK: API は正常に応答し、HTML が返されました。"
    echo "（先頭 200 文字）: ${HTTP_BODY:0:200}..."
  else
    echo "警告: 200 ですがレスポンスに html が含まれていません。"
    echo "$HTTP_BODY"
  fi
else
  echo "エラー: 期待する 200 ではありません（HTTP $HTTP_CODE）。"
  echo "レスポンス: $HTTP_BODY"
  exit 1
fi
