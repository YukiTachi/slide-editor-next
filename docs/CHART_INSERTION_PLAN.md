# グラフ・チャート挿入機能 実装計画

## 1. 概要

スライドエディタにグラフ・チャート作成機能を追加します。ユーザーがデータを入力して、様々な種類のグラフ・チャートを簡単に挿入できるようにします。

### 目標
- 複数のグラフタイプ（棒グラフ、折れ線グラフ、円グラフなど）をサポート
- データ入力方法の多様化（手動入力、CSV、JSON）
- 既存のスライドスタイルに統合された見た目
- 直感的なUI/UX
- PowerPoint出力時に画像として変換可能

### 背景
- WELLBEING_EVALUATION.md で重要度5（最重要）として評価されている
- Phase 4（表現力向上）の優先機能として位置づけられている
- データ可視化、表現力向上に重要な機能
- PowerPoint形式エクスポート機能の実装前に開発が必要

---

## 2. 技術スタック・アーキテクチャ

### 使用技術
- **グラフライブラリ**: Chart.js (npmパッケージ)
  - 軽量で使いやすい
  - 豊富なグラフタイプ
  - Canvasベース（画像変換が容易）
  - MITライセンス
  - TypeScript型定義あり
- **フレームワーク**: Next.js (既存)
- **言語**: TypeScript
- **スタイリング**: CSS Modules (既存パターンに準拠)
- **状態管理**: React Hooks

### アーキテクチャパターン
既存の実装パターンに従う:
- `TableInserterModal` の実装パターンを参考
- `lib/tableProcessor.ts` の実装パターンを参考
- `lib/imageProcessor.ts` の `insertImageToHTML` 関数パターンを参考
- モーダルUI/UXパターンを参考

---

## 3. ファイル構成

```
slide-editor-nextjs/
├── components/
│   └── ChartInserter/
│       ├── ChartInserterModal.tsx          # メインのグラフ挿入モーダル
│       ├── ChartInserterModal.module.css   # スタイル
│       ├── ChartPreview.tsx                # グラフのプレビューコンポーネント
│       ├── DataInputPanel.tsx              # データ入力パネル
│       └── ChartConfigPanel.tsx            # グラフ設定パネル
├── lib/
│   ├── chartProcessor.ts                   # グラフ生成・挿入ロジック
│   ├── chartRenderer.ts                    # グラフレンダリングロジック
│   └── chartDataParser.ts                 # データパーサー（CSV、JSON）
├── types/
│   └── index.ts                            # 型定義に追加
└── app/
    └── page.tsx                            # メインページに統合
```

---

## 4. データ構造・型定義

### 4.1 TypeScript型定義

`types/index.ts` に追加:

```typescript
// グラフタイプ
export type ChartType = 
  | 'bar'           // 棒グラフ
  | 'line'          // 折れ線グラフ
  | 'pie'           // 円グラフ
  | 'doughnut'      // ドーナツチャート
  | 'radar'         // レーダーチャート
  | 'polarArea'     // 極座標エリアチャート
  | 'bubble'        // バブルチャート
  | 'scatter'       // 散布図

// グラフの設定
export interface ChartConfig {
  type: ChartType
  title?: string              // グラフタイトル
  data: ChartData             // グラフデータ
  options?: ChartOptions      // Chart.jsのオプション
  width?: number              // グラフの幅（px）
  height?: number             // グラフの高さ（px）
}

// グラフデータ
export interface ChartData {
  labels: string[]            // X軸ラベル（またはカテゴリ）
  datasets: ChartDataset[]    // データセット
}

// データセット
export interface ChartDataset {
  label: string               // データセットのラベル
  data: number[]              // データ値
  backgroundColor?: string | string[]  // 背景色
  borderColor?: string | string[]      // 境界線の色
  borderWidth?: number        // 境界線の太さ
}

// グラフオプション（Chart.jsのオプションを簡略化）
export interface ChartOptions {
  responsive?: boolean        // レスポンシブ
  maintainAspectRatio?: boolean  // アスペクト比を維持
  plugins?: {
    legend?: {
      display?: boolean       // 凡例の表示
      position?: 'top' | 'bottom' | 'left' | 'right'
    }
    title?: {
      display?: boolean       // タイトルの表示
      text?: string          // タイトルテキスト
    }
  }
  scales?: {
    x?: {
      title?: {
        display?: boolean
        text?: string
      }
    }
    y?: {
      title?: {
        display?: boolean
        text?: string
      }
    }
  }
}

// データ入力方法
export type DataInputMethod = 'manual' | 'csv' | 'json'
```

