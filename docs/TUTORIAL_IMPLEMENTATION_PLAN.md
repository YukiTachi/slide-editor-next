# チュートリアル機能 実装計画

## 1. 概要

初回訪問者向けにインタラクティブなチュートリアルを実装します。ユーザーがスライドエディタの主要機能を段階的に学習できるよう、ステップバイステップのガイドを提供します。

### 目標
- 初回訪問者の離脱率を減らす
- 主要機能の理解を促進
- ユーザー体験を向上させる

---

## 2. 技術スタック・アーキテクチャ

### 使用技術
- **フレームワーク**: Next.js (既存)
- **言語**: TypeScript
- **スタイリング**: CSS Modules (既存パターンに準拠)
- **状態管理**: React Hooks + localStorage
- **ポータル**: React Portal (createPortal)

### アーキテクチャパターン
既存のモーダル実装パターンに従う:
- `ImageInserterModal` の実装パターンを参考
- `KeyboardShortcutsModal` のUI/UXパターンを参考
- localStorageストレージパターン（`lib/tutorialStorage.ts`）を新規作成

---

## 3. ファイル構成

```
slide-editor-nextjs/
├── components/
│   └── Tutorial/
│       ├── TutorialModal.tsx          # メインのチュートリアルコンポーネント
│       ├── TutorialModal.module.css   # スタイル
│       ├── TutorialStep.tsx           # 各ステップのコンポーネント（必要に応じて）
│       └── TutorialOverlay.tsx        # オーバーレイとハイライト機能（必要に応じて）
├── lib/
│   └── tutorialStorage.ts             # チュートリアル状態の保存・読み込み
├── hooks/
│   └── useTutorial.ts                 # チュートリアル状態管理フック
├── types/
│   └── index.ts                       # 型定義に追加
└── app/
    └── page.tsx                       # メインページに統合
```

---

## 4. データ構造・型定義

### 4.1 TypeScript型定義

`types/index.ts` に追加:

```typescript
// チュートリアルステップの型定義
export interface TutorialStep {
  id: string                    // ステップID（例: 'welcome', 'layout', 'menu'）
  title: string                 // ステップタイトル
  content: string               // 説明文（HTML可）
  highlightElement?: string     // ハイライト対象のセレクタ（例: '.hamburger-btn'）
  highlightPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center'  // 説明ボックスの位置
  action?: 'none' | 'click' | 'input'  // 必要なアクション（任意）
  actionTarget?: string         // アクション対象のセレクタ
  skipable?: boolean            // スキップ可能かどうか（デフォルト: true）
}

// チュートリアルの状態
export interface TutorialState {
  completed: boolean            // 完了フラグ
  skipped: boolean              // スキップフラグ
  currentStep: number           // 現在のステップ番号
  completedSteps: number[]      // 完了したステップの番号
  lastShown?: string            // 最後に表示した日時（ISO文字列）
}

// チュートリアル設定
export interface TutorialConfig {
  steps: TutorialStep[]
  autoStart?: boolean           // 初回訪問時に自動開始（デフォルト: true）
  allowRestart?: boolean        // 再表示を許可（デフォルト: true）
}
```

### 4.2 ステップ定義データ

`lib/tutorialSteps.ts` (新規ファイル):

