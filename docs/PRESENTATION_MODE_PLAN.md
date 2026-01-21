# プレゼンテーション機能（フルスクリーンモード）実装計画

## 1. 概要

スライドエディタにフルスクリーンプレゼンモードを追加します。ユーザーが作成したスライドを全画面で表示し、プレゼンテーション時に集中できる環境を提供します。

### 目標
- フルスクリーン表示でスライドを表示
- キーボード・マウスによるスライドナビゲーション
- スライド番号・進捗表示
- スムーズなトランジション
- プレゼンテーション専用のUI/UX

### 背景
- WELLBEING_EVALUATION.md で重要度4（重要）として評価されている
- Phase 3（快適な作業環境）の優先機能として位置づけられている
- プレゼン時の集中力維持に寄与

---

## 2. 技術スタック・アーキテクチャ

### 使用技術
- **フレームワーク**: Next.js (既存)
- **言語**: TypeScript
- **スタイリング**: CSS Modules (既存パターンに準拠)
- **状態管理**: React Hooks
- **フルスクリーンAPI**: `requestFullscreen()` / `exitFullscreen()`
- **キーボードイベント**: 既存のキーボードショートカットシステムを拡張

### アーキテクチャパターン
既存のコンポーネント実装パターンに従う:
- `Preview` コンポーネントの実装パターンを参考
- `extractSlides` 関数でスライドを抽出
- 既存のキーボードショートカットシステムと統合

---

## 3. ファイル構成

```
slide-editor-nextjs/
├── components/
│   └── PresentationMode/
│       ├── PresentationMode.tsx          # メインのプレゼンテーションモードコンポーネント
│       ├── PresentationMode.module.css   # スタイル
│       ├── PresentationControls.tsx      # ナビゲーションコントロール（オプション）
│       └── SlideProgress.tsx             # スライド進捗表示コンポーネント
├── hooks/
│   └── usePresentationMode.ts             # プレゼンテーションモード用カスタムフック
├── lib/
│   └── presentationUtils.ts               # プレゼンテーション用ユーティリティ関数
├── types/
│   └── index.ts                           # 型定義に追加
└── app/
    └── page.tsx                           # メインページに統合
```

---

## 4. データ構造・型定義

### 4.1 TypeScript型定義

`types/index.ts` に追加:

```typescript
// プレゼンテーションモードの設定
export interface PresentationConfig {
  startSlide: number              // 開始スライド番号（0ベース）
  showProgress: boolean           // 進捗表示の有無
  showControls: boolean           // コントロール表示の有無
  transition: 'none' | 'fade' | 'slide'  // トランジション効果
  backgroundColor: string          // 背景色（デフォルト: '#000000'）
}

// プレゼンテーションモードの状態
export interface PresentationState {
  isActive: boolean                // プレゼンテーションモードが有効か
  currentSlide: number             // 現在のスライド番号（0ベース）
  totalSlides: number              // 総スライド数
  isFullscreen: boolean            // フルスクリーン状態か
}
```

---

## 5. 機能仕様

### 5.1 基本機能

#### 5.1.1 フルスクリーン表示
- ブラウザのフルスクリーンAPIを使用
- エディタ、メニュー、ツールバーを非表示
- スライドのみを中央に大きく表示
- 背景色は黒（デフォルト）または設定可能

#### 5.1.2 スライドナビゲーション
- **キーボード操作**:
  - `→` / `Space` / `PageDown`: 次のスライド
  - `←` / `Backspace` / `PageUp`: 前のスライド
  - `Home`: 最初のスライド
  - `End`: 最後のスライド
  - `Esc`: プレゼンテーションモード終了
  - `F`: フルスクリーン切り替え（オプション）
- **マウス操作**:
  - 左クリック: 次のスライド
  - 右クリック: 前のスライド
  - ホイールスクロール: スライド移動（オプション）

#### 5.1.3 スライド表示
- 現在のスライドを中央に大きく表示
- スライドのアスペクト比を維持
- レスポンシブ対応（画面サイズに応じてスケール）

#### 5.1.4 進捗表示
- スライド番号表示（例: "3 / 10"）
- 進捗バー（オプション）
- 位置: 画面下部中央または右下

#### 5.1.5 トランジション
- スライド切り替え時のアニメーション
- オプション: フェード、スライド、なし

### 5.2 UI要素

#### 5.2.1 起動ボタン
- プレビューパネルのヘッダーに「フルスクリーン」ボタンを追加
- または、メニューから起動可能

#### 5.2.2 コントロール（オプション）
- 前へ/次へボタン（非表示にできる）
- 終了ボタン
- スライド番号表示

#### 5.2.3 終了方法
- `Esc` キーで終了
- フルスクリーン終了ボタン（オプション）
- ブラウザのフルスクリーン終了（F11など）

---

## 6. 実装詳細

### 6.1 コンポーネント設計

#### 6.1.1 PresentationMode.tsx

