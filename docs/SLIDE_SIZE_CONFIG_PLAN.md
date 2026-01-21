# スライドサイズ切り替え機能 実装計画

## 📋 概要

現在A4横向きに固定されているスライドサイズを、以下の2種類から選択できるようにします：
1. **A4横向き** (297mm × 210mm) - デフォルト
2. **16:9 (1920×1080px)** - プレゼンテーション用

## 🎯 実装する機能

### 必須機能
1. スライドサイズ設定の保存・読み込み（LocalStorage）
2. スライドサイズ切り替えUI（メニューまたはツールバー）
3. プレビュー・プレゼンテーションモードでの動的サイズ適用
4. CSS生成の動的対応
5. 印刷・PDF出力時の適切なサイズ設定

### 将来拡張（Phase 2以降）
- カスタムサイズ入力
- 4:3など他の標準アスペクト比

## 🏗️ 実装アーキテクチャ

### 1. 型定義の追加 (`types/index.ts`)

```typescript
// スライドサイズの種類
export type SlideSizeType = 'a4-landscape' | '16-9'

// スライドサイズ設定
export interface SlideSizeConfig {
  type: SlideSizeType
  width: string        // CSS値（例: '297mm', '1920px'）
  height: string       // CSS値（例: '210mm', '1080px'）
  pageSize?: string    // @page用（例: 'A4 landscape', '1920px 1080px'）
}

// スライド設定（将来の拡張用）
export interface SlideSettings {
  size: SlideSizeConfig
}
```

### 2. スライドサイズ定義 (`lib/slideSizeConfig.ts`)

```typescript
import type { SlideSizeConfig, SlideSizeType } from '@/types'

// 各サイズの定義
export const SLIDE_SIZE_PRESETS: Record<SlideSizeType, SlideSizeConfig> = {
  'a4-landscape': {
    type: 'a4-landscape',
    width: '297mm',
    height: '210mm',
    pageSize: 'A4 landscape',
  },
  '16-9': {
    type: '16-9',
    width: '1920px',
    height: '1080px',
    pageSize: '1920px 1080px',
  },
}

// デフォルトサイズ
export const DEFAULT_SLIDE_SIZE_TYPE: SlideSizeType = 'a4-landscape'

// サイズ取得ヘルパー
export function getSlideSizeConfig(type: SlideSizeType): SlideSizeConfig {
  return SLIDE_SIZE_PRESETS[type]
}

// プレビュー表示用のスケールを計算するヘルパー
// 16:9サイズ（1920x1080px）はプレビューパネルに収まらないため、スケーリングが必要
export function calculatePreviewScale(
  sizeConfig: SlideSizeConfig,
  containerWidth: number
): number {
  // A4横向き: 297mm = 約1122px（96dpi想定）
  // 16:9: 1920px
  const slideWidthPx = sizeConfig.type === '16-9'
    ? 1920
    : 297 * 3.78  // mm to px (約1122px)
  
  // コンテナ幅に収まるようにスケールを計算（最大1.0）
  return Math.min(containerWidth / slideWidthPx, 1)
}
```

### 3. スライドサイズストレージ (`lib/slideSizeStorage.ts`)

```typescript
import { DEFAULT_SLIDE_SIZE_TYPE, getSlideSizeConfig } from './slideSizeConfig'
import type { SlideSizeType } from '@/types'

const STORAGE_KEY = 'slideEditor_slideSize'

// 保存されているスライドサイズを取得
// このアプリケーションはクライアントサイドで完結するため、常にLocalStorageにアクセス可能
export function getSlideSize(): SlideSizeType {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const sizeType = stored as SlideSizeType
      // 有効な値かチェック
      if (sizeType === 'a4-landscape' || sizeType === '16-9') {
        return sizeType
      }
    }
  } catch (error) {
    console.warn('Failed to load slide size from storage:', error)
  }

  return DEFAULT_SLIDE_SIZE_TYPE
}

// スライドサイズを保存
export function setSlideSize(sizeType: SlideSizeType): void {
  try {
    localStorage.setItem(STORAGE_KEY, sizeType)
  } catch (error) {
    console.warn('Failed to save slide size to storage:', error)
  }
}

// スライドサイズをリセット
export function resetSlideSize(): void {
  setSlideSize(DEFAULT_SLIDE_SIZE_TYPE)
}
```

