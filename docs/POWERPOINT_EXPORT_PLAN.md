# PowerPoint形式エクスポート機能 実装計画

## 1. 概要

スライドエディタにPowerPoint形式（.pptx）でのエクスポート機能を追加します。HTMLスライドをPowerPointファイルに変換し、ユーザーが既存のPowerPointアプリケーションで開いて編集・共有できるようにします。

### 目標
- HTMLスライドをPowerPoint形式（.pptx）に変換
- テキスト、画像、表、グラフ・チャートなどの主要要素をサポート
- クライアントサイドのみで完結（サーバー不要）
- 既存のアーキテクチャと統合

### 背景
- WELLBEING_EVALUATION.md で重要度5（最重要）として評価されている
- Phase 5（共有・配布）の優先機能として位置づけられている
- 互換性、共有に重要な機能

### ⚠️ 実装順序について

**重要**: この機能は、**グラフ・チャート挿入機能の実装後に開発することを推奨**します。

理由:
1. グラフ・チャート機能が実装されていれば、PowerPoint出力時にそれらも変換できる
2. 機能の順序として、コンテンツ作成機能（グラフ・チャート）を先に実装し、その後エクスポート機能を実装する方が自然
3. エクスポート機能を実装する際に、すべてのコンテンツタイプ（テキスト、画像、表、グラフ）を一度にサポートできる

**推奨実装順序**:
1. Phase 4: グラフ・チャート挿入機能の実装
2. Phase 5: PowerPoint形式エクスポート機能の実装（グラフ・チャートを含む）

---

## 2. 技術スタック・アーキテクチャ

### 使用技術
- **ライブラリ**: `pptxgenjs` (npmパッケージ)
  - ブラウザ上で動作するJavaScriptライブラリ
  - MITライセンス
  - TypeScript型定義あり
- **フレームワーク**: Next.js (既存)
- **言語**: TypeScript
- **スタイリング**: CSS Modules (既存パターンに準拠)

### アーキテクチャパターン
既存の実装パターンに従う:
- `lib/imageProcessor.ts` の実装パターンを参考
- `lib/tableProcessor.ts` の実装パターンを参考
- `components/Menu/HamburgerMenu.tsx` のメニュー統合パターンを参考

---

## 3. ファイル構成

```
slide-editor-nextjs/
├── components/
│   └── PowerPointExporter/
│       ├── PowerPointExporterModal.tsx          # エクスポート設定モーダル（オプション）
│       └── PowerPointExporterModal.module.css    # スタイル
├── lib/
│   └── powerpointExporter.ts                    # PowerPoint生成ロジック
├── types/
│   └── index.ts                                 # 型定義に追加
└── app/
    └── page.tsx                                 # メインページに統合
```

---

## 4. データ構造・型定義

### 4.1 TypeScript型定義

`types/index.ts` に追加:

```typescript
// PowerPointエクスポート設定
export interface PowerPointExportConfig {
  includePageNumbers: boolean      // ページ番号を含めるか
  slideSize: 'widescreen' | 'standard' | 'custom'  // スライドサイズ
  customWidth?: number              // カスタム幅（インチ）
  customHeight?: number             // カスタム高さ（インチ）
  imageQuality: 'high' | 'medium' | 'low'  // 画像品質
}

// スライド要素の型
export interface SlideElement {
  type: 'text' | 'image' | 'table' | 'list'
  content: string
  style?: {
    fontSize?: number
    color?: string
    alignment?: 'left' | 'center' | 'right'
    bold?: boolean
    italic?: boolean
  }
  position?: {
    x: number
    y: number
    w: number
    h: number
  }
}
```

---

## 5. コンポーネント設計

### 5.1 powerpointExporter (メインロジック)

**責務**:
- HTMLスライドを解析
- PowerPointオブジェクトを生成
- ファイルとしてダウンロード

**API**:
```typescript
// HTMLスライドをPowerPointに変換
export async function exportToPowerPoint(
  htmlContent: string,
  config?: PowerPointExportConfig
): Promise<void>

// スライドHTMLを解析して要素を抽出
export function parseSlideHTML(slideHTML: string): SlideElement[]

// 画像を取得（base64またはローカルストレージから）
export async function getImageData(imageSrc: string): Promise<string | null>
```

### 5.2 PowerPointExporterModal (オプションコンポーネント)

**責務**:
- エクスポート設定の入力
- エクスポートの実行

**Props**:
```typescript
interface PowerPointExporterModalProps {
  isOpen: boolean
  onClose: () => void
  htmlContent: string
  onStatusUpdate?: (message: string) => void
}
```

---

## 6. 実装フェーズ

### Phase 1: 基盤の構築（必須機能）

