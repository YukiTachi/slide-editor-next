# 警告・エラー詳細表示パネル 実装計画

## 1. 概要

現在、StatusBarには警告・エラーの件数のみが表示されており、詳細を確認する機能がありません。この実装計画では、警告・エラーの詳細を一覧表示し、該当行にジャンプできるパネル（モーダル）を追加します。

## 2. 現状の実装状況

### 2.1 既存の実装
- **StatusBarコンポーネント**: 警告・エラーの件数のみ表示
  - `エラー: X件、警告: Y件` の形式で表示
  - クリック時の動作は未実装
- **ValidationError型**: 以下の情報を含む
  ```typescript
  {
    line: number        // 行番号
    column?: number     // カラム番号（オプション）
    type: 'error' | 'warning'  // エラーまたは警告
    message: string     // エラーメッセージ
    code: string        // エラーコード
  }
  ```
- **htmlValidator.ts**: 以下のカテゴリで検証を実行
  - HTML構文エラー
  - スライド構造エラー
  - 画像関連エラー
  - CSS関連エラー
  - コンテンツ品質の警告
  - アクセシビリティの警告

### 2.2 エディタの機能
- `EditorHandle` インターフェースに `setCursorPosition(position: number)` が実装済み
- 行番号から位置を計算する機能が必要

## 3. 機能要件

### 3.1 基本機能
1. **警告・エラー一覧の表示**
   - すべての警告・エラーを一覧表示
   - エラーと警告を区別して表示（アイコンや色で識別）
   - 各行に表示する情報：
     - 行番号
     - タイプ（エラー/警告）のアイコン
     - エラーメッセージ
     - エラーコード（オプション表示）

2. **フィルタリング機能**
   - エラーのみ表示
   - 警告のみ表示
   - すべて表示（デフォルト）

3. **行番号へのジャンプ**
   - 一覧の項目をクリックすると、エディタの該当行にカーソルを移動
   - エディタが該当行にスクロールして表示される

4. **パネルの表示・非表示**
   - StatusBarの「警告: X件」または「エラー: X件」をクリックで開閉
   - ESCキーまたは閉じるボタンで閉じる

5. **エディタ内のインライン表示**
   - エディタの行番号横（ガター領域）に警告・エラーアイコンを表示
   - CodeMirrorのGutterMarkerを使用して実装
   - アイコンにマウスオーバーでツールチップ表示（エラーメッセージ）
   - エラーと警告で異なるアイコンを表示（❌ または ⚠️）
   - 1つの行に複数の警告・エラーがある場合は、最も重要度の高いもの（エラー優先）を表示

### 3.2 UIデザイン
- **表示形式**: モーダルウィンドウ（既存のモーダルパターンに準拠）
- **サイズ**: 幅600px〜800px、高さ最大80vh（スクロール可能）
- **レイアウト**:
  - ヘッダー: タイトル「警告・エラー一覧」、閉じるボタン、フィルターボタン
  - コンテンツ: 警告・エラー一覧（スクロール可能）
  - フッター: 統計情報（エラー: X件、警告: Y件）

## 4. 技術実装

### 4.1 新しいコンポーネント

#### 4.1.1 ValidationErrorsPanelコンポーネント
**パス**: `components/ValidationErrorsPanel/ValidationErrorsPanel.tsx`

**Props**:
```typescript
interface ValidationErrorsPanelProps {
  isOpen: boolean
  onClose: () => void
  validationErrors: ValidationError[]
  htmlContent: string
  editorRef?: React.RefObject<EditorHandle>
}
```

**機能**:
- モーダルの開閉制御
- 警告・エラー一覧の表示
- フィルタリング機能
- 行番号へのジャンプ機能
- 統計情報の表示

#### 4.1.2 スタイルファイル
**パス**: `components/ValidationErrorsPanel/ValidationErrorsPanel.module.css`

