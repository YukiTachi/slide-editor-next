'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './Menu.module.css'
import { processHTMLForPreviewAsync, processHTMLForPreview } from '@/lib/htmlProcessor'
import ImageInserterModal from '@/components/ImageInserter/ImageInserterModal'
import ImageManager from '@/components/ImageInserter/ImageManager'
import { convertBase64ToExternal, convertStorageImagesToDataURI } from '@/lib/imageStorage'
import { initializeImageStorage } from '@/lib/imageStorage'
import { exportToPDF } from '@/lib/pdfExporter'
import { exportToPowerPoint } from '@/lib/powerpointExporter'
import PowerPointExporterModal from '@/components/PowerPointExporter/PowerPointExporterModal'
import {
  getPowerPointExportConfig,
  savePowerPointExportConfig,
  DEFAULT_POWERPOINT_EXPORT_CONFIG,
} from '@/lib/powerpointExportSettingsStorage'
import ProjectManagerModal from '@/components/ProjectManager/ProjectManagerModal'
import EditorSettingsModal from '@/components/EditorSettings/EditorSettingsModal'
import SlideTemplateSelectorModal from '@/components/SlideTemplateSelector/SlideTemplateSelectorModal'
import KeyboardShortcutsModal from '@/components/KeyboardShortcuts/KeyboardShortcutsModal'
import { useSlideSize } from '@/hooks/useSlideSize'
import { useCSSDesignTemplate } from '@/hooks/useCSSDesignTemplate'
import type { EditorSettings, KeyboardShortcut, PowerPointExportConfig } from '@/types'

import type { EditorHandle } from '@/components/Editor/Editor'

interface HamburgerMenuProps {
  htmlContent: string
  setHtmlContent: (content: string) => void
  onStatusUpdate?: (message: string) => void
  editorRef?: React.RefObject<EditorHandle | null>
  onRestore?: () => string | null
  isMenuOpen?: boolean
  setIsMenuOpen?: (open: boolean) => void
  onImageInsertRequest?: () => void
  onUndo?: () => void
  onRedo?: () => void
  isUndoable?: boolean
  isRedoable?: boolean
  onSearchReplace?: () => void
  onPasteFromClipboard?: (content: string) => void
  editorSettings?: EditorSettings
  onEditorSettingsChange?: (settings: EditorSettings) => void
  onEditorSettingsReset?: () => void
  keyboardShortcuts?: KeyboardShortcut[]
  onKeyboardShortcutsUpdate?: (id: string, updates: Partial<KeyboardShortcut>) => void
  onKeyboardShortcutsReset?: () => void
  onKeyboardShortcutsCheckDuplicate?: (id: string, keyString: string) => KeyboardShortcut | null
  onKeyboardShortcutsOpen?: () => void
  onTutorialOpen?: () => void
  onTableInsertRequest?: () => void
  onChartInsertRequest?: () => void
  onCodeBlockInsertRequest?: () => void
  onEquationInsertRequest?: () => void
  onHierarchyPanelToggle?: () => void
}