```typescript
import type { TutorialStep } from '@/types'

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'スライドエディタへようこそ',
    content: `
      <p>HTMLベースのA4横向きスライド作成ツールです。</p>
      <p>このチュートリアルでは以下の内容を学びます:</p>
      <ul>
        <li>画面レイアウトの理解</li>
        <li>主要機能の使い方</li>
        <li>効率的な操作方法</li>
      </ul>
    `,
    skipable: true
  },
  {
    id: 'layout',
    title: '画面レイアウト',
    content: `
      <p>画面は左右に分かれています:</p>
      <ul>
        <li><strong>左側</strong>: HTMLエディタ（編集エリア）</li>
        <li><strong>右側</strong>: プレビュー（リアルタイム表示）</li>
        <li><strong>中央</strong>: リサイザー（幅を調整可能）</li>
      </ul>
      <p>エディタに入力すると、リアルタイムでプレビューが更新されます。</p>
    `,
    highlightElement: '.container',
    highlightPosition: 'center',
    skipable: true
  },
  {
    id: 'menu',
    title: 'ハンバーガーメニュー',
    content: `
      <p>右上のハンバーガーメニューから各種機能にアクセスできます。</p>
      <p>主要機能:</p>
      <ul>
        <li>📝 <strong>編集</strong>: スライド追加、元に戻す、やり直し</li>
        <li>🖼️ <strong>画像</strong>: 画像挿入、画像管理</li>
        <li>💾 <strong>データ</strong>: 復元、HTMLコピー</li>
        <li>🔗 <strong>表示</strong>: 別ウィンドウでプレビュー</li>
      </ul>
    `,
    highlightElement: '.hamburger-btn',
    highlightPosition: 'bottom',
    action: 'click',
    actionTarget: '.hamburger-btn',
    skipable: true
  },
  {
    id: 'image',
    title: '画像の挿入',
    content: `
      <p>画像を挿入する方法は3つあります:</p>
      <ol>
        <li>メニューから「画像挿入」を選択</li>
        <li>ドラッグ&ドロップ（推奨）</li>
        <li>キーボードショートカット（<kbd>Ctrl+I</kbd> / <kbd>Cmd+I</kbd>）</li>
      </ol>
      <p>画像は外部ファイルまたはBase64形式で保存できます。</p>
    `,
    highlightElement: '.hamburger-menu',
    highlightPosition: 'left',
    skipable: true
  },
  {
    id: 'autosave',
    title: '自動保存機能',
    content: `
      <p>編集内容は自動的に保存されます。</p>
      <ul>
        <li>30秒ごとに自動保存</li>
        <li>ブラウザを閉じても復元可能</li>
        <li>ステータスバーに保存状態が表示されます</li>
      </ul>
      <p>メニューの「復元」ボタンから、以前の状態に戻すことができます。</p>
    `,
    highlightElement: '.status-bar',
    highlightPosition: 'top',
    skipable: true
  },
  {
    id: 'shortcuts',
    title: 'キーボードショートカット',
    content: `
      <p>キーボードショートカットで効率的に操作できます:</p>
      <ul>
        <li><kbd>Ctrl+Z</kbd> / <kbd>Cmd+Z</kbd>: 元に戻す</li>
        <li><kbd>Ctrl+Y</kbd> / <kbd>Cmd+Y</kbd>: やり直す</li>
        <li><kbd>Ctrl+S</kbd> / <kbd>Cmd+S</kbd>: HTMLコピー</li>
        <li><kbd>Ctrl+I</kbd> / <kbd>Cmd+I</kbd>: 画像挿入</li>
        <li><kbd>Ctrl+M</kbd> / <kbd>Cmd+M</kbd>: スライド追加</li>
      </ul>
      <p>メニューからショートカット一覧を確認・カスタマイズできます。</p>
    `,
    skipable: true
  }
]
```

---

## 5. コンポーネント設計

### 5.1 TutorialModal (メインコンポーネント)

**責務**:
- チュートリアルの全体制御
- ステップの表示・切り替え
- ナビゲーション（次へ、戻る、スキップ）
- ハイライト機能の制御
- オーバーレイの表示

**Props**:
```typescript
interface TutorialModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void        // 完了時のコールバック
  onSkip?: () => void            // スキップ時のコールバック
}
```

**主な機能**:
1. ステップの表示・切り替え
2. プログレスバーの更新
3. ハイライト要素の検出・強調
4. キーボード操作（Esc: 閉じる、Enter: 次へ、←→: ナビゲーション）
5. オーバーレイのクリック無効化

