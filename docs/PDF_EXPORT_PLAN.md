# PDF直接エクスポート機能 実装計画

## 1. 概要

スライドエディタにPDF形式（.pdf）でのエクスポート機能を追加します。HTMLスライドをPDFファイルに変換し、ユーザーが共有・配布・印刷できるようにします。

### 目標
- HTMLスライドをPDF形式（.pdf）に変換
- テキスト、画像、表、グラフ・チャート、数式、コードブロックなどの主要要素をサポート
- クライアントサイドのみで完結（サーバー不要）
- 既存のアーキテクチャと統合
- A4横向き・16:9（1920×1080）の両方のスライドサイズに対応

### 背景
- WELLBEING_EVALUATION.md で重要度5（最重要）として評価されている
- Phase 5（共有・配布）の最優先機能として位置づけられている
- 共有・配布に必須の機能

---

## 2. 技術スタック・アーキテクチャ

### 使用技術
- **ライブラリ**: 
  - `jspdf` (npmパッケージ) - PDF生成
  - `html2canvas` (npmパッケージ) - HTML/CSSをCanvasに変換
  - ブラウザ上で動作するJavaScriptライブラリ
  - MITライセンス
  - TypeScript型定義あり
- **フレームワーク**: Next.js (既存)
- **言語**: TypeScript
- **スタイリング**: CSS Modules (既存パターンに準拠)

### アーキテクチャパターン
既存の実装パターンに従う:
- `lib/htmlProcessor.ts` の実装パターンを参考
- `lib/imageStorage.ts` の実装パターンを参考
- `components/Menu/HamburgerMenu.tsx` のメニュー統合パターンを参考

---

## 3. ファイル構成

```
slide-editor-nextjs/
├── components/
│   └── PDFExporter/
│       ├── PDFExporterModal.tsx          # エクスポート設定モーダル（オプション）
│       └── PDFExporterModal.module.css    # スタイル
├── lib/
│   └── pdfExporter.ts                    # PDF生成ロジック
├── types/
│   └── index.ts                          # 型定義に追加
└── app/
    └── page.tsx                          # メインページに統合
```

---

## 4. データ構造・型定義

### 4.1 TypeScript型定義

`types/index.ts` に追加:

```typescript
// PDFエクスポート設定
export interface PDFExportConfig {
  includePageNumbers: boolean      // ページ番号を含めるか
  pageSize: 'A4' | 'A3' | 'letter' | 'custom'  // ページサイズ
  orientation: 'landscape' | 'portrait'  // 向き
  customWidth?: number              // カスタム幅（mm）
  customHeight?: number             // カスタム高さ（mm）
  imageQuality: 'high' | 'medium' | 'low'  // 画像品質（html2canvasのscale）
  margin: {                          // 余白（mm）
    top: number
    right: number
    bottom: number
    left: number
  }
  fileName?: string                  // ファイル名
}
```

---

## 5. コンポーネント設計

### 5.1 pdfExporter (メインロジック)

**責務**:
- HTMLスライドを解析
- 各スライドをCanvasに変換
- PDFオブジェクトを生成
- ファイルとしてダウンロード

**API**:
```typescript
// HTMLスライドをPDFに変換
export async function exportToPDF(
  htmlContent: string,
  config?: PDFExportConfig
): Promise<void>

// スライドHTMLを処理（画像、グラフ、数式などをレンダリング済みに）
export async function processSlideForPDF(
  slideHTML: string,
  sizeConfig?: SlideSizeConfig
): Promise<string>

// スライドをCanvasに変換
export async function slideToCanvas(
  slideElement: HTMLElement,
  scale?: number
): Promise<HTMLCanvasElement>
```

### 5.2 PDFExporterModal (オプションコンポーネント)

**責務**:
- エクスポート設定の入力
- エクスポートの実行
- 進捗表示

**Props**:
```typescript
interface PDFExporterModalProps {
  isOpen: boolean
  onClose: () => void
  htmlContent: string
  onStatusUpdate?: (message: string) => void
}
```

---

## 6. 実装フェーズ

### Phase 1: 基盤の構築（必須機能）

**目標**: 基本的なテキストスライドのPDF変換を実装

#### 6.1 依存関係の追加
- [ ] `package.json` に `jspdf` と `html2canvas` を追加
  ```bash
  npm install jspdf html2canvas
  ```
  ```bash
  npm install --save-dev @types/html2canvas
  ```