**目標**: 基本的なテキストスライドのPowerPoint変換を実装

#### 6.1 依存関係の追加
- [ ] `package.json` に `pptxgenjs` を追加
  ```bash
  npm install pptxgenjs
  ```

#### 6.2 型定義と設定
- [ ] `types/index.ts` に型定義を追加
- [ ] `lib/powerpointExporter.ts` を作成
  - [ ] 基本的なエクスポート関数の実装
  - [ ] スライド抽出ロジック（既存の `extractSlides()` を使用）

#### 6.3 HTML解析ロジック
- [ ] テキスト要素の抽出
  - [ ] `<h1>` タイトルの抽出
  - [ ] `<h2>` サブタイトルの抽出
  - [ ] `<p>` 段落の抽出
  - [ ] `<li>` リスト項目の抽出
- [ ] HTMLタグを除去してテキストのみ取得
- [ ] スタイル情報の抽出（フォントサイズ、色など）

#### 6.4 PowerPoint生成（基本）
- [ ] pptxgenjsを使用してプレゼンテーションオブジェクトを作成
- [ ] スライドサイズの設定（A4横向き: 11.69" x 8.27"）
- [ ] 各スライドをPowerPointスライドに変換
  - [ ] タイトル（h1）をスライドタイトルとして追加
  - [ ] テキストコンテンツを追加
- [ ] ファイルとしてダウンロード

#### 6.5 メニューへの統合
- [ ] `components/Menu/HamburgerMenu.tsx` に「PowerPoint形式でエクスポート」ボタンを追加
  - [ ] 「💾 データ」セクションに追加
  - [ ] クリックでエクスポートを実行
- [ ] `app/page.tsx` に統合（必要に応じて）

**確認事項**:
- 基本的なテキストスライドがPowerPointに変換される
- ファイルがダウンロードされる
- PowerPointで開いて正しく表示される

---

### Phase 2: 画像のサポート（重要機能）

**目標**: 画像を含むスライドをPowerPointに変換

#### 6.6 画像処理ロジック
- [ ] 画像要素の抽出
  - [ ] `<img>` タグの検出
  - [ ] `src` 属性から画像データを取得
- [ ] 画像データの取得
  - [ ] base64画像（`data:image/...`）の処理
  - [ ] ローカルストレージ画像（`images/...`）の処理
  - [ ] 外部URL画像の処理（CORS対応）
- [ ] 画像サイズの調整
  - [ ] スライドサイズに合わせてリサイズ
  - [ ] アスペクト比を維持

#### 6.7 PowerPointへの画像追加
- [ ] pptxgenjsで画像をスライドに追加
- [ ] 画像の位置とサイズの設定
- [ ] 2分割レイアウト（`slide-split`）の対応
  - [ ] 左側にテキスト、右側に画像

**確認事項**:
- 画像がPowerPointに正しく表示される
- 画像サイズが適切に調整される
- 2分割レイアウトが正しく変換される

---

### Phase 3: 表のサポート（重要機能）

**目標**: 表を含むスライドをPowerPointに変換

#### 6.8 表処理ロジック
- [ ] 表要素の抽出
  - [ ] `<table>` タグの検出
  - [ ] `<thead>`, `<tbody>`, `<tr>`, `<td>`, `<th>` の解析
- [ ] 表データの構造化
  - [ ] 行と列のデータを配列に変換
  - [ ] ヘッダー行の識別
  - [ ] セルのテキスト抽出

#### 6.9 PowerPointへの表追加
- [ ] pptxgenjsで表をスライドに追加
- [ ] 表スタイルの適用
  - [ ] ボーダー、背景色などのスタイル
- [ ] 表のサイズと位置の調整

**確認事項**:
- 表がPowerPointに正しく表示される
- 表スタイルが適切に適用される
- ヘッダー行が正しく識別される

---

### Phase 3.5: グラフ・チャートのサポート（重要機能）

**前提条件**: グラフ・チャート挿入機能が実装されていること

**目標**: グラフ・チャートを含むスライドをPowerPointに変換

#### 6.10 グラフ・チャート処理ロジック
- [ ] グラフ要素の抽出
  - [ ] グラフ・チャートのHTML要素の検出（実装方法に依存）
  - [ ] Canvas要素またはSVG要素の検出
  - [ ] グラフデータの抽出
- [ ] グラフデータの取得
  - [ ] グラフの設定（タイプ、データ、オプション）を取得
  - [ ] グラフを画像としてレンダリング（Canvas/SVG → 画像）

#### 6.11 PowerPointへのグラフ追加
- [ ] グラフを画像としてPowerPointに追加
  - [ ] Canvas/SVGを画像データに変換
  - [ ] 画像をスライドに追加