```typescript
interface PresentationModeProps {
  htmlContent: string
  isOpen: boolean
  onClose: () => void
  startSlide?: number
}
```

**主要機能**:
- フルスクリーンAPIの管理
- スライドの抽出と表示
- キーボードイベントのハンドリング
- マウスイベントのハンドリング
- トランジションアニメーション

#### 6.1.2 usePresentationMode.ts

カスタムフック:
- フルスクリーン状態の管理
- スライドナビゲーションロジック
- キーボードイベントリスナーの管理
- 設定の管理

#### 6.1.3 presentationUtils.ts

ユーティリティ関数:
- `getCurrentSlideHTML()`: 現在のスライドのHTMLを取得
- `processSlideForPresentation()`: プレゼンテーション用にスライドを処理
- `calculateSlideScale()`: スライドのスケールを計算

### 6.2 スタイリング

#### 6.2.1 フルスクリーン表示
- 背景: 黒（`#000000`）または設定可能
- スライド: 中央配置、最大幅・高さでスケール
- トランジション: CSS transition を使用

#### 6.2.2 コントロール
- 半透明の背景
- ホバー時に表示
- レスポンシブ対応

### 6.3 キーボードショートカット統合

既存のキーボードショートカットシステムに追加:

```typescript
// lib/keyboardShortcutsConfig.ts に追加
{
  id: 'presentation-mode',
  action: 'presentation-mode',
  label: 'プレゼンテーションモード',
  defaultKey: 'F5',  // 一般的なプレゼンテーションショートカット
  enabled: true,
  category: 'view'
}
```

**注意**: プレゼンテーションモード中は、他のショートカットを無効化する必要がある。

---

## 7. 実装手順

### Phase 1: 基本構造の作成
1. `components/PresentationMode/` ディレクトリを作成
2. `PresentationMode.tsx` の基本構造を作成
3. `PresentationMode.module.css` を作成
4. 型定義を追加

### Phase 2: フルスクリーン機能
1. `usePresentationMode.ts` フックを作成
2. フルスクリーンAPIの実装
3. フルスクリーン状態の管理

### Phase 3: スライド表示
1. スライド抽出ロジックの実装
2. 現在のスライドの表示
3. スライドのスケーリング処理

### Phase 4: ナビゲーション機能
1. キーボードイベントハンドラーの実装
2. マウスイベントハンドラーの実装
3. スライド切り替えロジック

### Phase 5: UI要素
1. 進捗表示コンポーネントの実装
2. コントロールボタンの実装（オプション）
3. トランジションアニメーション

### Phase 6: 統合
1. `Preview` コンポーネントに起動ボタンを追加
2. `HamburgerMenu` にメニュー項目を追加（オプション）
3. キーボードショートカットの統合
4. エラーハンドリング

### Phase 7: テスト・最適化
1. 各種ブラウザでの動作確認
2. レスポンシブ対応の確認
3. パフォーマンス最適化
4. アクセシビリティの確認

---

## 8. 技術的な考慮事項

### 8.1 フルスクリーンAPI

```typescript
// フルスクリーンへの切り替え
const enterFullscreen = async (element: HTMLElement) => {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen()
    } else if ((element as any).webkitRequestFullscreen) {
      await (element as any).webkitRequestFullscreen()
    } else if ((element as any).mozRequestFullScreen) {
      await (element as any).mozRequestFullScreen()
    } else if ((element as any).msRequestFullscreen) {
      await (element as any).msRequestFullscreen()
    }
  } catch (error) {
    console.error('フルスクリーンに失敗しました:', error)
  }
}

// フルスクリーンからの終了
const exitFullscreen = async () => {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen()
    } else if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen()
    } else if ((document as any).mozCancelFullScreen) {
      await (document as any).mozCancelFullScreen()
    } else if ((document as any).msExitFullscreen) {
      await (document as any).msExitFullscreen()
    }
  } catch (error) {
    console.error('フルスクリーン終了に失敗しました:', error)
  }
}
```

### 8.2 スライドの処理

既存の `extractSlides` 関数を使用してスライドを抽出し、現在のスライドのみを表示。

```typescript
import { extractSlides } from '@/lib/slideReorder'
import { processHTMLForPreviewAsync } from '@/lib/htmlProcessor'

const slides = extractSlides(htmlContent)
const currentSlideHTML = slides[currentSlideIndex]?.html || ''
const processedHTML = await processHTMLForPreviewAsync(currentSlideHTML)
```

### 8.3 イベントハンドリング

プレゼンテーションモード中は、グローバルなキーボードイベントをキャッチ:

```typescript
useEffect(() => {
  if (!isActive) return

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
      case ' ':
      case 'PageDown':
        e.preventDefault()
        goToNextSlide()
        break
      case 'ArrowLeft':
      case 'Backspace':
      case 'PageUp':
        e.preventDefault()
        goToPreviousSlide()
        break
      case 'Home':
        e.preventDefault()
        goToFirstSlide()
        break
      case 'End':
        e.preventDefault()
        goToLastSlide()
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [isActive, currentSlide, totalSlides])
```