### 4.2 グラフタイプ定義

`lib/chartTypes.ts` (新規ファイル):

```typescript
import type { ChartType } from '@/types'

// グラフタイプの説明
export const CHART_TYPE_INFO: Record<ChartType, { 
  name: string
  description: string
  icon: string
  supported: boolean
}> = {
  bar: {
    name: '棒グラフ',
    description: 'カテゴリごとの値を比較',
    icon: '📊',
    supported: true
  },
  line: {
    name: '折れ線グラフ',
    description: '時系列データの推移を表示',
    icon: '📈',
    supported: true
  },
  pie: {
    name: '円グラフ',
    description: '全体に対する割合を表示',
    icon: '🥧',
    supported: true
  },
  doughnut: {
    name: 'ドーナツチャート',
    description: '円グラフの中央が空いた形式',
    icon: '🍩',
    supported: true
  },
  radar: {
    name: 'レーダーチャート',
    description: '複数の指標を比較',
    icon: '📡',
    supported: true
  },
  polarArea: {
    name: '極座標エリアチャート',
    description: '極座標でのエリア表示',
    icon: '⭕',
    supported: true
  },
  bubble: {
    name: 'バブルチャート',
    description: '3次元データをバブルで表示',
    icon: '🫧',
    supported: true
  },
  scatter: {
    name: '散布図',
    description: '2変数の関係を表示',
    icon: '⚫',
    supported: true
  }
}
```

---

## 5. コンポーネント設計

### 5.1 ChartInserterModal (メインコンポーネント)

**責務**:
- グラフタイプの選択
- データ入力の管理
- グラフ設定の管理
- グラフのプレビュー表示
- エディタへのグラフの挿入

**Props**:
```typescript
interface ChartInserterModalProps {
  isOpen: boolean
  onClose: () => void
  htmlContent: string
  setHtmlContent: (content: string) => void
  editorRef?: React.RefObject<EditorHandle | null>
  onStatusUpdate?: (message: string) => void
}
```

**主な機能**:
1. グラフタイプの選択（タブまたはカード選択）
2. データ入力方法の選択（手動、CSV、JSON）
3. データ入力パネルの表示
4. グラフ設定パネルの表示（色、凡例、タイトルなど）
5. グラフのリアルタイムプレビュー
6. エディタへの挿入

### 5.2 chartProcessor (グラフ生成ロジック)

**責務**:
- HTMLグラフ要素の生成
- エディタへの挿入位置の計算
- カーソル位置の更新

**API**:
```typescript
// グラフのHTMLを生成
export function generateChartHTML(config: ChartConfig): string

// エディタにグラフを挿入
export function insertChartToHTML(
  htmlContent: string,
  cursorPos: number,
  config: ChartConfig
): { newContent: string; newCursorPos: number }

// グラフを画像として取得（PowerPoint出力用）
export async function chartToImage(
  chartElement: HTMLElement
): Promise<string>
```

### 5.3 chartRenderer (グラフレンダリングロジック)

**責務**:
- Chart.jsを使用したグラフのレンダリング
- グラフの更新
- グラフの破棄

**API**:
```typescript
// グラフをレンダリング
export function renderChart(
  canvas: HTMLCanvasElement,
  config: ChartConfig
): Chart | null

// グラフを更新
export function updateChart(
  chart: Chart,
  config: ChartConfig
): void

// グラフを破棄
export function destroyChart(chart: Chart | null): void
```

### 5.4 chartDataParser (データパーサー)

**責務**:
- CSVデータの解析
- JSONデータの解析
- データの検証

**API**:
```typescript
// CSVを解析
export function parseCSV(csvText: string): ChartData | null

// JSONを解析
export function parseJSON(jsonText: string): ChartData | null

// データを検証
export function validateChartData(data: ChartData): boolean
```

---

## 6. UI/UX設計

### 6.1 モーダルレイアウト