### 5.2 TutorialStorage (ストレージ管理)

**責務**:
- localStorageへの保存・読み込み
- チュートリアル状態の管理
- 初回訪問判定

**API**:
```typescript
export function getTutorialState(): TutorialState
export function saveTutorialState(state: TutorialState): void
export function shouldShowTutorial(): boolean
export function markTutorialCompleted(): void
export function markTutorialSkipped(): void
export function resetTutorial(): void
```

**LocalStorageキー**:
- `slideEditor_tutorialState`: チュートリアルの状態（JSON）

### 5.3 useTutorial (カスタムフック)

**責務**:
- チュートリアルの状態管理
- 表示条件の判定
- イベントハンドラーの提供

**API**:
```typescript
export function useTutorial() {
  return {
    isTutorialOpen: boolean
    currentStep: number
    totalSteps: number
    openTutorial: () => void
    closeTutorial: () => void
    nextStep: () => void
    previousStep: () => void
    skipTutorial: () => void
    completeTutorial: () => void
    shouldShowTutorial: boolean
  }
}
```

---

## 6. UI/UX設計

### 6.1 レイアウト

```
┌─────────────────────────────────────┐
│         [オーバーレイ（暗い背景）]      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   [ハイライト要素（明るく表示）]  │   │
│  └─────────────────────────────┘   │
│                                     │
│        ┌──────────────┐             │
│        │ 説明ボックス   │             │
│        │              │             │
│        │ [タイトル]    │             │
│        │ [内容]       │             │
│        │              │             │
│        │ [戻る][次へ] │             │
│        │ [スキップ]    │             │
│        └──────────────┘             │
│                                     │
│  [プログレスバー: ステップ 2/6]       │
└─────────────────────────────────────┘
```

### 6.2 スタイル要件

**オーバーレイ**:
- 背景: `rgba(0, 0, 0, 0.7)`
- バックドロップ: `backdrop-filter: blur(5px)`
- z-index: 100000（他のモーダルより高い）

**ハイライト**:
- 対象要素の周りに光るボーダー（`box-shadow`）
- 暗いオーバーレイの中でも明るく見えるように
- アニメーション: パルス効果（`@keyframes pulse`）

**説明ボックス**:
- 背景: `var(--bg-modal)`（テーマ対応）
- 角丸: `border-radius: 12px`
- 影: `box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3)`
- 最大幅: `500px`
- 位置: ハイライト要素の近く（`highlightPosition`に従う）

**プログレスバー**:
- 下部中央に固定表示
- 現在のステップ/全ステップを表示
- 進捗バー（視覚的インジケーター）

### 6.3 アニメーション

- フェードイン/アウト: `0.3s ease-out`
- ハイライトのパルス: `2s ease-in-out infinite`
- 説明ボックスのスライドイン: `0.3s ease-out`

---

## 7. 実装フェーズ

### Phase 1: 基盤の構築（必須機能）

**目標**: チュートリアルが表示できる基本機能を実装

#### 7.1 型定義とステップ定義
- [ ] `types/index.ts` に型定義を追加
- [ ] `lib/tutorialSteps.ts` を作成し、ステップ定義を実装

#### 7.2 ストレージ管理
- [ ] `lib/tutorialStorage.ts` を作成
  - [ ] `getTutorialState()` 実装
  - [ ] `saveTutorialState()` 実装
  - [ ] `shouldShowTutorial()` 実装（初回訪問判定）
  - [ ] `markTutorialCompleted()` 実装
  - [ ] `markTutorialSkipped()` 実装

#### 7.3 カスタムフック
- [ ] `hooks/useTutorial.ts` を作成
  - [ ] 状態管理ロジック
  - [ ] ステップナビゲーション
  - [ ] 表示条件判定

