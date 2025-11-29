# Next.jsキャッシュクリア方法

## PDFエクスポートメニューが表示されない場合の対処法

### 手順1: 開発サーバーを停止

```bash
cd /usr/share/nginx/html/slide-editor-nextjs

# Next.jsプロセスを検索して停止
for pid in $(ls /proc | grep -E '^[0-9]+$'); do
  if [ -r /proc/$pid/cmdline ]; then
    cmdline=$(cat /proc/$pid/cmdline 2>/dev/null | tr '\0' ' ')
    if echo "$cmdline" | grep -q "next dev"; then
      kill -15 $pid 2>/dev/null
    fi
  fi
done
```

### 手順2: ビルドキャッシュをクリア

```bash
cd /usr/share/nginx/html/slide-editor-nextjs

# .nextフォルダを削除
rm -rf .next
```

### 手順3: 開発サーバーを再起動

```bash
cd /usr/share/nginx/html/slide-editor-nextjs
npm run dev
```

### 手順4: ブラウザのキャッシュをクリア

1. **開発者ツールを開く**（F12 または Ctrl+Shift+I / Cmd+Option+I）
2. **ネットワークタブ**を開く
3. **「Disable cache」**にチェックを入れる
4. **ページをリロード**（F5 または Ctrl+R / Cmd+R）
5. または、**スーパーリロード**（Ctrl+Shift+R / Cmd+Shift+R）

## ワンライナーで実行

```bash
cd /usr/share/nginx/html/slide-editor-nextjs && \
for pid in $(ls /proc | grep -E '^[0-9]+$'); do \
  if [ -r /proc/$pid/cmdline ]; then \
    cmdline=$(cat /proc/$pid/cmdline 2>/dev/null | tr '\0' ' '); \
    if echo "$cmdline" | grep -q "next dev"; then \
      kill -15 $pid 2>/dev/null; \
    fi; \
  fi; \
done && \
sleep 2 && \
rm -rf .next && \
echo "キャッシュをクリアしました。npm run dev で再起動してください。"
```

## 確認方法

1. ブラウザで http://localhost:3000 にアクセス
2. ハンバーガーメニューを開く
3. 「📄 エクスポート」セクションに「📄 PDFエクスポート」ボタンが表示されることを確認

