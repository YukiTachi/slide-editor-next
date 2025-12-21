'use client'

import { useState, useEffect, useRef } from 'react'
import Editor, { type EditorHandle } from '@/components/Editor/Editor'
import Preview from '@/components/Preview/Preview'
import HamburgerMenu from '@/components/Menu/HamburgerMenu'
import StatusBar from '@/components/StatusBar/StatusBar'
import SearchReplaceModal from '@/components/SearchReplace/SearchReplaceModal'
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle'
import TutorialModal from '@/components/Tutorial/TutorialModal'
import ValidationErrorsPanel from '@/components/ValidationErrorsPanel/ValidationErrorsPanel'
import TableInserterModal from '@/components/TableInserter/TableInserterModal'
import HTMLHierarchyPanel from '@/components/HTMLHierarchyPanel/HTMLHierarchyPanel'
import PresentationMode from '@/components/PresentationMode/PresentationMode'
import { useTheme } from '@/hooks/useTheme'
import { SlideTemplates } from '@/lib/slideTemplates'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useResize } from '@/hooks/useResize'
import { useHistory } from '@/hooks/useHistory'
import { useEditorSettings } from '@/hooks/useEditorSettings'
import { useKeyboardShortcuts, type ShortcutActions } from '@/hooks/useKeyboardShortcuts'
import { useTutorial } from '@/hooks/useTutorial'