#### 7.4 基本UIコンポーネント
- [ ] `components/Tutorial/TutorialModal.tsx` を作成
  - [ ] モーダルオーバーレイ
  - [ ] 説明ボックス
  - [ ] ナビゲーションボタン（次へ、戻る、スキップ）
  - [ ] プログレスバー
  - [ ] キーボード操作（Esc、Enter、矢印キー）

#### 7.5 スタイル
- [ ] `components/Tutorial/TutorialModal.module.css` を作成
  - [ ] オーバーレイスタイル
  - [ ] 説明ボックスのスタイル
  - [ ] プログレスバーのスタイル
  - [ ] アニメーション定義

#### 7.6 メインページへの統合
- [ ] `app/page.tsx` に統合
  - [ ] `useTutorial` フックを使用
  - [ ] 初回訪問時に自動表示
  - [ ] `TutorialModal` コンポーネントを追加

**確認事項**:
- チュートリアルが表示される
- ステップを切り替えられる
- スキップ・完了が機能する
- localStorageに状態が保存される

---

### Phase 2: ハイライト機能（重要機能）

**目標**: 対象要素をハイライトして説明を表示

#### 7.7 ハイライト機能
- [ ] 要素検出機能
  - [ ] `document.querySelector()` で要素を取得
  - [ ] 要素が見つからない場合の処理
- [ ] ハイライト表示
  - [ ] 要素の位置・サイズを取得（`getBoundingClientRect()`）
  - [ ] ハイライトオーバーレイを動的に配置
  - [ ] パルスアニメーションの適用
- [ ] 説明ボックスの配置
  - [ ] `highlightPosition` に従った配置計算
  - [ ] 画面外に出ないように調整
  - [ ] スクロール対応

**確認事項**:
- 対象要素が正しくハイライトされる
- 説明ボックスが適切な位置に表示される
- レスポンシブに対応している

---

### Phase 3: インタラクティブ機能（オプション）

**目標**: ユーザーが実際に操作を体験できる

#### 7.8 インタラクティブ体験
- [ ] クリックアクション
  - [ ] `action: 'click'` の場合、対象要素をクリックするまで次へ進めない
  - [ ] クリック検出と次のステップへの遷移
- [ ] 入力アクション
  - [ ] `action: 'input'` の場合、対象要素に入力するまで次へ進めない
  - [ ] 入力検出と次のステップへの遷移

**確認事項**:
- アクションが正しく検出される
- ユーザーが操作を完了するまで次へ進めない

---

### Phase 4: メニュー統合（UX向上）

**目標**: ユーザーがいつでもチュートリアルを再表示できる

#### 7.9 メニューへの追加
- [ ] `components/Menu/HamburgerMenu.tsx` に「チュートリアル」ボタンを追加
  - [ ] 「📖 チュートリアルを表示」メニュー項目
  - [ ] クリックでチュートリアルを開く
  - [ ] 完了済みの場合は「再表示」、未完了の場合は「続きを見る」と表示

#### 7.10 URLパラメータ対応（オプション）
- [ ] `?tutorial=true` で強制表示
- [ ] URLパラメータの解析と処理

**確認事項**:
- メニューからチュートリアルを開ける
- URLパラメータで制御できる

---

### Phase 5: ポリッシュ（完成度向上）

**目標**: 完成度を高める

#### 7.11 アクセシビリティ
- [ ] ARIA属性の追加
  - [ ] `role="dialog"`
  - [ ] `aria-label`, `aria-labelledby`
  - [ ] `aria-describedby`
- [ ] キーボード操作の完全対応
  - [ ] Tab順序の適切な制御
  - [ ] フォーカストラップ

#### 7.12 エラーハンドリング
- [ ] 要素が見つからない場合の処理
- [ ] localStorageエラーの処理
- [ ] エッジケースの対応

#### 7.13 パフォーマンス最適化
- [ ] 不要な再レンダリングの防止
- [ ] メモ化の適用
- [ ] アニメーションの最適化

---

## 8. 実装の考慮事項

### 8.1 既存機能との競合