- [ ] グラフのサイズと位置の調整
- [ ] グラフタイプの識別（棒グラフ、折れ線グラフ、円グラフなど）

**確認事項**:
- グラフ・チャートがPowerPointに正しく表示される
- グラフのサイズが適切に調整される
- グラフのデータが正しく反映される

**注意**: グラフ・チャート挿入機能の実装方法（Chart.js、D3.js、Canvas APIなど）に応じて、この実装は調整が必要です。

---

### Phase 4: スタイルの再現（重要機能）

**目標**: HTML/CSSのスタイルをPowerPointスタイルに変換

#### 6.12 スタイル抽出
- [ ] フォントサイズの抽出
  - [ ] CSSクラス（`.slide-title`, `.slide-subtitle`など）から推定
  - [ ] インラインスタイルから抽出
- [ ] 色の抽出
  - [ ] テキスト色
  - [ ] 背景色
- [ ] 配置の抽出
  - [ ] 左揃え、中央揃え、右揃え

#### 6.13 PowerPointスタイルの適用
- [ ] フォントサイズの設定
- [ ] 色の設定（RGB値の変換）
- [ ] 配置の設定
- [ ] 太字、斜体などの書式設定

**確認事項**:
- スタイルがPowerPointに正しく反映される
- フォントサイズが適切に変換される
- 色が正しく表示される

---

### Phase 5: 高度な機能（オプション）

**目標**: より高度な機能を追加

#### 6.14 エクスポート設定モーダル
- [ ] `components/PowerPointExporter/PowerPointExporterModal.tsx` を作成
  - [ ] スライドサイズの選択
  - [ ] 画像品質の選択
  - [ ] ページ番号の有無の選択
- [ ] 設定を保存してエクスポートに反映

#### 6.15 エラーハンドリング
- [ ] 画像読み込みエラーの処理
- [ ] 無効なHTMLの処理
- [ ] エラーメッセージの表示

#### 6.16 パフォーマンス最適化
- [ ] 大量のスライドの処理
- [ ] 画像の最適化（リサイズ、圧縮）
- [ ] 進捗表示（オプション）

---

## 7. 実装の考慮事項

### 7.1 HTML解析の複雑さ

**問題**: HTMLの構造が複雑で、すべてのケースをカバーするのが困難
**対策**:
- 主要な要素（h1, h2, p, ul, li, img, table）に焦点を当てる
- 段階的にサポート範囲を拡大
- 解析できない要素は警告を表示

### 7.2 画像の処理

**問題**: 画像の形式やサイズが多様
**対策**:
- base64画像とローカルストレージ画像を優先的にサポート
- 外部URL画像はCORS制限があるため、警告を表示
- 画像サイズをスライドサイズに合わせて自動調整

### 7.3 レイアウトの再現

**問題**: HTML/CSSのレイアウトをPowerPointの座標系に変換するのが困難
**対策**:
- シンプルなレイアウト（上下配置）を優先
- 2分割レイアウト（`slide-split`）を特別に処理
- 複雑なレイアウトは簡略化して変換

### 7.4 フォントの互換性

**問題**: 日本語フォントがPowerPointで正しく表示されない可能性
**対策**:
- デフォルトフォントを設定（日本語対応フォント）
- ユーザーがPowerPointでフォントを変更できることを想定

### 7.5 ファイルサイズ

**問題**: 画像が多い場合、ファイルサイズが大きくなる
**対策**:
- 画像品質の選択肢を提供
- 画像のリサイズと圧縮を実装

---

## 8. 実装の詳細

### 8.1 スライド抽出

既存の `extractSlides()` 関数を使用:

```typescript
import { extractSlides } from '@/lib/slideReorder'

const slides = extractSlides(htmlContent)
```

### 8.2 HTML解析の例

```typescript
function parseSlideHTML(slideHTML: string): SlideElement[] {
  const elements: SlideElement[] = []
  
  // h1タイトルを抽出
  const h1Match = slideHTML.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
  if (h1Match) {
    elements.push({
      type: 'text',
      content: h1Match[1].replace(/<[^>]*>/g, '').trim(),
      style: {
        fontSize: 48,
        bold: true,
        alignment: 'center'
      }
    })
  }
  
  // 画像を抽出
  const imgMatches = slideHTML.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g)
  for (const match of imgMatches) {
    elements.push({
      type: 'image',
      content: match[1]
    })
  }
  
  // 表を抽出
  const tableMatch = slideHTML.match(/<table[^>]*>([\s\S]*?)<\/table>/)
  if (tableMatch) {
    elements.push({
      type: 'table',
      content: tableMatch[1]
    })
  }
  
  return elements
}
```

### 8.3 PowerPoint生成の例