#### 6.2 型定義と設定
- [ ] `types/index.ts` に型定義を追加
- [ ] `lib/pdfExporter.ts` を作成
  - [ ] 基本的なエクスポート関数の実装
  - [ ] スライド抽出ロジック（既存の `extractSlides()` を使用）

#### 6.3 スライド処理ロジック
- [ ] スライドHTMLを処理済みHTMLに変換
  - [ ] `processHTMLForPreview()` を使用して画像、グラフ、数式などをレンダリング
  - [ ] CSSをインライン化
- [ ] 処理済みHTMLを一時的なDOM要素に追加
  - [ ] iframeを使用してスライドを分離
  - [ ] 各スライドを個別に処理できるようにする

#### 6.4 PDF生成（基本）
- [ ] jsPDFを使用してPDFオブジェクトを作成
- [ ] ページサイズの設定（A4横向き: 297mm x 210mm）
- [ ] 各スライドを処理
  - [ ] html2canvasでスライドをCanvasに変換
  - [ ] Canvasを画像データに変換
  - [ ] PDFページに画像を追加
- [ ] ファイルとしてダウンロード

#### 6.5 メニューへの統合
- [ ] `components/Menu/HamburgerMenu.tsx` に「PDF形式でエクスポート」ボタンを追加
  - [ ] 「💾 データ」セクションに追加
  - [ ] クリックでエクスポートを実行

**確認事項**:
- 基本的なテキストスライドがPDFに変換される
- ファイルがダウンロードされる
- PDFビューアで開いて正しく表示される

---

### Phase 2: 画像・表のサポート（重要機能）

**目標**: 画像と表を含むスライドをPDFに変換

#### 6.6 画像処理
- [ ] 画像の読み込み完了を待つ
  - [ ] すべての画像が読み込まれるまで待機
  - [ ] 画像読み込みエラーの処理
- [ ] base64画像の処理
  - [ ] 既に処理済みHTMLに含まれていることを確認
- [ ] ローカルストレージ画像の処理
  - [ ] `convertStorageImagesToDataURI()` が既に適用されていることを確認

#### 6.7 表のレンダリング
- [ ] HTMLテーブルの正しいレンダリング
  - [ ] 表のスタイルが正しく適用されることを確認
  - [ ] ボーダー、背景色などの保持

**確認事項**:
- 画像がPDFに正しく表示される
- 表がPDFに正しく表示される
- 2分割レイアウトが正しく変換される

---

### Phase 3: グラフ・チャート・数式・コードブロックのサポート（重要機能）

**目標**: グラフ・チャート・数式・コードブロックを含むスライドをPDFに変換

#### 6.8 グラフ・チャートの処理
- [ ] Chart.jsのグラフをCanvasとして取得
  - [ ] Chart.jsインスタンスからCanvas要素を取得
  - [ ] Canvasを画像としてPDFに追加
- [ ] グラフのレンダリング完了を待つ
  - [ ] Chart.jsの初期化完了を待機
  - [ ] アニメーション完了を待機（オプション）

#### 6.9 数式の処理
- [ ] KaTeXのレンダリング完了を待つ
  - [ ] 数式が正しくレンダリングされることを確認
  - [ ] インライン数式とブロック数式の両方に対応

#### 6.10 コードブロックの処理
- [ ] Prism.jsのシンタックスハイライトが適用されていることを確認
  - [ ] コードブロックが正しくレンダリングされることを確認
  - [ ] 行番号が正しく表示されることを確認

**確認事項**:
- グラフ・チャートがPDFに正しく表示される
- 数式がPDFに正しく表示される
- コードブロックがPDFに正しく表示される

---

### Phase 4: スタイル・レイアウトの最適化（重要機能）

**目標**: PDF出力の品質を向上させる

#### 6.11 ページサイズの調整
- [ ] 現在のスライドサイズ設定に合わせてPDFページサイズを設定
  - [ ] A4横向き: 297mm x 210mm
  - [ ] 16:9（1920×1080）: 適切なサイズに変換
- [ ] スライドサイズ設定を取得
  - [ ] `useSlideSize` フックから取得

#### 6.12 レンダリング品質の向上
- [ ] html2canvasの設定を最適化
  - [ ] `scale` オプションで解像度を調整（デフォルト: 2）
  - [ ] `useCORS: true` でクロスオリジン画像をサポート
  - [ ] `backgroundColor: '#ffffff'` で背景色を設定
- [ ] フォントの読み込み完了を待つ
  - [ ] カスタムフォントが正しく表示されるように