### 4. カスタムフック (`hooks/useSlideSize.ts`)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { getSlideSize, setSlideSize as saveSlideSize, resetSlideSize as resetSavedSize } from '@/lib/slideSizeStorage'
import { getSlideSizeConfig, DEFAULT_SLIDE_SIZE_TYPE } from '@/lib/slideSizeConfig'
import type { SlideSizeType, SlideSizeConfig } from '@/types'

export function useSlideSize() {
  const [sizeType, setSizeTypeState] = useState<SlideSizeType>(() => getSlideSize())

  // 初期化時に設定を読み込む
  useEffect(() => {
    const saved = getSlideSize()
    setSizeTypeState(saved)
  }, [])

  // スライドサイズを変更
  const setSlideSize = (newSizeType: SlideSizeType) => {
    setSizeTypeState(newSizeType)
    saveSlideSize(newSizeType)
  }

  // 現在のサイズ設定を取得
  const currentSizeConfig: SlideSizeConfig = getSlideSizeConfig(sizeType)

  // スライドサイズをリセット
  const resetSlideSize = () => {
    resetSavedSize()
    setSizeTypeState(DEFAULT_SLIDE_SIZE_TYPE)
  }

  return {
    sizeType,
    sizeConfig: currentSizeConfig,
    setSlideSize,
    resetSlideSize,
  }
}
```

### 5. `slideStyleConfig.ts` の修正

`generateSlideStylesCSS()` 関数を、サイズ設定を受け取れるように変更：

```typescript
// 変更前
export function generateSlideStylesCSS(): string {
  const c = slideStyleConfig
  // ...
}

// 変更後
export function generateSlideStylesCSS(sizeConfig?: SlideSizeConfig): string {
  const c = slideStyleConfig
  
  // サイズ設定が指定されていない場合はデフォルトを使用
  const slideWidth = sizeConfig?.width ?? c.layout.slide.width
  const slideHeight = sizeConfig?.height ?? c.layout.slide.height
  const pageSize = sizeConfig?.pageSize ?? 'A4 landscape'
  
  return `/* ${sizeConfig?.type === '16-9' ? '16:9' : 'A4横向き'}スライド用スタイル */
body {
    margin: 0;
    padding: 0;
    font-family: 'Hiragino Kaku Gothic Pro', 'Meiryo', sans-serif;
    background: #f0f0f0;
}

.slide {
    width: ${slideWidth};
    height: ${slideHeight};
    min-height: ${slideHeight};
    max-height: ${slideHeight};
    // ...
}

@media print {
    // ...
    .slide {
        width: ${slideWidth} !important;
        height: ${slideHeight} !important;
        // ...
    }
}

@page {
    size: ${pageSize};
    margin: 0;
}

// ...
`
}
```

**注意**: `slideStyleConfig.layout.slide` は後方互換性のために残すが、優先的には `sizeConfig` を使用。

### 6. CSS生成ロジックの修正箇所

#### `lib/slideStyles.ts`
```typescript
// 変更: サイズ設定を受け取れるように
import { generateSlideStylesCSS } from './slideStyleConfig'
import type { SlideSizeConfig } from '@/types'