```
┌─────────────────────────────────────────────┐
│  📊 グラフを挿入                        [×]   │
├─────────────────────────────────────────────┤
│                                             │
│  グラフタイプ:                               │
│  [📊 棒] [📈 折れ線] [🥧 円] [🍩 ドーナツ]  │
│                                             │
│  データ入力方法:                             │
│  ○ 手動入力  ○ CSV  ○ JSON                │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  データ入力エリア                      │   │
│  │  [テキストエリアまたはテーブル]        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  グラフプレビュー                     │   │
│  │  [Canvas要素でグラフを表示]           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  設定:                                       │
│  ☑ 凡例を表示  ☑ タイトルを表示            │
│                                             │
│  [キャンセル]  [挿入]                       │
└─────────────────────────────────────────────┘
```

### 6.2 データ入力方法

#### 手動入力
- テーブル形式でデータを入力
- 行・列の追加・削除が可能
- リアルタイムでプレビュー更新

#### CSV入力
- テキストエリアにCSV形式で貼り付け
- 自動でパースしてプレビュー表示
- エラーメッセージを表示

#### JSON入力
- テキストエリアにJSON形式で貼り付け
- 自動でパースしてプレビュー表示
- エラーメッセージを表示

### 6.3 スタイル要件

**モーダル**:
- 既存の `TableInserterModal` と同じスタイル
- 背景: `var(--bg-modal)`（テーマ対応）
- 角丸: `border-radius: 12px`
- 影: `box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3)`
- 最大幅: `800px`

**プレビュー**:
- グラフのサイズ: 幅600px、高さ400px（デフォルト）
- レスポンシブ対応
- スライド内での表示を考慮

---

## 7. グラフのHTML生成

### 7.1 基本的なグラフ構造

```html
<div class="slide-chart-container" data-chart-id="{uniqueId}">
  <canvas id="chart-{uniqueId}" width="600" height="400"></canvas>
  <script type="application/json" class="chart-config">
    {JSON.stringify(chartConfig)}
  </script>
</div>
```

### 7.2 グラフの初期化

プレビュー表示時に、Chart.jsを使用してグラフをレンダリング:

```typescript
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const canvas = document.getElementById('chart-{uniqueId}') as HTMLCanvasElement
const config = JSON.parse(scriptElement.textContent || '{}')
const chart = new Chart(canvas, config)
```

### 7.3 CSSスタイル定義

`public/css/slide-styles.css` に追加:

```css
/* グラフコンテナ */
.slide-chart-container {
  margin: 20px 0;
  text-align: center;
  overflow: hidden;
}

.slide-chart-container canvas {
  max-width: 100%;
  height: auto;
}

/* グラフ設定スクリプト（非表示） */
.chart-config {
  display: none;
}
```

---

## 8. 実装フェーズ

### Phase 1: 基盤の構築（必須機能）

**目標**: 基本的なグラフ挿入機能を実装

#### 8.1 依存関係の追加
- [ ] `package.json` に `chart.js` を追加
  ```bash
  npm install chart.js
  ```

#### 8.2 型定義と設定
- [ ] `types/index.ts` に型定義を追加
- [ ] `lib/chartTypes.ts` を作成し、グラフタイプ情報を定義

#### 8.3 基本UIコンポーネント
- [ ] `components/ChartInserter/ChartInserterModal.tsx` を作成
  - [ ] モーダルオーバーレイ
  - [ ] グラフタイプの選択
  - [ ] データ入力パネル（手動入力のみ）
  - [ ] グラフプレビュー
  - [ ] 挿入・キャンセルボタン
  - [ ] キーボード操作（Esc: 閉じる、Enter: 挿入）

#### 8.4 グラフ生成ロジック
- [ ] `lib/chartProcessor.ts` を作成
  - [ ] `generateChartHTML()` 実装
  - [ ] `insertChartToHTML()` 実装
  - [ ] カーソル位置の計算
  - [ ] スライド内の位置検出

#### 8.5 グラフレンダリングロジック
- [ ] `lib/chartRenderer.ts` を作成
  - [ ] Chart.jsの初期化
  - [ ] グラフのレンダリング
  - [ ] グラフの更新
  - [ ] グラフの破棄

#### 8.6 スタイル
- [ ] `components/ChartInserter/ChartInserterModal.module.css` を作成
- [ ] `public/css/slide-styles.css` にグラフスタイルを追加

#### 8.7 メインページへの統合
- [ ] `app/page.tsx` に統合
  - [ ] `ChartInserterModal` コンポーネントを追加
  - [ ] 状態管理（モーダルの開閉）

#### 8.8 メニューへの追加
- [ ] `components/Menu/HamburgerMenu.tsx` に「グラフを挿入」ボタンを追加
  - [ ] 「📊 グラフを挿入」メニュー項目
  - [ ] クリックでモーダルを開く