### 8.4 トランジション

CSS transition を使用:

```css
.slideContainer {
  transition: opacity 0.3s ease-in-out;
}

.slideContainer.fadeIn {
  opacity: 1;
}

.slideContainer.fadeOut {
  opacity: 0;
}
```

---

## 9. エラーハンドリング

### 9.1 フルスクリーンAPI未対応
- ブラウザがフルスクリーンAPIをサポートしていない場合
- フォールバック: 通常の全画面表示（CSSで実現）

### 9.2 スライドが存在しない
- スライドが0件の場合、プレゼンテーションモードを起動できない
- エラーメッセージを表示

### 9.3 キーボードイベントの競合
- プレゼンテーションモード中は、他のショートカットを無効化
- イベントの優先順位を適切に設定

---

## 10. アクセシビリティ

### 10.1 キーボード操作
- すべての機能がキーボードで操作可能
- フォーカス管理の適切な実装

### 10.2 ARIA属性
- 適切なARIAラベルを設定
- スクリーンリーダー対応

### 10.3 視覚的フィードバック
- スライド切り替え時の視覚的フィードバック
- 進捗表示の明確な表示

---

## 11. パフォーマンス

### 11.1 スライドの読み込み
- 現在のスライドのみを表示（他のスライドは非表示）
- 必要に応じて遅延読み込み

### 11.2 アニメーション
- CSS transition を使用（GPU加速）
- 重いアニメーションは避ける

### 11.3 メモリ管理
- イベントリスナーの適切なクリーンアップ
- 不要なDOM要素の削除

---

## 12. テスト項目

### 12.1 機能テスト
- [ ] フルスクリーン表示が正常に動作する
- [ ] キーボードナビゲーションが正常に動作する
- [ ] マウスナビゲーションが正常に動作する
- [ ] スライド切り替えが正常に動作する
- [ ] 進捗表示が正常に表示される
- [ ] トランジションが正常に動作する
- [ ] 終了機能が正常に動作する

### 12.2 ブラウザ互換性
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] モバイルブラウザ（オプション）

### 12.3 エッジケース
- [ ] スライドが0件の場合
- [ ] スライドが1件の場合
- [ ] 最初/最後のスライドでのナビゲーション
- [ ] フルスクリーンAPI未対応ブラウザ

---

## 13. 今後の拡張機能

### 13.1 スピーカーノート
- スライドごとのノート表示
- 別ウィンドウでの表示（オプション）

### 13.2 タイマー機能
- プレゼンテーション時間の計測
- アラート機能

### 13.3 レーザーポインター
- マウスカーソルをレーザーポインター風に表示

### 13.4 リモートコントロール
- スマートフォンからのリモート操作（オプション）

---

## 14. 参考資料

- [MDN: Fullscreen API](https://developer.mozilla.org/ja/docs/Web/API/Fullscreen_API)
- [MDN: KeyboardEvent](https://developer.mozilla.org/ja/docs/Web/API/KeyboardEvent)
- 既存の `Preview` コンポーネント
- 既存の `extractSlides` 関数
- 既存のキーボードショートカットシステム

---

## 15. 実装チェックリスト

### Phase 1: 基本構造
- [ ] ディレクトリ構造の作成
- [ ] 型定義の追加
- [ ] 基本コンポーネントの作成

### Phase 2: フルスクリーン機能
- [ ] フルスクリーンAPIの実装
- [ ] フルスクリーン状態の管理

### Phase 3: スライド表示
- [ ] スライド抽出ロジックの統合
- [ ] スライド表示の実装
- [ ] スケーリング処理

### Phase 4: ナビゲーション
- [ ] キーボードイベントハンドラー
- [ ] マウスイベントハンドラー
- [ ] スライド切り替えロジック

### Phase 5: UI要素
- [ ] 進捗表示
- [ ] コントロール（オプション）
- [ ] トランジション

### Phase 6: 統合
- [ ] Previewコンポーネントへの統合
- [ ] キーボードショートカットの統合
- [ ] エラーハンドリング

### Phase 7: テスト
- [ ] 機能テスト
- [ ] ブラウザ互換性テスト
- [ ] パフォーマンステスト

---

## 16. 注意事項

1. **フルスクリーンAPIのブラウザ互換性**: 各ブラウザで異なるプレフィックスが必要な場合がある
2. **キーボードイベントの競合**: プレゼンテーションモード中は他のショートカットを無効化する
3. **スライドの処理**: 既存の `processHTMLForPreviewAsync` を使用してスライドを処理
4. **パフォーマンス**: 大量のスライドがある場合のパフォーマンスを考慮
5. **アクセシビリティ**: キーボード操作とスクリーンリーダー対応を確保

---

この実装計画に基づいて、段階的にプレゼンテーション機能を実装していきます。