既存のモーダルスタイルパターンに準拠:
- `.overlay`: モーダルのオーバーレイ
- `.modal`: モーダルウィンドウ
- `.header`: ヘッダー部分
- `.content`: コンテンツ部分（スクロール可能）
- `.errorItem`, `.warningItem`: 各エラー/警告アイテム
- `.filterButtons`: フィルターボタン
- `.footer`: フッター（統計情報）

### 4.2 StatusBarコンポーネントの拡張

**変更点**:
- 警告・エラー件数の表示部分をクリック可能にする
- クリック時にValidationErrorsPanelを開く
- `onValidationErrorsClick` コールバックを追加（または親コンポーネントで管理）

**Props追加**:
```typescript
interface StatusBarProps {
  htmlContent: string
  statusMessage?: string
  validationErrors?: ValidationError[]
  onValidationErrorsClick?: () => void  // 新規追加
}
```

### 4.3 行番号から位置への変換

**実装方法**:
- `htmlContent`を改行文字で分割して行番号から文字位置を計算
- `EditorHandle.setCursorPosition()`を使用してカーソルを移動

**ヘルパー関数**:
```typescript
function getPositionFromLineNumber(htmlContent: string, lineNumber: number): number {
  const lines = htmlContent.split('\n')
  if (lineNumber < 1 || lineNumber > lines.length) {
    return 0
  }
  // 指定行の先頭位置を計算
  let position = 0
  for (let i = 0; i < lineNumber - 1; i++) {
    position += lines[i].length + 1 // +1 は改行文字分
  }
  return position
}
```

### 4.4 エディタ内のインライン表示（ガターマーカー）

**実装方法**:
- CodeMirrorの`gutter`拡張と`GutterMarker`を使用
- `Editor.tsx`に既に`ErrorMarker`クラスが定義されているが、ガターへの適用は未実装
- `validationErrors`の変更時に、ガター領域にマーカーを設定

**実装詳細**:

1. **ErrorMarkerクラスの活用**
   - 既存の`ErrorMarker`クラスを使用（`Editor.tsx`に定義済み）
   - `toDOM()`メソッドでアイコンとツールチップを返す

2. **ガター拡張の作成**
   - CodeMirrorの`gutter()`関数を使用してカスタムガターを定義
   - `lineMarker`オプションで各行にマーカーを設定
   - `validationErrors`から行番号ごとにマーカーを作成

3. **マーカーの設定ロジック**
   ```typescript
   // validationErrorsを行番号でグループ化
   const errorsByLine = validationErrors.reduce((acc, error) => {
     if (!acc[error.line]) {
       acc[error.line] = []
     }
     acc[error.line].push(error)
     return acc
   }, {} as Record<number, ValidationError[]>)
   
   // 各行に対してマーカーを作成（エラー優先）
   const lineMarkers = (lineNumber: number) => {
     const errors = errorsByLine[lineNumber]
     if (!errors || errors.length === 0) return null
     
     // エラーを優先（type === 'error'）
     const error = errors.find(e => e.type === 'error') || errors[0]
     const message = errors.map(e => e.message).join('\n')
     
     return new ErrorMarker(message, error.type === 'error')
   }
   ```

4. **ガター拡張の統合**
   - CodeMirrorの初期化時にガター拡張を追加
   - `validationErrors`が変更されたときにガターを更新
   - `useEffect`で`validationErrors`の変更を監視し、ガターを再構築

5. **ガターのスタイリング**
   - ガター領域の幅を調整（必要に応じて）
   - アイコンのサイズと色を調整
   - ツールチップのスタイル設定

**注意事項**:
- 1つの行に複数の警告・エラーがある場合、すべてのメッセージをツールチップに表示
- エラーがある場合はエラーアイコン（❌）を優先表示
- パフォーマンス: 大量の警告がある場合でもスムーズに動作するよう、効率的な実装を心がける

### 4.5 エラーコードの分類

エラーコード別にアイコンやカテゴリ表示を検討（将来の拡張）:
- `MISSING_CLOSING_TAG`: HTML構文
- `UNDEFINED_CSS_CLASS`: CSS関連
- `MISSING_ALT`: 画像関連
- `EMPTY_SLIDE`: コンテンツ品質
- `LOW_CONTRAST`: アクセシビリティ
- など

