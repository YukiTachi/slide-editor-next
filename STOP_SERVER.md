# Next.js開発サーバーの停止方法

## ターミナルが残っていない場合の停止方法

### 方法1: Next.jsプロセスを検索して停止（この環境で推奨）

```bash
cd /usr/share/nginx/html/slide-editor-nextjs

# Next.jsプロセスを検索
for pid in $(ls /proc | grep -E '^[0-9]+$'); do
  if [ -r /proc/$pid/cmdline ]; then
    cmdline=$(cat /proc/$pid/cmdline 2>/dev/null | tr '\0' ' ')
    if echo "$cmdline" | grep -q "next dev"; then
      echo "PID: $pid - $cmdline"
    fi
  fi
done

# プロセスIDが表示されたら、停止（まずは正常終了を試みる）
kill -15 <プロセスID>

# 正常終了しない場合は強制終了
kill -9 <プロセスID>
```

### 方法2: サーバーの状態を確認してから停止

```bash
cd /usr/share/nginx/html/slide-editor-nextjs

# サーバーが実行中か確認
curl -s http://localhost:3000 > /dev/null 2>&1 && echo "サーバーは実行中です" || echo "サーバーは停止しています"

# 実行中の場合は、プロセスを検索して停止
```

### 方法3: ワンライナーで停止

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

# 2秒待ってから確認
sleep 2
curl -s http://localhost:3000 > /dev/null 2>&1 && echo "まだ実行中です（kill -9が必要かもしれません）" || echo "停止しました"
```

### 方法4: ポート3000を使用しているプロセスを停止（lsofが使える場合）

```bash
# ポート3000を使用しているプロセスIDを取得
lsof -ti:3000

# プロセスIDが取得できた場合、そのIDで停止
kill -15 <プロセスID>
# または強制終了
kill -9 <プロセスID>
```

## 確認方法

サーバーが停止したか確認するには：

```bash
# サーバーに接続を試みる
curl -s http://localhost:3000 > /dev/null 2>&1 && echo "サーバーは実行中です" || echo "サーバーは停止しています"

# または、ブラウザで http://localhost:3000 にアクセス
# 接続できない場合は停止しています
```

## 注意事項

- `kill -15`は正常終了シグナル（SIGTERM）で、まずはこちらを試してください
- `kill -9`は強制終了（SIGKILL）で、データが保存されていない場合があります
- プロセスIDを確認してから、個別に停止することを推奨します
- 親プロセスを停止すると、子プロセスも自動的に停止します