#### 6.13 余白・スケーリングの調整
- [ ] スライドがPDFページに収まるようにスケーリング
  - [ ] アスペクト比を維持
  - [ ] 必要に応じて余白を追加

**確認事項**:
- PDFの品質が高い（文字が鮮明、画像がきれい）
- スライドのレイアウトが正しく保持される
- フォントが正しく表示される

---

### Phase 5: 高度な機能（オプション）

**目標**: より高度な機能を追加

#### 6.14 エクスポート設定モーダル
- [ ] `components/PDFExporter/PDFExporterModal.tsx` を作成
  - [ ] ページサイズの選択
  - [ ] 向きの選択（横向き/縦向き）
  - [ ] 画像品質の選択
  - [ ] ページ番号の有無の選択
  - [ ] ファイル名の入力
- [ ] 設定を保存してエクスポートに反映

#### 6.15 進捗表示
- [ ] エクスポート進捗の表示
  - [ ] 現在処理中のスライド番号を表示
  - [ ] プログレスバーを表示
  - [ ] エラーメッセージの表示

#### 6.16 エラーハンドリング
- [ ] 画像読み込みエラーの処理
- [ ] Canvas変換エラーの処理
- [ ] PDF生成エラーの処理
- [ ] エラーメッセージの表示

#### 6.17 パフォーマンス最適化
- [ ] 大量のスライドの処理
  - [ ] メモリ使用量の最適化
  - [ ] 非同期処理の最適化
- [ ] 画像の最適化（必要に応じてリサイズ）

---

## 7. 実装の考慮事項

### 7.1 HTMLのレンダリング

**問題**: HTMLをCanvasに変換する際、すべての要素が正しくレンダリングされない可能性
**対策**:
- `processHTMLForPreview()` を使用して画像、グラフ、数式などを事前にレンダリング
- html2canvasのオプションを適切に設定
- iframeを使用してスライドを分離し、各スライドを個別に処理

### 7.2 フォントの読み込み

**問題**: カスタムフォントが正しく表示されない可能性
**対策**:
- フォントの読み込み完了を待つ
- `document.fonts.ready` を使用
- フォールバックフォントを設定

### 7.3 画像の読み込み

**問題**: 画像が読み込まれる前にPDFが生成される可能性
**対策**:
- すべての画像の読み込み完了を待つ
- `Image` オブジェクトを使用して画像の読み込みを監視
- タイムアウトを設定（デフォルト: 30秒）

### 7.4 グラフ・チャートのレンダリング

**問題**: Chart.jsのグラフが正しくレンダリングされない可能性
**対策**:
- Chart.jsの初期化完了を待つ
- Canvas要素を直接取得して使用
- アニメーションを無効化（オプション）

### 7.5 ファイルサイズ

**問題**: 画像が多い場合、ファイルサイズが大きくなる
**対策**:
- html2canvasの `scale` オプションで解像度を調整
- 画像品質の選択肢を提供
- 必要に応じて画像を圧縮

### 7.6 メモリ使用量

**問題**: 大量のスライドを処理する際、メモリ不足になる可能性
**対策**:
- 各スライドを順次処理し、メモリを解放
- Canvasオブジェクトを適切に破棄
- 大きな画像をリサイズ

---

## 8. 実装の詳細

### 8.1 スライド抽出

既存の `extractSlides()` 関数を使用:

```typescript
import { extractSlides } from '@/lib/slideReorder'

const slides = extractSlides(htmlContent)
```

### 8.2 HTML処理

既存の `processHTMLForPreview()` 関数を使用:

```typescript
import { processHTMLForPreview } from '@/lib/htmlProcessor'
import { useSlideSize } from '@/hooks/useSlideSize'

const { sizeConfig } = useSlideSize()
const processedHTML = processHTMLForPreview(htmlContent, sizeConfig)
```

### 8.3 PDF生成の例

