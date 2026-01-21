# チュートリアルを再表示する方法

## 方法1: ブラウザの開発者ツールを使用（推奨）

1. ブラウザで `F12` または `Ctrl+Shift+I` (Mac: `Cmd+Option+I`) を押して開発者ツールを開く
2. **Application** タブ（または **ストレージ** タブ）を選択
3. 左側のメニューから **Local Storage** → `http://localhost:3000`（または使用中のURL）を選択
4. キー一覧から `slideEditor_tutorialState` を探す
5. 以下のいずれかの方法でリセット：

### オプションA: 値を削除する
- `slideEditor_tutorialState` を選択して **Delete** キーを押す、または右クリック → **Delete**

### オプションB: 値を更新する
- `slideEditor_tutorialState` をダブルクリックして編集
- 値を以下に変更：
```json
{"completed":false,"skipped":false,"currentStep":0,"completedSteps":[]}
```

6. ページをリロード（`F5` または `Ctrl+R`）

## 方法2: ブラウザのコンソールを使用

1. ブラウザで `F12` を押して開発者ツールを開く
2. **Console** タブを選択
3. 以下のコマンドを実行：

```javascript
// チュートリアル状態をリセット
localStorage.setItem('slideEditor_tutorialState', JSON.stringify({
  completed: false,
  skipped: false,
  currentStep: 0,
  completedSteps: []
}));

// ページをリロード
location.reload();
```

## 方法3: メニューから再表示（実装済み）

ハンバーガーメニュー（右上の三本線アイコン）→ **⚙️ 設定** → **📖 チュートリアルを表示** をクリック

この方法は、チュートリアルを手動で開くだけです（自動表示は行われません）。

## LocalStorageのキー情報

- **キー名**: `slideEditor_tutorialState`
- **データ形式**: JSON文字列

### データ構造

```typescript
{
  completed: boolean,        // 完了フラグ
  skipped: boolean,          // スキップフラグ
  currentStep: number,       // 現在のステップ番号（0始まり）
  completedSteps: number[],  // 完了したステップの番号配列
  lastShown?: string         // 最後に表示した日時（ISO文字列、オプション）
}
```

### チュートリアルを表示するための条件

- `completed` が `false` であること
- `skipped` が `false` であること

両方が `false` の場合、初回訪問時と同様に自動表示されます。

## トラブルシューティング

### チュートリアルが表示されない場合

1. localStorageの値を確認：
```javascript
console.log(localStorage.getItem('slideEditor_tutorialState'));
```

2. 完全に削除してからリロード：
```javascript
localStorage.removeItem('slideEditor_tutorialState');
location.reload();
```

3. URLパラメータで強制表示：
```
http://localhost:3000?tutorial=true
```

---

**注意**: localStorageの値を変更した後は、ページのリロードが必要です。