**問題**: チュートリアル中に他のモーダルが開く可能性
**対策**: 
- チュートリアルのz-indexを最高値（100000）に設定
- チュートリアル表示中は他のモーダルの開閉を無効化（オプション）

### 8.2 レスポンシブ対応

**問題**: 小さな画面では説明ボックスが画面外に出る
**対策**:
- 画面サイズに応じて説明ボックスの位置を調整
- モバイルでは全画面表示に切り替える（オプション）

### 8.3 テーマ対応

**問題**: ダークモード・ライトモードに対応する必要がある
**対策**:
- CSS変数（`var(--bg-modal)` など）を使用
- 既存のテーマシステムを活用

### 8.4 要素の動的検出

**問題**: 要素がまだレンダリングされていない場合がある
**対策**:
- `useEffect` と `MutationObserver` で要素の出現を監視
- 要素が見つかるまで待機する処理

### 8.5 ステップ定義の拡張性

**問題**: 将来的にステップを追加・変更する可能性
**対策**:
- ステップ定義を外部ファイル（`tutorialSteps.ts`）に分離
- 設定ファイルから読み込めるようにする（将来の拡張）

---

## 9. テスト計画

### 9.1 単体テスト（オプション）

- `tutorialStorage.ts` の各関数
- `useTutorial` フックのロジック

### 9.2 統合テスト（手動確認）

- [ ] 初回訪問時にチュートリアルが表示される
- [ ] ステップを次へ・戻るで切り替えられる
- [ ] スキップ機能が動作する
- [ ] 完了時にlocalStorageに保存される
- [ ] 2回目以降は表示されない（完了時）
- [ ] メニューから再表示できる
- [ ] キーボード操作が機能する
- [ ] ハイライトが正しく表示される
- [ ] レスポンシブに対応している
- [ ] テーマ（ダーク/ライト）に対応している

---

## 10. 今後の拡張案

### 10.1 多言語対応
- ステップ定義を多言語化
- i18nライブラリの導入

### 10.2 アニメーション強化
- より滑らかなトランジション
- マイクロインタラクションの追加

### 10.3 ユーザーフィードバック
- チュートリアル終了後のアンケート
- 「役に立ちましたか？」評価機能

### 10.4 段階的機能解放
- 初回は基本機能のみ案内
- 数回利用後に「高度な機能」チュートリアルを表示

### 10.5 ビデオチュートリアル
- 動画/GIFによる操作デモ
- YouTube埋め込み対応

---

## 11. 実装の優先順位

### 必須（Phase 1-2）
✅ チュートリアルの基本表示
✅ ステップナビゲーション
✅ ハイライト機能
✅ 状態の保存・復元

### 推奨（Phase 3-4）
✅ インタラクティブ体験
✅ メニューからの再表示

### オプション（Phase 5）
✅ アクセシビリティ強化
✅ パフォーマンス最適化
✅ エラーハンドリング強化

---

## 12. 実装開始前の確認事項

- [ ] 既存のコードベースの理解
- [ ] モーダル実装パターンの確認
- [ ] スタイリングパターンの確認
- [ ] localStorageパターンの確認
- [ ] 実装環境の準備

---

## 13. 参考資料

### 既存実装の参考
- `components/ImageInserter/ImageInserterModal.tsx` - モーダル実装パターン
- `components/KeyboardShortcuts/KeyboardShortcutsModal.tsx` - UI/UXパターン
- `lib/themeStorage.ts` - localStorageパターン
- `hooks/useAutoSave.ts` - カスタムフックパターン

### 外部ライブラリ（オプション）
- `react-joyride` - チュートリアル実装ライブラリ（参考用、使用しない）
- `driver.js` - ハイライト機能ライブラリ（参考用、使用しない）

---

## 14. 変更履歴

- 2025-12-20: 初版作成

---

**注意**: この計画は実装の指針です。実装中に発見された問題や要件変更に応じて柔軟に調整してください。