export default function HamburgerMenu({ htmlContent, setHtmlContent, onStatusUpdate, editorRef, onRestore, isMenuOpen, setIsMenuOpen, onImageInsertRequest, onUndo, onRedo, isUndoable = false, isRedoable = false, onSearchReplace, onPasteFromClipboard, editorSettings, onEditorSettingsChange, onEditorSettingsReset, keyboardShortcuts, onKeyboardShortcutsUpdate, onKeyboardShortcutsReset, onKeyboardShortcutsCheckDuplicate, onKeyboardShortcutsOpen, onTutorialOpen, onTableInsertRequest, onChartInsertRequest, onCodeBlockInsertRequest, onEquationInsertRequest, onHierarchyPanelToggle }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [isImageManagerOpen, setIsImageManagerOpen] = useState(false)
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false)
  const [isEditorSettingsOpen, setIsEditorSettingsOpen] = useState(false)
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false)
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false)
  const [isPowerPointModalOpen, setIsPowerPointModalOpen] = useState(false)
  // 初期値は定数。実際の保存値はモーダルを開くときにlocalStorageから読む（SSR差異を避ける）
  const [powerPointConfig, setPowerPointConfig] = useState<PowerPointExportConfig>(
    DEFAULT_POWERPOINT_EXPORT_CONFIG
  )
  const previewWindowRef = useRef<Window | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { sizeConfig } = useSlideSize()
  const { template } = useCSSDesignTemplate()

  // 画像ストレージを初期化
  useEffect(() => {
    initializeImageStorage()
  }, [])

  // 親コンポーネントの状態と同期
  useEffect(() => {
    if (isMenuOpen !== undefined) {
      setIsOpen(isMenuOpen)
    }
  }, [isMenuOpen])

  const toggleMenu = () => {
    const newState = !isOpen
    setIsOpen(newState)
    if (setIsMenuOpen) {
      setIsMenuOpen(newState)
    }
  }

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && menuRef.current) {
        const target = e.target as Node
        // メニュー内またはハンバーガーボタン内のクリックは無視
        if (!menuRef.current.contains(target)) {
          toggleMenu()
        }
      }
    }

    if (isOpen) {
      // 少し遅延させて、メニューを開くクリックイベントと競合しないようにする
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 0)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // ESCキーでメニューを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        toggleMenu()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // 1. スライド追加機能
  const addSlide = () => {
    const cursorPosition = editorRef?.current?.getCursorPosition() || 0
    const { SlideTemplates } = require('@/lib/slideTemplates')
    
    // カーソル位置から前後に検索して、現在のスライドの範囲を特定
    const slideInsertPosition = SlideTemplates.findSlideInsertPosition(htmlContent, cursorPosition)
    
    // 新しいHTMLコンテンツを作成
    let newHtmlContent = htmlContent.slice(0, slideInsertPosition) + 
                       SlideTemplates.getNewSlideTemplate() + 
                       htmlContent.slice(slideInsertPosition)
    
    // ページ番号を振り直し
    newHtmlContent = SlideTemplates.updatePageNumbers(newHtmlContent)
    
    // エディタに新しいコンテンツを設定
    setHtmlContent(newHtmlContent)
    
    // カーソル位置を新しいスライドの開始位置に移動
    const newCursorPosition = slideInsertPosition + SlideTemplates.getNewSlideTemplate().indexOf('<h1>新しいスライド</h1>')
    setTimeout(() => {
      editorRef?.current?.setCursorPosition(newCursorPosition)
    }, 0)
    
    // ステータス更新
    if (onStatusUpdate) {
      onStatusUpdate('新しいスライドを追加しました（ページ番号を更新）')
      setTimeout(() => {
        onStatusUpdate('')
      }, 2000)
    }
  }

  // 2. クリア機能
  const clearEditor = () => {
    if (confirm('エディタの内容をクリアしますか？')) {
      setHtmlContent('')
      if (onStatusUpdate) {
        onStatusUpdate('エディタをクリアしました')
        setTimeout(() => {
          onStatusUpdate('')
        }, 2000)
      }
    }
  }


  // 4. 復元機能
  const handleRestore = () => {
    if (onRestore) {
      const restoredContent = onRestore()
      if (restoredContent) {
        setHtmlContent(restoredContent)
        if (onStatusUpdate) {
          onStatusUpdate('復元完了')
          setTimeout(() => {
            onStatusUpdate('')
          }, 2000)
        }
        // カーソルを末尾に移動
        setTimeout(() => {
          const textarea = editorRef?.current
          if (textarea) {
            const position = restoredContent.length
            textarea.setCursorPosition(position)
          }
        }, 0)
      }
    }
  }

  // 5. 画像挿入機能
  const handleImageInsert = () => {
    setIsImageModalOpen(true)
  }

  // 外部から画像挿入を呼び出せるようにする
  useEffect(() => {
    if (onImageInsertRequest) {
      // グローバルに公開（キーボードショートカット用）
      ;(window as any).openImageInsertModal = handleImageInsert
    }
    return () => {
      delete (window as any).openImageInsertModal
    }
  }, [onImageInsertRequest])

  // 6. Base64変換機能
  const handleBase64Convert = async () => {
    const base64Regex = /<img[^>]*src="data:image\/[^;]+;base64,[^"]+"[^>]*>/g
    const matches = htmlContent.match(base64Regex)

    if (!matches || matches.length === 0) {
      alert('変換可能なbase64画像が見つかりませんでした。')
      return
    }

    if (confirm(`${matches.length}個のbase64画像を外部ファイル参照に変換しますか？\n（HTMLが読みやすくなります）`)) {
      const newContent = await convertBase64ToExternal(htmlContent)
      setHtmlContent(newContent)
      if (onStatusUpdate) {
        onStatusUpdate(`${matches.length}個の画像を外部ファイル参照に変換しました`)
        setTimeout(() => onStatusUpdate(''), 3000)
      }
    }
  }

  // 7. 画像管理機能
  const handleImageManager = () => {
    setIsImageManagerOpen(true)
  }

  // HTMLコピー時に画像をdata URIに変換
  const handleCopyToClipboard = async () => {
    const trimmedContent = htmlContent.trim()

    if (!trimmedContent) {
      alert('コピーするHTMLがありません')
      return
    }

    // ローカルストレージの画像をdata URIに変換
    const processedHTML = convertStorageImagesToDataURI(trimmedContent)

    try {
      await navigator.clipboard.writeText(processedHTML)
      if (onStatusUpdate) {
        onStatusUpdate('HTMLをクリップボードにコピーしました！（画像も含む）')
        setTimeout(() => {
          onStatusUpdate('')
        }, 2000)
      }
    } catch (err) {
      console.error('コピーに失敗:', err)
      alert('クリップボードへのコピーに失敗しました')
    }
  }

  // クリップボードからHTMLを読み込む
  const handlePasteFromClipboard = async () => {
    try {
      // 現在の内容がある場合は確認
      const trimmedContent = htmlContent.trim()
      if (trimmedContent) {
        const confirmed = confirm('現在の内容を上書きしてクリップボードから読み込みますか？')
        if (!confirmed) {
          return
        }
      }

      // クリップボードからテキストを読み取る
      const clipboardText = await navigator.clipboard.readText()
      
      if (!clipboardText.trim()) {
        alert('クリップボードにHTMLがありません')
        return
      }

      // HTMLをエディタに設定
      setHtmlContent(clipboardText)
      
      // 履歴をリセットするためのコールバックを呼び出す
      if (onPasteFromClipboard) {
        onPasteFromClipboard(clipboardText)
      }
      
      if (onStatusUpdate) {
        onStatusUpdate('クリップボードからHTMLを読み込みました')
        setTimeout(() => {
          onStatusUpdate('')
        }, 2000)
      }

      // エディタにフォーカスを移動
      setTimeout(() => {
        if (editorRef?.current) {
          editorRef.current.focus()
        }
      }, 0)
    } catch (err) {
      console.error('クリップボードからの読み込みに失敗:', err)
      alert('クリップボードからの読み込みに失敗しました。ブラウザがクリップボードへのアクセスを許可しているか確認してください。')
    }
  }

  // PDF出力（印刷ダイアログ方式、詳細は docs/PDF_EXPORT_PLAN.md）
  const handleExportPDF = async () => {
    const trimmedContent = htmlContent.trim()

    if (!trimmedContent) {
      alert('出力するスライドがありません')
      return
    }

    try {
      await exportToPDF(trimmedContent, sizeConfig, template, {
        onStatus: (message) => {
          if (onStatusUpdate) {
            onStatusUpdate(message)
          }
        },
      })
      // 案内メッセージ（印刷ダイアログ表示中）をしばらく残してからクリア
      if (onStatusUpdate) {
        setTimeout(() => onStatusUpdate(''), 8000)
      }
    } catch (error) {
      console.error('PDF出力に失敗:', error)
      alert('PDF出力に失敗しました。コンソールを確認してください。')
    }
  }

  // PowerPoint出力（詳細は docs/POWERPOINT_EXPORT_PLAN.md）
  // 設定モーダルを開く（出力自体はモーダルの「出力」から実行）
  const handleExportPowerPoint = () => {
    if (!htmlContent.trim()) {
      alert('出力するスライドがありません')
      return
    }
    setPowerPointConfig(getPowerPointExportConfig())
    setIsPowerPointModalOpen(true)
  }

  const runPowerPointExport = async (config: PowerPointExportConfig) => {
    const trimmedContent = htmlContent.trim()

    if (!trimmedContent) {
      alert('出力するスライドがありません')
      return
    }

    savePowerPointExportConfig(config)
    setPowerPointConfig(config)
    setIsPowerPointModalOpen(false)

    try {
      const result = await exportToPowerPoint(trimmedContent, sizeConfig, template, config, {
        onStatus: (message) => onStatusUpdate?.(message),
      })

      if (onStatusUpdate) {
        onStatusUpdate(`PowerPointをダウンロードしました（${result.slideCount}枚）`)
        setTimeout(() => onStatusUpdate(''), 5000)
      }
      // 出力は完了しているが一部要素をスキップした場合は内容を伝える
      if (result.warnings.length > 0) {
        alert(
          `PowerPointを出力しましたが、一部の要素をスキップしました:\n\n` +
          result.warnings.slice(0, 10).join('\n') +
          (result.warnings.length > 10 ? `\n…ほか${result.warnings.length - 10}件` : '')
        )
      }
    } catch (error) {
      console.error('PowerPoint出力に失敗:', error)
      const detail = error instanceof Error ? `\n\n${error.message}` : ''
      alert(`PowerPoint出力に失敗しました。${detail}`)
      if (onStatusUpdate) {
        onStatusUpdate('')
      }
    }
  }

  const openPreviewWindow = async () => {
    const trimmedContent = htmlContent.trim()

    if (!trimmedContent) {
      alert('プレビューするHTMLコンテンツがありません')
      return
    }

    // 既存のウィンドウがあれば閉じる
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      previewWindowRef.current.close()
    }

    // 新しいウィンドウを開く
    const newWindow = window.open('', 'preview', 'width=1200,height=800,scrollbars=yes,resizable=yes')

    if (!newWindow) {
      alert('ポップアップがブロックされました。ブラウザの設定を確認してください。')
      return
    }

    previewWindowRef.current = newWindow

    try {
      // HTMLを処理（実際のCSSファイルを読み込む、選択中のサイズ設定とテンプレートを適用）
      const processedHTML = await processHTMLForPreviewAsync(trimmedContent, sizeConfig, template)

      // ウィンドウにHTMLを書き込む
      newWindow.document.title = 'プレビュー - スライドエディタ'
      newWindow.document.open()
      newWindow.document.write(processedHTML)
      newWindow.document.close()
      newWindow.focus()

      // ステータス更新
      if (onStatusUpdate) {
        const originalMessage = '別ウィンドウでプレビューを開きました'
        onStatusUpdate(originalMessage)
        setTimeout(() => {
          onStatusUpdate('')
        }, 2000)
      }
    } catch (error) {
      console.warn('CSS読み込みエラー、フォールバックを使用:', error)
      // エラー時は同期版を使用
      const processedHTML = processHTMLForPreview(trimmedContent, sizeConfig, template)
      newWindow.document.title = 'プレビュー - スライドエディタ'
      newWindow.document.open()
      newWindow.document.write(processedHTML)
      newWindow.document.close()
      newWindow.focus()
    }
  }


  return (
    <div className={styles.headerControls} ref={menuRef}>
      <button 
        className={`${styles.hamburgerBtn} ${isOpen ? styles.active : ''}`}
        onClick={toggleMenu}
        aria-label="メニュー"
      >
        <span className={styles.hamburgerLine}></span>
        <span className={styles.hamburgerLine}></span>
        <span className={styles.hamburgerLine}></span>
      </button>

      {isOpen && (
        <div className={styles.hamburgerMenu} onClick={(e) => e.stopPropagation()}>
          <div className={styles.menuSection}>
            <h3>📝 編集</h3>
            <button 
              className={`${styles.menuBtn} ${!isUndoable ? styles.disabled : ''}`}
              onClick={(e) => { 
                e.stopPropagation()
                if (isUndoable && onUndo) {
                  onUndo()
                }
              }}
              disabled={!isUndoable}
            >
              ↶ 元に戻す (Ctrl+Z)
            </button>
            <button 
              className={`${styles.menuBtn} ${!isRedoable ? styles.disabled : ''}`}
              onClick={(e) => { 
                e.stopPropagation()
                if (isRedoable && onRedo) {
                  onRedo()
                }
              }}
              disabled={!isRedoable}
            >
              ↷ やり直す (Ctrl+Y)
            </button>
            <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); addSlide(); }}>➕ スライド追加（標準）</button>
            <button 
              className={styles.menuBtn} 
              onClick={(e) => { 
                e.stopPropagation(); 
                setIsTemplateSelectorOpen(true); 
              }}
            >
              📋 テンプレートからスライド追加
            </button>
            <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); clearEditor(); }}>🗑️ クリア</button>
            <button 
              className={styles.menuBtn} 
              onClick={(e) => { 
                e.stopPropagation()
                const cursorPosition = editorRef?.current?.getCursorPosition() || 0
                const { extractSlides } = require('@/lib/slideReorder')
                const slides = extractSlides(htmlContent)
                if (slides.length === 0) {
                  alert('削除するスライドがありません')
                  return
                }
                // カーソル位置から現在のスライドを特定
                const { SlideTemplates } = require('@/lib/slideTemplates')
                const slideInsertPosition = SlideTemplates.findSlideInsertPosition(htmlContent, cursorPosition)
                // カーソル位置が含まれるスライドを探す
                let currentSlideIndex = -1
                for (let i = 0; i < slides.length; i++) {
                  if (slideInsertPosition >= slides[i].start && slideInsertPosition <= slides[i].end) {
                    currentSlideIndex = i
                    break
                  }
                }
                if (currentSlideIndex === -1) {
                  currentSlideIndex = slides.length - 1 // 見つからない場合は最後のスライド
                }
                if (slides.length <= 1) {
                  alert('最後の1つのスライドは削除できません。')
                  return
                }
                const { deleteSlide } = require('@/lib/slideReorder')
                const { getSlideTitle } = require('@/lib/slideReorder')
                const slideTitle = getSlideTitle(slides[currentSlideIndex].html)
                if (confirm(`スライド${currentSlideIndex + 1}「${slideTitle}」を削除しますか？`)) {
                  const newContent = deleteSlide(htmlContent, currentSlideIndex)
                  setHtmlContent(newContent)
                  if (onStatusUpdate) {
                    onStatusUpdate(`スライド${currentSlideIndex + 1}を削除しました`)
                    setTimeout(() => onStatusUpdate(''), 2000)
                  }
                }
              }}
            >
              🗑️ スライド削除
            </button>
            <button 
              className={styles.menuBtn} 
              onClick={(e) => { 
                e.stopPropagation()
                const cursorPosition = editorRef?.current?.getCursorPosition() || 0
                const { extractSlides, duplicateSlide } = require('@/lib/slideReorder')
                const slides = extractSlides(htmlContent)
                if (slides.length === 0) {
                  alert('複製するスライドがありません')
                  return
                }
                // カーソル位置から現在のスライドを特定
                const { SlideTemplates } = require('@/lib/slideTemplates')
                const slideInsertPosition = SlideTemplates.findSlideInsertPosition(htmlContent, cursorPosition)
                // カーソル位置が含まれるスライドを探す
                let currentSlideIndex = -1
                for (let i = 0; i < slides.length; i++) {
                  if (slideInsertPosition >= slides[i].start && slideInsertPosition <= slides[i].end) {
                    currentSlideIndex = i
                    break
                  }
                }
                if (currentSlideIndex === -1) {
                  currentSlideIndex = slides.length - 1 // 見つからない場合は最後のスライド
                }
                const newContent = duplicateSlide(htmlContent, currentSlideIndex)
                setHtmlContent(newContent)
                if (onStatusUpdate) {
                  onStatusUpdate(`スライド${currentSlideIndex + 1}を複製しました`)
                  setTimeout(() => onStatusUpdate(''), 2000)
                }
              }}
            >
              📋 スライド複製
            </button>
            {onSearchReplace && (
              <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); onSearchReplace(); }}>🔍 検索・置換 (Ctrl+F)</button>
            )}
          </div>

          <div className={styles.menuSection}>
            <h3>🖼️ 画像</h3>
            <button 
              className={styles.menuBtn} 
              onClick={(e) => {
                e.stopPropagation()
                handleImageInsert()
              }}
            >
              🖼️ 画像挿入
            </button>
            <button 
              className={styles.menuBtn} 
              onClick={(e) => {
                e.stopPropagation()
                if (onTableInsertRequest) {
                  onTableInsertRequest()
                }
              }}
            >
              📊 表を挿入
            </button>
            <button 
              className={styles.menuBtn} 
              onClick={(e) => {
                e.stopPropagation()
                if (onChartInsertRequest) {
                  onChartInsertRequest()
                }
              }}
            >
              📈 グラフを挿入
            </button>
            <button 
              className={styles.menuBtn} 
              onClick={(e) => {
                e.stopPropagation()
                if (onCodeBlockInsertRequest) {
                  onCodeBlockInsertRequest()
                }
              }}
            >
              💻 コードブロックを挿入
            </button>
            <button 
              className={styles.menuBtn} 
              onClick={(e) => {
                e.stopPropagation()
                if (onEquationInsertRequest) {
                  onEquationInsertRequest()
                }
              }}
            >
              📐 数式を挿入
            </button>
            <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); handleBase64Convert(); }}>🔄 Base64変換</button>
            <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); handleImageManager(); }}>📁 画像管理</button>
          </div>

          <div className={styles.menuSection}>
            <h3>💾 データ</h3>
            <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); handleRestore(); }}>🔄 復元</button>
            <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(); }}>📋 HTMLコピー</button>
            <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); handleExportPDF(); }}>📄 PDF出力</button>
            <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); handleExportPowerPoint(); }}>📊 PowerPoint出力</button>
            <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); handlePasteFromClipboard(); }}>📥 クリップボードから読み込み</button>
            <button
              className={styles.menuBtn}
              onClick={(e) => {
                e.stopPropagation()
                setIsProjectManagerOpen(true)
              }}
            >
              📁 プロジェクト管理
            </button>
          </div>

          <div className={styles.menuSection}>
            <h3>🔗 表示</h3>
            <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); openPreviewWindow(); }}>🔗 別ウィンドウで開く</button>
            {onHierarchyPanelToggle && (
              <button 
                className={styles.menuBtn} 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onHierarchyPanelToggle(); 
                }}
              >
                📊 HTML階層構造
              </button>
            )}
          </div>

          <div className={styles.menuSection}>
            <h3>⚙️ 設定</h3>
            <button 
              className={styles.menuBtn} 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (onTutorialOpen) {
                  onTutorialOpen();
                }
              }}
            >
              📖 チュートリアルを表示
            </button>
            {editorSettings && onEditorSettingsChange && onEditorSettingsReset && (
              <button 
                className={styles.menuBtn} 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsEditorSettingsOpen(true); 
                }}
              >
                ⚙️ エディタ設定
              </button>
            )}
            {keyboardShortcuts && onKeyboardShortcutsUpdate && onKeyboardShortcutsReset && onKeyboardShortcutsCheckDuplicate && (
              <button 
                className={styles.menuBtn} 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsKeyboardShortcutsOpen(true);
                  if (onKeyboardShortcutsOpen) {
                    onKeyboardShortcutsOpen();
                  }
                }}
              >
                ⌨️ キーボードショートカット設定
              </button>
            )}
          </div>
        </div>
      )}

      <ImageInserterModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        htmlContent={htmlContent}
        setHtmlContent={setHtmlContent}
        editorRef={editorRef}
        onStatusUpdate={onStatusUpdate}
      />

      <ImageManager
        isOpen={isImageManagerOpen}
        onClose={() => setIsImageManagerOpen(false)}
        onStatusUpdate={onStatusUpdate}
        htmlContent={htmlContent}
        setHtmlContent={setHtmlContent}
        editorRef={editorRef}
      />

      <ProjectManagerModal
        isOpen={isProjectManagerOpen}
        onClose={() => setIsProjectManagerOpen(false)}
        htmlContent={htmlContent}
        setHtmlContent={setHtmlContent}
        onStatusUpdate={onStatusUpdate}
      />

      {editorSettings && onEditorSettingsChange && onEditorSettingsReset && (
        <EditorSettingsModal
          isOpen={isEditorSettingsOpen}
          onClose={() => setIsEditorSettingsOpen(false)}
          settings={editorSettings}
          onSettingsChange={onEditorSettingsChange}
          onReset={onEditorSettingsReset}
        />
      )}

      <PowerPointExporterModal
        isOpen={isPowerPointModalOpen}
        onClose={() => setIsPowerPointModalOpen(false)}
        config={powerPointConfig}
        sizeConfig={sizeConfig}
        onExport={runPowerPointExport}
      />

      <SlideTemplateSelectorModal
        isOpen={isTemplateSelectorOpen}
        onClose={() => setIsTemplateSelectorOpen(false)}
        htmlContent={htmlContent}
        setHtmlContent={setHtmlContent}
        editorRef={editorRef}
        onStatusUpdate={onStatusUpdate}
      />

      {keyboardShortcuts && onKeyboardShortcutsUpdate && onKeyboardShortcutsReset && onKeyboardShortcutsCheckDuplicate && (
        <KeyboardShortcutsModal
          isOpen={isKeyboardShortcutsOpen}
          onClose={() => setIsKeyboardShortcutsOpen(false)}
          shortcuts={keyboardShortcuts}
          onUpdateShortcut={onKeyboardShortcutsUpdate}
          onResetAll={onKeyboardShortcutsReset}
          onCheckDuplicate={onKeyboardShortcutsCheckDuplicate}
        />
      )}
    </div>
  )
}