export default function Home() {
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [validationErrors, setValidationErrors] = useState<Array<{ line: number; type: 'error' | 'warning'; message: string; code: string }>>([])
  const editorRef = useRef<EditorHandle>(null)
  const defaultHTMLRef = useRef<string>('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchReplaceOpen, setIsSearchReplaceOpen] = useState(false)
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false)
  const [isValidationErrorsPanelOpen, setIsValidationErrorsPanelOpen] = useState(false)
  const [isTableInserterOpen, setIsTableInserterOpen] = useState(false)
  const [isHierarchyPanelOpen, setIsHierarchyPanelOpen] = useState(false)
  const [isPresentationModeOpen, setIsPresentationModeOpen] = useState(false)
  const presentationModeRef = useRef<{ startFullscreen: () => Promise<void> } | null>(null)
  const isRestoreCheckedRef = useRef<boolean>(false)

  const autoSave = useAutoSave(htmlContent, defaultHTMLRef.current)
  const { editorWidth, startResize, editorPanelRef } = useResize()
  const history = useHistory(htmlContent)
  const theme = useTheme()
  const editorSettings = useEditorSettings()
  const tutorial = useTutorial()

  useEffect(() => {
    // 初期化は1回だけ実行
    if (isRestoreCheckedRef.current) {
      return
    }

    // Service Workerの登録を解除（sw.jsの404エラーを防ぐ）
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister()
        }
      })
    }

    // 初期化時にデフォルトHTMLを設定
    const defaultHTML = SlideTemplates.getDefaultHTML()
    defaultHTMLRef.current = defaultHTML
    
    // 復元確認（1回だけ実行）
    isRestoreCheckedRef.current = true
    const restoredContent = autoSave.checkForRestore(defaultHTML, defaultHTML)
    const initialContent = restoredContent || defaultHTML
    setHtmlContent(initialContent)
    history.resetHistory(initialContent)
    
    setIsInitialized(true)
  }, [])

  // ページ離脱時の警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autoSave.hasUnsavedChanges()) {
        e.preventDefault()
        e.returnValue = '未保存の変更があります。本当にページを離れますか？'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [htmlContent, autoSave])

  // 履歴に追加（コンテンツ変更時）
  useEffect(() => {
    if (isInitialized) {
      history.addToHistory(htmlContent)
    }
  }, [htmlContent, isInitialized, history])

  // アンドゥ/リドゥハンドラー
  const handleUndo = () => {
    const previousContent = history.undo()
    if (previousContent !== null) {
      setHtmlContent(previousContent)
      setStatusMessage('元に戻しました')
      setTimeout(() => setStatusMessage(''), 2000)
    }
  }

  const handleRedo = () => {
    const nextContent = history.redo()
    if (nextContent !== null) {
      setHtmlContent(nextContent)
      setStatusMessage('やり直しました')
      setTimeout(() => setStatusMessage(''), 2000)
    }
  }

  // ショートカット用のハンドラー関数
  const handleCopyToClipboard = async () => {
    const trimmedContent = htmlContent.trim()
    if (!trimmedContent) {
      alert('コピーするHTMLがありません')
      return
    }
    const { convertStorageImagesToDataURI } = await import('@/lib/imageStorage')
    const processedHTML = convertStorageImagesToDataURI(trimmedContent)
    try {
      await navigator.clipboard.writeText(processedHTML)
      setStatusMessage('HTMLをクリップボードにコピーしました！（画像も含む）')
      setTimeout(() => setStatusMessage(''), 2000)
    } catch (err) {
      console.error('コピーに失敗:', err)
      alert('クリップボードへのコピーに失敗しました')
    }
  }

  const handleClearEditor = () => {
    if (confirm('エディタの内容をクリアしますか？')) {
      setHtmlContent('')
      setStatusMessage('エディタをクリアしました')
      setTimeout(() => setStatusMessage(''), 2000)
    }
  }

  const handleOpenPreviewWindow = () => {
    // HamburgerMenuのopenPreviewWindowを呼び出す必要がある
    // 一時的な解決策として、window.openを直接使用
    const trimmedContent = htmlContent.trim()
    if (!trimmedContent) {
      alert('プレビューするHTMLコンテンツがありません')
      return
    }
    const { processHTMLForPreview } = require('@/lib/htmlProcessor')
    const processedHTML = processHTMLForPreview(trimmedContent)
    const newWindow = window.open('', 'preview', 'width=1200,height=800,scrollbars=yes,resizable=yes')
    if (newWindow) {
      newWindow.document.title = 'プレビュー - スライドエディタ'
      newWindow.document.open()
      newWindow.document.write(processedHTML)
      newWindow.document.close()
      newWindow.focus()
      setStatusMessage('別ウィンドウでプレビューを開きました')
      setTimeout(() => setStatusMessage(''), 2000)
    }
  }

  const handleAddSlide = () => {
    const cursorPosition = editorRef?.current?.getCursorPosition() || 0
    const slideInsertPosition = SlideTemplates.findSlideInsertPosition(htmlContent, cursorPosition)
    let newHtmlContent = htmlContent.slice(0, slideInsertPosition) + 
                       SlideTemplates.getNewSlideTemplate() + 
                       htmlContent.slice(slideInsertPosition)
    newHtmlContent = SlideTemplates.updatePageNumbers(newHtmlContent)
    setHtmlContent(newHtmlContent)
    const newCursorPosition = slideInsertPosition + SlideTemplates.getNewSlideTemplate().indexOf('<h1>新しいスライド</h1>')
    setTimeout(() => {
      editorRef?.current?.setCursorPosition(newCursorPosition)
    }, 0)
    setStatusMessage('新しいスライドを追加しました（ページ番号を更新）')
    setTimeout(() => setStatusMessage(''), 2000)
  }

  const handleImageInsert = () => {
    // グローバル関数を呼び出して画像挿入モーダルを開く
    if ((window as any).openImageInsertModal) {
      (window as any).openImageInsertModal()
    }
  }

  const handleRestore = () => {
    const restoredContent = autoSave.restore()
    if (restoredContent) {
      setHtmlContent(restoredContent)
      history.resetHistory(restoredContent)
      setStatusMessage('復元完了')
      setTimeout(() => setStatusMessage(''), 2000)
      setTimeout(() => {
        const position = restoredContent.length
        editorRef?.current?.setCursorPosition(position)
      }, 0)
    }
  }

  const handlePasteFromClipboard = (content: string) => {
    // 履歴をリセット
    history.resetHistory(content)
  }

  const handleToggleHierarchy = () => {
    setIsHierarchyPanelOpen(prev => !prev)
  }

  const handleStartPresentation = async () => {
    const { extractSlides } = require('@/lib/slideReorder')
    const slides = extractSlides(htmlContent)
    if (slides.length === 0) {
      alert('スライドがありません。プレゼンテーションモードを開始できません。')
      return
    }
    
    // プレゼンテーションモードを開始（要素をレンダリング）
    setIsPresentationModeOpen(true)
    
    // 要素がレンダリングされた後、ユーザーのクリックイベント内でフルスクリーンを開始
    // ただし、Reactの状態更新は非同期なので、要素がレンダリングされるまで待つ必要がある
    // そのため、PresentationModeコンポーネント側でフルスクリーンを開始する
    // ここでは、コンポーネントがマウントされた後にフルスクリーンを開始するよう指示する
  }

  // ショートカット用のアクション定義
  const shortcutActions: ShortcutActions = {
    'undo': handleUndo,
    'redo': handleRedo,
    'search-replace': () => setIsSearchReplaceOpen(true),
    'copy-to-clipboard': handleCopyToClipboard,
    'clear-editor': handleClearEditor,
    'restore': handleRestore,
    'preview-window': handleOpenPreviewWindow,
    'add-slide': handleAddSlide,
    'insert-image': handleImageInsert,
    'toggle-hierarchy': handleToggleHierarchy,
    'presentation-mode': handleStartPresentation
  }

  // キーボードショートカット管理
  const keyboardShortcuts = useKeyboardShortcuts(shortcutActions)

  if (!isInitialized) {
    return <div>読み込み中...</div>
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>スライドエディタ</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ThemeToggle />
          <HamburgerMenu 
          htmlContent={htmlContent}
          setHtmlContent={setHtmlContent}
          onStatusUpdate={setStatusMessage}
          editorRef={editorRef}
          onRestore={autoSave.restore}
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          onImageInsertRequest={() => {}}
          onUndo={handleUndo}
          onRedo={handleRedo}
          isUndoable={history.isUndoable}
          isRedoable={history.isRedoable}
          onSearchReplace={() => setIsSearchReplaceOpen(true)}
          onPasteFromClipboard={handlePasteFromClipboard}
          editorSettings={editorSettings.settings}
          onEditorSettingsChange={editorSettings.setEditorSettings}
          onEditorSettingsReset={editorSettings.resetEditorSettings}
          keyboardShortcuts={keyboardShortcuts.shortcuts}
          onKeyboardShortcutsUpdate={keyboardShortcuts.updateShortcut}
          onKeyboardShortcutsReset={keyboardShortcuts.resetAllShortcuts}
          onKeyboardShortcutsCheckDuplicate={keyboardShortcuts.checkDuplicate}
          onKeyboardShortcutsOpen={() => setIsKeyboardShortcutsOpen(true)}
          onTutorialOpen={tutorial.openTutorial}
          onTableInsertRequest={() => setIsTableInserterOpen(true)}
          onHierarchyPanelToggle={handleToggleHierarchy}
        />
        </div>
      </header>

      <div className="container">
        <div ref={editorPanelRef} style={{ width: `${editorWidth}%`, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Editor 
            ref={editorRef}
            htmlContent={htmlContent}
            setHtmlContent={setHtmlContent}
            onValidationChange={setValidationErrors}
            editorSettings={editorSettings.settings}
          />
        </div>
        <div className="resizer" onMouseDown={startResize}></div>
        <div style={{ width: `${100 - editorWidth}%`, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Preview 
            htmlContent={htmlContent} 
            setHtmlContent={setHtmlContent}
            onPresentationModeStart={handleStartPresentation}
          />
        </div>
      </div>

      <StatusBar 
        htmlContent={htmlContent} 
        statusMessage={statusMessage} 
        validationErrors={validationErrors}
        onValidationErrorsClick={() => setIsValidationErrorsPanelOpen(true)}
      />

      <SearchReplaceModal
        isOpen={isSearchReplaceOpen}
        onClose={() => setIsSearchReplaceOpen(false)}
        htmlContent={htmlContent}
        onReplace={(newContent) => {
          setHtmlContent(newContent)
          setStatusMessage('置換しました')
          setTimeout(() => setStatusMessage(''), 2000)
        }}
        editorRef={editorRef}
      />

      <TutorialModal
        isOpen={tutorial.isTutorialOpen}
        currentStep={tutorial.currentStep}
        onClose={tutorial.closeTutorial}
        onNext={tutorial.nextStep}
        onPrevious={tutorial.previousStep}
        onSkip={tutorial.skipTutorial}
        onComplete={tutorial.completeTutorial}
      />

      <ValidationErrorsPanel
        isOpen={isValidationErrorsPanelOpen}
        onClose={() => setIsValidationErrorsPanelOpen(false)}
        validationErrors={validationErrors}
        htmlContent={htmlContent}
        editorRef={editorRef}
      />

      <TableInserterModal
        isOpen={isTableInserterOpen}
        onClose={() => setIsTableInserterOpen(false)}
        htmlContent={htmlContent}
        setHtmlContent={setHtmlContent}
        editorRef={editorRef}
        onStatusUpdate={setStatusMessage}
      />

      <PresentationMode
        htmlContent={htmlContent}
        isOpen={isPresentationModeOpen}
        onClose={() => setIsPresentationModeOpen(false)}
        onReady={(startFullscreen) => {
          presentationModeRef.current = { startFullscreen }
          // 準備ができたら、すぐにフルスクリーンを開始
          startFullscreen().catch((error: any) => {
            // ユーザージェスチャー関連のエラーは警告レベルに下げる
            const errorMessage = error?.message || String(error)
            if (
              errorMessage.includes('user gesture') ||
              errorMessage.includes('Permissions check failed') ||
              errorMessage.includes('not allowed')
            ) {
              // ユーザージェスチャー関連のエラーは警告として記録（コンポーネント側で再試行される）
              console.warn('フルスクリーン開始にユーザージェスチャーが必要です（再試行されます）')
            } else {
              // その他のエラーは通常通りエラーとして記録
              console.error('フルスクリーン開始に失敗:', error)
            }
          })
        }}
      />

      <HTMLHierarchyPanel
        htmlContent={htmlContent}
        editorRef={editorRef}
        isOpen={isHierarchyPanelOpen}
        onClose={() => setIsHierarchyPanelOpen(false)}
      />
    </div>
  )
}