```typescript
import PptxGenJS from 'pptxgenjs'

async function exportToPowerPoint(htmlContent: string): Promise<void> {
  const pptx = new PptxGenJS()
  
  // スライドサイズを設定（A4横向き）
  pptx.layout = 'LAYOUT_WIDE'
  pptx.defineLayout({
    name: 'A4_LANDSCAPE',
    width: 11.69,
    height: 8.27
  })
  pptx.layout = 'A4_LANDSCAPE'
  
  // スライドを抽出
  const slides = extractSlides(htmlContent)
  
  // 各スライドを変換
  for (const slide of slides) {
    const slideElements = parseSlideHTML(slide.html)
    const pptxSlide = pptx.addSlide()
    
    // タイトルを追加
    const titleElement = slideElements.find(e => e.type === 'text' && e.style?.fontSize === 48)
    if (titleElement) {
      pptxSlide.addText(titleElement.content, {
        x: 0.5,
        y: 0.5,
        w: 10.69,
        h: 1,
        fontSize: 48,
        bold: true,
        align: 'center'
      })
    }
    
    // 画像を追加
    const imageElements = slideElements.filter(e => e.type === 'image')
    for (const imgElement of imageElements) {
      const imageData = await getImageData(imgElement.content)
      if (imageData) {
        pptxSlide.addImage({
          data: imageData,
          x: 1,
          y: 2,
          w: 4,
          h: 3
        })
      }
    }
  }
  
  // ファイルとしてダウンロード
  await pptx.writeFile({ fileName: 'presentation.pptx' })
}
```

---

## 9. テスト計画

### 9.1 単体テスト（オプション）

- `powerpointExporter.ts` の各関数
- HTML解析ロジック
- 画像取得ロジック

### 9.2 統合テスト（手動確認）

- [ ] 基本的なテキストスライドが変換される
- [ ] 画像を含むスライドが変換される
- [ ] 表を含むスライドが変換される
- [ ] 2分割レイアウトが正しく変換される
- [ ] 複数のスライドが正しく変換される
- [ ] PowerPointで開いて正しく表示される
- [ ] ファイルサイズが適切である
- [ ] エラーハンドリングが機能する

---

## 10. 今後の拡張案

### 10.1 アニメーション

- スライド遷移のアニメーション
- 要素のアニメーション

### 10.2 テンプレート

- PowerPointテンプレートの適用
- カスタムテンプレートのサポート

### 10.3 スピーカーノート

- HTMLコメントをスピーカーノートに変換

### 10.4 グラフ・チャート

- ✅ グラフ・チャートのサポート（Phase 3.5で実装予定、グラフ・チャート機能実装後）

---

## 11. 実装の優先順位

### 前提条件
⚠️ **グラフ・チャート挿入機能の実装**（Phase 4で実装予定）

### 必須（Phase 1-2）
✅ 基本的なテキストスライドの変換
✅ 画像のサポート
✅ メニューからのエクスポート

### 推奨（Phase 3-4）
✅ 表のサポート
✅ グラフ・チャートのサポート（グラフ・チャート機能実装後）
✅ スタイルの再現

### オプション（Phase 5）
✅ エクスポート設定モーダル
✅ エラーハンドリング強化
✅ パフォーマンス最適化

---

## 12. 実装開始前の確認事項

### 必須の前提条件
- [ ] **グラフ・チャート挿入機能が実装されている**（重要）
- [ ] グラフ・チャートの実装方法（Chart.js、D3.js、Canvas APIなど）を理解している

### 技術的な確認事項
- [ ] 既存のコードベースの理解
- [ ] `extractSlides()` 関数の動作確認
- [ ] 画像処理ロジックの理解
- [ ] 表処理ロジックの理解
- [ ] pptxgenjsのドキュメント確認
- [ ] 実装環境の準備

---

## 13. 参考資料

### 既存実装の参考
- `lib/slideReorder.ts` - スライド抽出ロジック
- `lib/imageProcessor.ts` - 画像処理ロジック
- `lib/tableProcessor.ts` - 表処理ロジック
- `lib/imageStorage.ts` - 画像ストレージ管理
- `components/Menu/HamburgerMenu.tsx` - メニュー統合パターン

### 外部リソース
- [pptxgenjs公式ドキュメント](https://gitbrent.github.io/PptxGenJS/)
- [pptxgenjs GitHub](https://github.com/gitbrent/PptxGenJS)
- PowerPointファイル形式（OOXML）の仕様

---

## 14. 変更履歴

- 2025-12-20: 初版作成
- 2025-12-20: 実装順序を更新（グラフ・チャート機能実装後にPowerPoint出力機能を実装する方針を追加）

---

**注意**: この計画は実装の指針です。実装中に発見された問題や要件変更に応じて柔軟に調整してください。