**確認事項**:
- モーダルが表示される
- グラフタイプを選択できる
- データを入力できる
- グラフがプレビューに表示される
- グラフがエディタに挿入される
- プレビューで正しく表示される

---

### Phase 2: データ入力方法の拡張（重要機能）

**目標**: CSV、JSON形式でのデータ入力をサポート

#### 8.9 データパーサー
- [ ] `lib/chartDataParser.ts` を作成
  - [ ] `parseCSV()` 実装
  - [ ] `parseJSON()` 実装
  - [ ] `validateChartData()` 実装
  - [ ] エラーハンドリング

#### 8.10 データ入力パネルの拡張
- [ ] `components/ChartInserter/DataInputPanel.tsx` を作成
  - [ ] 入力方法の切り替え（手動、CSV、JSON）
  - [ ] CSV入力エリア
  - [ ] JSON入力エリア
  - [ ] エラーメッセージの表示

**確認事項**:
- CSVデータが正しくパースされる
- JSONデータが正しくパースされる
- エラーメッセージが適切に表示される
- プレビューが正しく更新される

---

### Phase 3: グラフ設定の拡張（重要機能）

**目標**: より詳細なグラフ設定を可能にする

#### 8.11 グラフ設定パネル
- [ ] `components/ChartInserter/ChartConfigPanel.tsx` を作成
  - [ ] タイトルの設定
  - [ ] 凡例の表示/非表示
  - [ ] 色のカスタマイズ
  - [ ] 軸ラベルの設定
  - [ ] グラフサイズの調整

#### 8.12 グラフオプションの適用
- [ ] Chart.jsのオプションを設定に反映
- [ ] リアルタイムでプレビュー更新

**確認事項**:
- 設定が正しく反映される
- プレビューがリアルタイムで更新される
- すべての設定が保存される

---

### Phase 4: プレビュー機能の強化（重要機能）

**目標**: プレビューでのグラフ表示を改善

#### 8.13 プレビューコンポーネント
- [ ] `components/ChartInserter/ChartPreview.tsx` を作成
  - [ ] グラフのレンダリング
  - [ ] リアルタイム更新
  - [ ] エラーメッセージの表示
  - [ ] ローディング表示

#### 8.14 プレビューの最適化
- [ ] 不要な再レンダリングの防止
- [ ] メモ化の適用

**確認事項**:
- プレビューがスムーズに更新される
- パフォーマンスが良好である

---

### Phase 5: 高度な機能（オプション）

**目標**: より使いやすい機能を追加

#### 8.15 キーボードショートカット
- [ ] キーボードショートカットの追加
  - [ ] `Ctrl+G` / `Cmd+G` でグラフ挿入モーダルを開く
  - [ ] `hooks/useKeyboardShortcuts.ts` に追加

#### 8.16 グラフテンプレート
- [ ] よく使うグラフのテンプレート
  - [ ] 売上推移（折れ線グラフ）
  - [ ] 部門別実績（棒グラフ）
  - [ ] 構成比（円グラフ）
  - [ ] カスタムテンプレートの保存（将来の拡張）

#### 8.17 グラフの編集機能
- [ ] 挿入後のグラフを編集可能にする
  - [ ] グラフをクリックして編集モーダルを開く
  - [ ] データの更新
  - [ ] 設定の変更

**確認事項**:
- キーボードショートカットが機能する
- テンプレートから素早く挿入できる

---

### Phase 6: ポリッシュ（完成度向上）

**目標**: 完成度を高める

#### 8.18 アクセシビリティ
- [ ] ARIA属性の追加
  - [ ] `role="dialog"`
  - [ ] `aria-label`, `aria-labelledby`
  - [ ] `aria-describedby`
- [ ] キーボード操作の完全対応
  - [ ] Tab順序の適切な制御
  - [ ] フォーカストラップ

#### 8.19 エラーハンドリング
- [ ] 無効な入力値の処理
- [ ] エディタが利用できない場合の処理
- [ ] エッジケースの対応

#### 8.20 パフォーマンス最適化
- [ ] 不要な再レンダリングの防止
- [ ] メモ化の適用
- [ ] グラフのレンダリング最適化

#### 8.21 レスポンシブ対応
- [ ] モバイルでの表示確認
- [ ] 小さな画面でのUI調整

---

