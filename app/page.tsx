'use client'

import { useState, useEffect, useRef } from 'react'
import Editor, { type EditorHandle } from '@/components/Editor/Editor'
import Preview from '@/components/Preview/Preview'
import HamburgerMenu from '@/components/Menu/HamburgerMenu'
import StatusBar from '@/components/StatusBar/StatusBar'
import SearchReplaceModal from '@/components/SearchReplace/SearchReplaceModal'
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle'
import { useTheme } from '@/hooks/useTheme'
import { SlideTemplates } from '@/lib/slideTemplates'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useResize } from '@/hooks/useResize'
import { useHistory } from '@/hooks/useHistory'

export default function Home() {
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [validationErrors, setValidationErrors] = useState<Array<{ line: number; type: 'error' | 'warning'; message: string; code: string }>>([])
  const editorRef = useRef<EditorHandle>(null)
  const defaultHTMLRef = useRef<string>('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchReplaceOpen, setIsSearchReplaceOpen] = useState(false)
  const isRestoreCheckedRef = useRef<boolean>(false)

  const autoSave = useAutoSave(htmlContent, defaultHTMLRef.current)
  const { editorWidth, startResize, editorPanelRef } = useResize()
  const history = useHistory(htmlContent)
  const theme = useTheme()

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

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // エディタ内で入力中はショートカットを無効化
      const target = e.target as HTMLElement
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        return
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault()
            handleUndo()
            break
          case 'y':
            e.preventDefault()
            handleRedo()
            break
          case 's':
            e.preventDefault()
            handleCopyToClipboard()
            break
          case 'k':
            e.preventDefault()
            handleClearEditor()
            break
          case 'o':
            e.preventDefault()
            handleOpenPreviewWindow()
            break
          case 'n':
            e.preventDefault()
            handleAddSlide()
            break
          case 'i':
            e.preventDefault()
            handleImageInsert()
            break
          case 'r':
            e.preventDefault()
            handleRestore()
            break
          case 'f':
            e.preventDefault()
            setIsSearchReplaceOpen(true)
            break
          case 'h':
            e.preventDefault()
            setIsSearchReplaceOpen(true)
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [htmlContent])

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
          />
        </div>
        <div className="resizer" onMouseDown={startResize}></div>
        <div style={{ width: `${100 - editorWidth}%`, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Preview htmlContent={htmlContent} setHtmlContent={setHtmlContent} />
        </div>
      </div>

      <StatusBar htmlContent={htmlContent} statusMessage={statusMessage} validationErrors={validationErrors} />

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
    </div>
  )
}