## 5. 実装手順

### ステップ1: コンポーネントの作成
1. `components/ValidationErrorsPanel/` ディレクトリを作成
2. `ValidationErrorsPanel.tsx` を作成
3. `ValidationErrorsPanel.module.css` を作成
4. 基本的なモーダル構造を実装（開閉のみ）

### ステップ2: 一覧表示の実装
1. 警告・エラー一覧の表示を実装
2. エラーと警告の視覚的な区別（アイコン、色）
3. 行番号とメッセージの表示
4. スクロール可能なリスト実装

### ステップ3: フィルタリング機能
1. フィルターボタンの実装（すべて/エラーのみ/警告のみ）
2. フィルター状態の管理（useState）
3. フィルター適用ロジックの実装

### ステップ4: 行番号ジャンプ機能
1. 行番号から位置への変換関数を実装
2. リストアイテムクリック時にエディタの該当行にジャンプ
3. エディタのフォーカスとスクロール制御

### ステップ5: エディタ内インライン表示の実装
1. `Editor.tsx`でガター拡張を作成
2. `validationErrors`を行番号でグループ化するロジックを実装
3. 各行にマーカーを設定する関数を実装
4. CodeMirrorの初期化時にガター拡張を追加
5. `validationErrors`の変更時にガターを更新する`useEffect`を実装
6. ガターのスタイリング（アイコンサイズ、色、ツールチップ）

### ステップ6: StatusBarとの統合
1. StatusBarコンポーネントにクリックハンドラーを追加
2. StatusBarの警告・エラー表示部分をクリック可能にする
3. `app/page.tsx`でValidationErrorsPanelの状態管理と表示制御

### ステップ7: スタイリング
1. 既存のモーダルスタイルパターンに準拠
2. エラー/警告の視覚的な区別
3. ダークモード対応
4. レスポンシブ対応

### ステップ8: アクセシビリティ
1. キーボード操作（ESCキーで閉じる、Tabキーで移動）
2. スクリーンリーダー対応（aria-label等）
3. フォーカス管理

## 6. UI/UXデザイン詳細

### 6.1 モーダルレイアウト

```
┌─────────────────────────────────────────┐
│ 警告・エラー一覧              [×]        │ ← ヘッダー
├─────────────────────────────────────────┤
│ [すべて] [エラーのみ] [警告のみ]        │ ← フィルター
├─────────────────────────────────────────┤
│                                         │
│ ⚠️  行 45: 未定義のCSSクラス 'test'     │ ← エラーアイテム
│                                          │
│ ⚠️  行 67: 画像にalt属性がありません    │
│                                          │
│ ⚠️  行 89: スライド1: コンテンツが空です │ ← 警告アイテム
│                                          │
│ ⚠️  行 120: テキストが長すぎます...     │
│                                          │
│                    （スクロール可能）    │
│                                         │
├─────────────────────────────────────────┤
│ エラー: 2件、警告: 109件                │ ← フッター
└─────────────────────────────────────────┘
```

### 6.2 エラー/警告アイテムのスタイル
- **エラー**: 赤系のアイコン（❌ または ⚠️）と背景色
- **警告**: オレンジ/黄色系のアイコン（⚠️）と背景色
- **ホバー効果**: マウスオーバーで背景色を変更、カーソルをポインターに
- **クリック可能**: クリックで該当行にジャンプ

### 6.3 フィルターボタン
- 3つのボタンを横並びに配置
- アクティブなフィルターは強調表示（背景色を変更）
- ボタンの幅は均等

### 6.4 エディタ内インライン表示（ガターマーカー）

エディタの行番号の右側（ガター領域）に警告・エラーアイコンを表示します。

```
行番号領域    ガター領域    コード領域
┌─────────┬──────────┬────────────────────┐
│    1    │          │ <div class="slide">│
│    2    │          │   <h1>Title</h1>   │
│    3    │    ⚠️    │   <p class="test"> │ ← 警告アイコン
│    4    │          │   </p>             │
│    5    │    ❌    │   <img src="...">  │ ← エラーアイコン
│    6    │          │ </div>             │
└─────────┴──────────┴────────────────────┘
```