```typescript
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { extractSlides } from '@/lib/slideReorder'
import { processHTMLForPreview } from '@/lib/htmlProcessor'

async function exportToPDF(htmlContent: string, sizeConfig: SlideSizeConfig): Promise<void> {
  // PDFオブジェクトを作成（A4横向き）
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

  // スライドを抽出
  const slides = extractSlides(htmlContent)
  
  // 各スライドを処理
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]
    
    // スライドHTMLを処理（画像、グラフなどをレンダリング）
    const processedHTML = processHTMLForPreview(slide.html, sizeConfig)
    
    // 一時的なDOM要素を作成
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = processedHTML
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    document.body.appendChild(tempDiv)
    
    // スライド要素を取得
    const slideElement = tempDiv.querySelector('.slide')
    
    if (slideElement) {
      // 画像の読み込み完了を待つ
      await waitForImages(slideElement)
      
      // Canvasに変換
      const canvas = await html2canvas(slideElement as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      })
      
      // PDFに追加
      if (i > 0) {
        pdf.addPage()
      }
      
      const imgData = canvas.toDataURL('image/png')
      const imgWidth = pdf.internal.pageSize.getWidth()
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
    }
    
    // 一時的な要素を削除
    document.body.removeChild(tempDiv)
  }
  
  // ファイルとしてダウンロード
  pdf.save('presentation.pdf')
}

// 画像の読み込み完了を待つ
async function waitForImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img')
  const promises = Array.from(images).map((img) => {
    if (img.complete) {
      return Promise.resolve()
    }
    return new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => resolve() // エラーでも続行
      setTimeout(() => resolve(), 30000) // タイムアウト: 30秒
    })
  })
  await Promise.all(promises)
}
```

---

## 9. テスト計画

### 9.1 単体テスト（オプション）

- `pdfExporter.ts` の各関数
- HTML処理ロジック
- 画像読み込み待機ロジック

### 9.2 統合テスト（手動確認）

- [ ] 基本的なテキストスライドが変換される
- [ ] 画像を含むスライドが変換される
- [ ] 表を含むスライドが変換される
- [ ] グラフ・チャートを含むスライドが変換される
- [ ] 数式を含むスライドが変換される
- [ ] コードブロックを含むスライドが変換される
- [ ] 2分割レイアウトが正しく変換される
- [ ] 複数のスライドが正しく変換される
- [ ] A4横向きと16:9の両方のスライドサイズが正しく変換される
- [ ] PDFビューアで開いて正しく表示される
- [ ] ファイルサイズが適切である
- [ ] エラーハンドリングが機能する

---

## 10. 今後の拡張案

### 10.1 ページ番号の追加

- フッターにページ番号を追加
- カスタマイズ可能な形式（例: "1 / 10"）

### 10.2 カスタムヘッダー・フッター

- ヘッダー・フッターにテキストを追加
- 日付、タイトルなどの追加

### 10.3 印刷最適化

- 印刷用のCSSメディアクエリを追加
- ページブレークの制御

### 10.4 複数形式での一括エクスポート

- PDFとPowerPoint形式を同時にエクスポート
- 画像形式（PNG/JPG）との一括エクスポート

---

## 11. 実装の優先順位

### 必須（Phase 1-2）
✅ 基本的なテキストスライドの変換
✅ 画像のサポート
✅ 表のサポート
✅ メニューからのエクスポート

### 推奨（Phase 3-4）
✅ グラフ・チャートのサポート
✅ 数式のサポート
✅ コードブロックのサポート
✅ スタイル・レイアウトの最適化

### オプション（Phase 5）
✅ エクスポート設定モーダル
✅ 進捗表示
✅ エラーハンドリング強化
✅ パフォーマンス最適化

---

## 12. 実装開始前の確認事項

### 技術的な確認事項
- [ ] 既存のコードベースの理解
- [ ] `extractSlides()` 関数の動作確認
- [ ] `processHTMLForPreview()` 関数の動作確認
- [ ] `imageStorage.ts` の動作確認
- [ ] jsPDFのドキュメント確認
- [ ] html2canvasのドキュメント確認
- [ ] 実装環境の準備

### 依存関係の確認
- [ ] Chart.jsが正しく動作していること（グラフ機能）
- [ ] KaTeXが正しく動作していること（数式機能）
- [ ] Prism.jsが正しく動作していること（コードブロック機能）

---

## 13. 参考資料

### 既存実装の参考
- `lib/slideReorder.ts` - スライド抽出ロジック
- `lib/htmlProcessor.ts` - HTML処理ロジック（画像、グラフ、数式などのレンダリング）
- `lib/imageStorage.ts` - 画像ストレージ管理
- `components/Menu/HamburgerMenu.tsx` - メニュー統合パターン
- `hooks/useSlideSize.ts` - スライドサイズ管理

### 外部リソース
- [jsPDF公式ドキュメント](https://github.com/parallax/jsPDF)
- [html2canvas公式ドキュメント](https://html2canvas.hertzen.com/)
- [html2canvas GitHub](https://github.com/niklasvh/html2canvas)

---

## 14. 変更履歴

- 2025-12-20: 初版作成

---

**注意**: この計画は実装の指針です。実装中に発見された問題や要件変更に応じて柔軟に調整してください。