## 9. 実装の考慮事項

### 9.1 Chart.jsの初期化

**問題**: Chart.jsをクライアント側でのみ使用する必要がある
**対策**:
- `'use client'` ディレクティブを使用
- 動的インポートを使用してサーバー側でのエラーを回避

### 9.2 グラフの一意性

**問題**: 複数のグラフを挿入する際、IDの衝突を避ける必要がある
**対策**:
- ユニークIDを生成（UUIDまたはタイムスタンプ）
- グラフIDをHTMLに埋め込む

### 9.3 プレビューでのグラフ表示

**問題**: プレビューiframe内でグラフをレンダリングする必要がある
**対策**:
- iframe内でChart.jsを初期化
- グラフ設定をJSONとして埋め込み、プレビュー時に読み込む

### 9.4 PowerPoint出力への対応

**問題**: PowerPoint出力時にグラフを画像として変換する必要がある
**対策**:
- Canvas要素を画像データに変換（`canvas.toDataURL()`）
- グラフの設定を保存して、必要時に再レンダリング

### 9.5 データの検証

**問題**: 無効なデータが入力される可能性がある
**対策**:
- データ検証ロジックを実装
- エラーメッセージを分かりやすく表示
- デフォルト値の提供

---

## 10. テスト計画

### 10.1 単体テスト（オプション）

- `chartProcessor.ts` の各関数
- `chartDataParser.ts` の各関数
- グラフのHTML生成ロジック

### 10.2 統合テスト（手動確認）

- [ ] モーダルが正しく開閉する
- [ ] グラフタイプを選択できる
- [ ] データを入力できる
- [ ] すべてのグラフタイプが正しく表示される
- [ ] グラフがエディタに正しく挿入される
- [ ] プレビューで正しく表示される
- [ ] CSVデータが正しくパースされる
- [ ] JSONデータが正しくパースされる
- [ ] グラフ設定が正しく反映される
- [ ] キーボード操作が機能する
- [ ] レスポンシブに対応している
- [ ] テーマ（ダーク/ライト）に対応している

---

## 11. 今後の拡張案

### 11.1 グラフの編集機能

- 挿入後のグラフを編集可能にする
- データの更新
- 設定の変更

### 11.2 グラフのスタイルカスタマイズ

- ユーザーが独自のスタイルを定義
- 色のカスタマイズ
- フォントサイズの調整

### 11.3 データソースの拡張

- Excelファイルからのインポート
- Google Sheetsからのインポート
- APIからのデータ取得

### 11.4 グラフテンプレート

- よく使うグラフのテンプレートを保存
- テンプレートの共有機能

### 11.5 アニメーション

- グラフのアニメーション効果
- データ更新時のアニメーション

---

## 12. 実装の優先順位

### 必須（Phase 1）
✅ 基本的なグラフ挿入機能
✅ グラフタイプの選択（棒、折れ線、円）
✅ 手動データ入力
✅ グラフプレビュー
✅ エディタへの挿入

### 推奨（Phase 2-3）
✅ CSV/JSONデータ入力
✅ グラフ設定の拡張
✅ プレビュー機能の強化

### オプション（Phase 4-6）
✅ キーボードショートカット
✅ グラフテンプレート
✅ グラフの編集機能
✅ アクセシビリティ強化
✅ パフォーマンス最適化

---

## 13. 実装開始前の確認事項

- [ ] 既存のコードベースの理解
- [ ] 表挿入機能の実装パターンの確認
- [ ] モーダル実装パターンの確認
- [ ] Chart.jsのドキュメント確認
- [ ] 実装環境の準備

---

## 14. 参考資料

### 既存実装の参考
- `components/TableInserter/TableInserterModal.tsx` - モーダル実装パターン
- `lib/tableProcessor.ts` - エディタへの挿入ロジック
- `lib/imageProcessor.ts` - エディタへの挿入ロジック
- `components/Menu/HamburgerMenu.tsx` - メニュー統合パターン

### 外部リソース
- [Chart.js公式ドキュメント](https://www.chartjs.org/)
- [Chart.js GitHub](https://github.com/chartjs/Chart.js)
- [Chart.js TypeScript型定義](https://www.npmjs.com/package/@types/chart.js)

---

## 15. 変更履歴

- 2025-12-20: 初版作成

---

**注意**: この計画は実装の指針です。実装中に発見された問題や要件変更に応じて柔軟に調整してください。