export function getSlideStylesCSS(sizeConfig?: SlideSizeConfig): string {
  return generateSlideStylesCSS(sizeConfig) + getTemplateCSS()
}
```

#### `lib/htmlProcessor.ts`
`processHTMLForPreview` と `processHTMLForPreviewAsync` で、現在のサイズ設定を使用するように修正。

**注意**: このアプリケーションはクライアントサイドで完結するため、常にLocalStorageにアクセス可能です。`sizeConfig` は `useSlideSize` フックから取得した値を渡します。

### 7. UIコンポーネント（プレビューウィンドウ上部中央に配置）

#### `components/SlideSizeSelector/SlideSizeSelector.tsx`

プレビューウィンドウの上部中央に配置するドロップダウンコンポーネント：

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './SlideSizeSelector.module.css'
import type { SlideSizeType } from '@/types'
import { SLIDE_SIZE_PRESETS } from '@/lib/slideSizeConfig'

interface SlideSizeSelectorProps {
  currentSizeType: SlideSizeType
  onSizeChange: (sizeType: SlideSizeType) => void
}

const SIZE_OPTIONS = [
  {
    type: 'a4-landscape' as SlideSizeType,
    label: 'A4横向き',
    shortLabel: 'A4',
    description: '297mm × 210mm',
    icon: '📄',
  },
  {
    type: '16-9' as SlideSizeType,
    label: '16:9',
    shortLabel: '16:9',
    description: '1920px × 1080px',
    icon: '🖥️',
  },
]

export default function SlideSizeSelector({
  currentSizeType,
  onSizeChange,
}: SlideSizeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // クリック外部で閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  const currentOption = SIZE_OPTIONS.find(opt => opt.type === currentSizeType) || SIZE_OPTIONS[0]

  const handleSelect = (sizeType: SlideSizeType) => {
    onSizeChange(sizeType)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen(!isOpen)
    } else if (isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      const currentIndex = SIZE_OPTIONS.findIndex(opt => opt.type === currentSizeType)
      const nextIndex = e.key === 'ArrowDown'
        ? (currentIndex + 1) % SIZE_OPTIONS.length
        : (currentIndex - 1 + SIZE_OPTIONS.length) % SIZE_OPTIONS.length
      onSizeChange(SIZE_OPTIONS[nextIndex].type)
    }
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.selectorButton}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title={`スライドサイズ: ${currentOption.label} (${currentOption.description})`}
      >
        <span className={styles.selectorIcon}>{currentOption.icon}</span>
        <span className={styles.selectorLabel}>{currentOption.shortLabel}</span>
        <span className={styles.selectorArrow}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {SIZE_OPTIONS.map((option) => {
            const config = SLIDE_SIZE_PRESETS[option.type]
            const isSelected = currentSizeType === option.type

            return (
              <button
                key={option.type}
                className={`${styles.option} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleSelect(option.type)}
                role="option"
                aria-selected={isSelected}
              >
                <span className={styles.optionIcon}>{option.icon}</span>
                <div className={styles.optionContent}>
                  <div className={styles.optionLabel}>{option.label}</div>
                  <div className={styles.optionDescription}>{config.width} × {config.height}</div>
                </div>
                {isSelected && <span className={styles.checkmark}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

#### `components/SlideSizeSelector/SlideSizeSelector.module.css`

```css
.container {
  position: relative;
  display: inline-block;
}

.selectorButton {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-button, #f5f5f5);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: all 0.2s ease;
}

.selectorButton:hover {
  background: var(--bg-button-hover, #e8e8e8);
  border-color: var(--accent-color, #3498db);
}

.selectorIcon {
  font-size: 14px;
}

.selectorLabel {
  font-weight: 600;
}

.selectorArrow {
  font-size: 10px;
  opacity: 0.6;
  transition: transform 0.2s ease;
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 200px;
  background: var(--bg-primary, white);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;
  color: var(--text-primary, #333);
}

.option:hover {
  background: var(--bg-button-hover, #f5f5f5);
}

.option.selected {
  background: var(--bg-button-hover, #f0f7ff);
  font-weight: 600;
}

.optionIcon {
  font-size: 16px;
  flex-shrink: 0;
}

.optionContent {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.optionLabel {
  font-size: 14px;
  font-weight: 500;
}

.optionDescription {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.checkmark {
  color: var(--accent-color, #3498db);
  font-size: 16px;
  font-weight: bold;
  flex-shrink: 0;
}
```

### 8. プレビューコンポーネントの修正

#### `components/Preview/Preview.tsx`

プレビューウィンドウの上部中央にスライドサイズセレクターを追加：

```typescript
// useSlideSizeフックを使用
import { useSlideSize } from '@/hooks/useSlideSize'
import SlideSizeSelector from '@/components/SlideSizeSelector/SlideSizeSelector'
import { calculatePreviewScale } from '@/lib/slideSizeConfig'

export default function Preview({ htmlContent, setHtmlContent, onPresentationModeStart }: PreviewProps) {
  const { sizeConfig, sizeType, setSlideSize } = useSlideSize()
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(1)
  
  // プレビュースケールを計算（16:9サイズの場合に縮小が必要）
  useEffect(() => {
    const calculateScale = () => {
      if (previewContainerRef.current) {
        const scale = calculatePreviewScale(sizeConfig, previewContainerRef.current.clientWidth)
        setPreviewScale(scale)
      }
    }
    
    // 初期計算
    calculateScale()
    
    // ウィンドウリサイズ時にも再計算
    window.addEventListener('resize', calculateScale)
    return () => {
      window.removeEventListener('resize', calculateScale)
    }
  }, [sizeConfig])
  
  useEffect(() => {
    // ...
    // processHTMLForPreviewAsyncにsizeConfigを渡す
    processHTMLForPreviewAsync(htmlContent, sizeConfig).then((processedContent) => {
      // ...
    })
  }, [htmlContent, sizeConfig]) // sizeConfigを依存関係に追加

  return (
    <div className={styles.previewPanel}>
      <div className={styles.panelHeader}>
        <span>プレビュー</span>
        {/* 中央にスライドサイズセレクターを配置 */}
        <div className={styles.headerCenter}>
          <SlideSizeSelector
            currentSizeType={sizeType}
            onSizeChange={setSlideSize}
          />
        </div>
        {hasContent && slides.length > 0 && (
          <button
            className={styles.presentationButton}
            onClick={handleStartPresentation}
            title="フルスクリーンプレゼンテーションモードを開始 (F5)"
          >
            🎬 プレゼンテーション
          </button>
        )}
      </div>
      <div className={styles.previewContainer}>
        {hasContent ? (
          <div className={styles.previewWithSlides}>
            {/* ... slide list ... */}
            <div 
              ref={previewContainerRef}
              className={styles.previewWrapper}
              style={{
                transform: previewScale < 1 ? `scale(${previewScale})` : 'none',
                transformOrigin: 'top left',
                // スケーリング後の元のサイズを保持するため、コンテナサイズを調整
                // scale()を使う場合、要素のサイズは変わらないため、親要素のサイズを調整してスクロール可能にする
                width: previewScale < 1 ? `${100 / previewScale}%` : '100%',
                height: previewScale < 1 ? `${100 / previewScale}%` : '100%',
              }}
            >
              <iframe
                ref={iframeRef}
                className={styles.previewFrame}
                title="プレビュー"
              />
            </div>
          </div>
        ) : (
          <div className={styles.placeholder}>
            {sizeType === 'a4-landscape' ? 'A4横向き' : '16:9'}スライドのプレビューがここに表示されます
          </div>
        )}
      </div>
    </div>
  )
}
```

#### `components/Preview/Preview.module.css`

ヘッダーのスタイルを修正して中央配置を追加：

```css
.panelHeader {
  padding: 12px 20px;
  background: var(--bg-button);
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  position: relative;
  transition: background 0.3s ease, border-color 0.3s ease, color 0.3s ease;
}

.headerCenter {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.previewWrapper {
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
}

/* スケーリング時のスクロール動作を確保 */
.previewContainer {
  position: relative;
  overflow: auto;
}

.previewFrame {
  flex: 1;
  height: 100%;
  border: none;
  background: white;
  min-width: 0;
}
```

### 9. プレゼンテーションモードの修正

#### `components/PresentationMode/PresentationMode.tsx`

同様に `useSlideSize` を使用し、サイズ設定を反映。

#### `hooks/usePresentationMode.ts`

サイズ設定を考慮したスタイル適用。

### 10. `lib/htmlProcessor.ts` の修正

```typescript
import type { SlideSizeConfig } from '@/types'
import { getSlideStylesCSS } from './slideStyles'
import { DEFAULT_SLIDE_SIZE_TYPE, getSlideSizeConfig } from './slideSizeConfig'

// サイズ設定を受け取れるように修正
export async function processHTMLForPreviewAsync(
  htmlContent: string,
  sizeConfig?: SlideSizeConfig
): Promise<string> {
  let processedContent = htmlContent.trim()

  if (!processedContent) {
    return processedContent
  }

  // sizeConfig が渡されない場合はデフォルトを使用（通常は useSlideSize から取得した値が渡される）
  const effectiveSizeConfig = sizeConfig || getSlideSizeConfig(DEFAULT_SLIDE_SIZE_TYPE)

  // サイズ設定に基づいてCSSを動的に生成
  const css = getSlideStylesCSS(effectiveSizeConfig)

  // <link rel="stylesheet" href="css/slide-styles.css"> を <style> タグに置き換え
  processedContent = processedContent.replace(
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*slide-styles\.css["'][^>]*>/gi,
    `<style>${css}</style>`
  )

  // 既に<style>タグがない場合、head内に追加
  if (!processedContent.includes('<style>')) {
    processedContent = processedContent.replace(
      /<\/head>/i,
      `<style>${css}</style></head>`
    )
  }

  // 既存の処理（画像変換、グラフ、コードブロック、数式）を続行
  processedContent = convertStorageImagesToDataURI(processedContent)
  processedContent = addChartInitializationScript(processedContent)
  processedContent = addCodeBlockHighlighting(processedContent)
  processedContent = addEquationRendering(processedContent)
  
  return processedContent
}

export function processHTMLForPreview(
  htmlContent: string,
  sizeConfig?: SlideSizeConfig
): string {
  let processedContent = htmlContent.trim()

  if (!processedContent) {
    return processedContent
  }

  // sizeConfig が渡されない場合はデフォルトを使用
  const effectiveSizeConfig = sizeConfig || getSlideSizeConfig(DEFAULT_SLIDE_SIZE_TYPE)

  // サイズ設定に基づいてCSSを動的に生成
  const css = getSlideStylesCSS(effectiveSizeConfig)

  // <link rel="stylesheet" href="css/slide-styles.css"> を <style> タグに置き換え
  processedContent = processedContent.replace(
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*slide-styles\.css["'][^>]*>/gi,
    `<style>${css}</style>`
  )

  // 既に<style>タグがない場合、head内に追加
  if (!processedContent.includes('<style>')) {
    processedContent = processedContent.replace(
      /<\/head>/i,
      `<style>${css}</style></head>`
    )
  }

  // 既存の処理（画像変換、グラフ、コードブロック、数式）を続行
  processedContent = convertStorageImagesToDataURI(processedContent)
  processedContent = addChartInitializationScript(processedContent)
  processedContent = addCodeBlockHighlighting(processedContent)
  processedContent = addEquationRendering(processedContent)
  
  return processedContent
}
```

**注意事項**:
- このアプリケーションはクライアントサイドで完結するため、常にLocalStorageにアクセス可能
- `Preview.tsx` などから `useSlideSize` フックで取得した `sizeConfig` を明示的に渡す
- 既存の `loadActualCSS()` 関数は使用せず、動的に生成したCSSを使用する（サイズに応じて適切なCSSが生成されるため）

## 📝 実装手順

### Phase 1: 基盤実装
1. ✅ 型定義の追加 (`types/index.ts`)
2. ✅ スライドサイズ定義ファイルの作成 (`lib/slideSizeConfig.ts`)
3. ✅ ストレージ管理の実装 (`lib/slideSizeStorage.ts`)
4. ✅ カスタムフックの実装 (`hooks/useSlideSize.ts`)

### Phase 2: CSS生成の修正
5. ✅ `slideStyleConfig.ts` の `generateSlideStylesCSS()` を修正
6. ✅ `slideStyles.ts` を修正
7. ✅ `htmlProcessor.ts` を修正

### Phase 3: UI実装
8. ✅ `SlideSizeSelector` コンポーネントの作成
9. ✅ `Preview.tsx` に統合（プレビューウィンドウ上部中央に配置）
10. ✅ `Preview.module.css` のスタイル修正

### Phase 4: 各コンポーネントの修正
11. ✅ `PresentationMode.tsx` の修正
12. ✅ `usePresentationMode.ts` の修正

### Phase 5: プレビュースケーリング実装
13. ✅ `calculatePreviewScale` 関数の実装（`lib/slideSizeConfig.ts`）
14. ✅ `Preview.tsx` でのスケーリング適用

### Phase 6: テスト・調整
15. ✅ 動作確認
16. ✅ サイズ切り替え時の表示確認
17. ✅ プレビュースケーリングの動作確認
18. ✅ 印刷・PDF出力の確認（必要に応じて）
19. ✅ アクセシビリティ（キーボード操作）の確認

## ⚠️ 注意事項

### 1. 単位の扱い
- A4横向き: `mm` 単位（印刷用）
- 16:9: `px` 単位（画面表示用）
- CSS生成時に単位を適切に扱う

### 2. @page ルールと印刷時の処理
- A4横向き: `size: A4 landscape;`（物理的なA4用紙に印刷可能）
- 16:9: `size: 1920px 1080px;`（カスタムサイズ）
  - **注意**: 1920px × 1080px は物理的な紙に直接印刷するには大きすぎる
  - ブラウザによっては自動的にスケーリングされるが、動作確認が必要
  - 印刷時は「用紙に合わせる」オプションが推奨される
  - PDF出力時も同様にスケーリングが発生する可能性がある

### 3. プレビュースケーリング
- 16:9サイズ（1920x1080px）はプレビューパネルに収まらないため、`calculatePreviewScale` 関数でスケールを計算
- `transform: scale()` を使用してプレビューを縮小表示
- スケール後のコンテナサイズを調整してスクロール可能にする
- プレゼンテーションモードではフルサイズで表示（スケーリング不要）

### 4. 後方互換性
- 既存のプロジェクトはデフォルト（A4横向き）として扱う
- ストレージに値がない場合は A4横向きを使用

### 5. パフォーマンス
- サイズ変更時にCSSを再生成する必要がある
- プレビューの再レンダリングが適切にトリガーされることを確認

### 6. クライアントサイドのみの実装
- このアプリケーションはクライアントサイドで完結するため、常にLocalStorageにアクセス可能
- `useSlideSize` フックから取得した `sizeConfig` を `processHTMLForPreviewAsync` や `processHTMLForPreview` に明示的に渡す
- `sizeConfig` パラメータはオプショナルにし、未指定時はデフォルト（A4横向き）を使用

### 7. アクセシビリティ
- ドロップダウンはキーボード操作に対応（Enter/Space/Escape/Arrow keys）
- ARIA属性を追加（`aria-expanded`、`aria-haspopup`、`role="listbox"`、`role="option"`、`aria-selected`）
- スクリーンリーダーでの操作を考慮した実装

### 8. プレビュースケーリングの実装詳細
- ウィンドウリサイズ時にスケールを再計算（`resize` イベントリスナーを追加）
- スケーリング時のスクロール動作を確保（`previewWrapper` に `overflow: auto` を設定）
- `transform: scale()` を使用する場合、要素の実際のサイズは変わらないため、親要素のサイズを調整（`100 / previewScale %`）してスクロール可能にする
- 実装時にスケーリング後のスクロール動作を確認すること

### 9. CSS変数のフォールバック値
- 同一のCSS変数（`--bg-button`）に異なるフォールバック値を使用している場合がある
- 意図的に異なる値を使用する場合は、適切な変数名を使用する（例: `--bg-button-hover`）
- 統一性を保つため、可能な限りCSS変数を一貫して使用する

### 10. 既存機能との統合
- PowerPointエクスポート機能がある場合、スライドサイズに応じたエクスポート設定が必要
- 既存の `POWERPOINT_EXPORT_PLAN.md` との整合性を確認し、必要に応じて拡張
- エクスポート時に現在のサイズ設定を考慮した出力を行う

## 🔍 実装後の確認項目

- [ ] サイズ切り替えが正常に動作する
- [ ] プレビュー表示が正しいサイズで表示される
- [ ] プレゼンテーションモードが正しいサイズで表示される
- [ ] 設定がLocalStorageに保存される
- [ ] ページリロード後も設定が維持される
- [ ] 印刷時のサイズが正しい（16:9サイズの印刷時の動作を確認）
- [ ] 既存のスライドコンテンツが崩れない
- [ ] 両方のサイズでテンプレートが正常に表示される
- [ ] プレビュースケーリングが正常に動作する（16:9サイズで適切に縮小表示される）
- [ ] キーボード操作でドロップダウンを操作できる
- [ ] スクリーンリーダーでの操作が可能
- [ ] PowerPointエクスポート（既存機能がある場合）との連携が正常に動作する
- [ ] ウィンドウリサイズ時にプレビュースケールが適切に再計算される
- [ ] スケーリング後のスクロール動作が正常に機能する