**デザイン仕様**:
- **アイコンサイズ**: 12px（既存のErrorMarkerクラスに設定済み）
- **エラーアイコン**: ❌（赤色）
- **警告アイコン**: ⚠️（オレンジ/黄色）
- **ツールチップ**: マウスオーバー時にエラーメッセージを表示
- **カーソル**: `help`カーソル（既存実装）
- **配置**: ガター領域の中央配置

**複数の警告・エラーがある場合**:
- 1つの行に複数の警告・エラーがある場合、最も重要度の高いものを表示（エラー > 警告）
- ツールチップにはすべてのメッセージを改行区切りで表示

## 7. エッジケースの処理

1. **警告・エラーが0件の場合**
   - モーダルは開かない（または「警告・エラーはありません」と表示）

2. **行番号が無効な場合**
   - エディタの先頭に移動、またはエラーハンドリング

3. **エディタが未初期化の場合**
   - `editorRef.current` の存在確認

4. **大量の警告・エラーの場合**
   - 仮想スクロールの検討（100件以上の場合）

5. **モーダルが開いている間に警告が更新された場合**
   - リアルタイム更新（`validationErrors`の変更を検知）

6. **エディタ内インライン表示の更新タイミング**
   - `validationErrors`が変更されたときにガターを再描画
   - パフォーマンスを考慮し、必要最小限の更新を実施

7. **1つの行に複数の警告・エラーがある場合**
   - エラーを優先表示（エラー > 警告の順）
   - ツールチップにすべてのメッセージを表示

## 8. テスト項目

### 8.1 機能テスト
- [ ] モーダルの開閉が正常に動作する
- [ ] 警告・エラー一覧が正しく表示される
- [ ] フィルター機能が正常に動作する
- [ ] 行番号へのジャンプが正常に動作する
- [ ] エディタのフォーカスが正しく移動する
- [ ] エディタ内のガターマーカーが警告・エラーに応じて表示される
- [ ] ガターマーカーが`validationErrors`の変更に応じて更新される
- [ ] エラーと警告のアイコンが正しく区別される

### 8.2 UIテスト
- [ ] エラーと警告が視覚的に区別できる
- [ ] スクロールが正常に動作する
- [ ] ダークモードで正しく表示される
- [ ] レスポンシブデザインが適用されている
- [ ] エディタ内のガターマーカーが正しく表示される
- [ ] ガターマーカーのツールチップが正しく表示される
- [ ] 1つの行に複数の警告・エラーがある場合の表示が正しい

### 8.3 アクセシビリティテスト
- [ ] キーボード操作が正常に動作する
- [ ] スクリーンリーダーで正しく読み上げられる

## 9. 将来の拡張案

1. **エラーコード別のフィルタリング**
   - カテゴリ別（HTML構文、CSS、画像など）のフィルタリング

2. **エラーの自動修正提案**
   - 一部のエラーに対して自動修正ボタンを表示

3. **エラーの無視機能**
   - 特定の警告を無視リストに追加する機能

4. **エクスポート機能**
   - エラー一覧をテキストファイルやCSVでエクスポート

5. **ガターマーカーのクリック機能**
   - ガターマーカーをクリックすると詳細パネルが開く、または該当行にジャンプ

## 10. 参照ファイル

### 既存の実装を参考にするファイル
- `components/SearchReplace/SearchReplaceModal.tsx` - モーダルの実装パターン
- `components/StatusBar/StatusBar.tsx` - StatusBarの実装
- `components/Editor/Editor.tsx` - EditorHandleの実装
- `lib/htmlValidator.ts` - ValidationError型と検証ロジック
- `app/page.tsx` - validationErrorsの管理

### スタイルの参考
- `components/SearchReplace/SearchReplaceModal.module.css`
- `components/ProjectManager/ProjectManagerModal.module.css`

