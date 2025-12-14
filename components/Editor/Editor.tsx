'use client'

import { useRef, useEffect, useImperativeHandle, forwardRef, useState, useMemo } from 'react'
import { EditorView, gutter, GutterMarker } from '@codemirror/view'
import { html } from '@codemirror/lang-html'
import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { EditorState, Extension, StateField, Compartment } from '@codemirror/state'
import { lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine, keymap, rectangularSelection, crosshairCursor, Decoration, DecorationSet } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { foldGutter, foldKeymap, syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { lintKeymap } from '@codemirror/lint'
import styles from './Editor.module.css'
import { validateHTML, type ValidationError } from '@/lib/htmlValidator'
import type { EditorSettings } from '@/types'
import { DEFAULT_EDITOR_SETTINGS } from '@/lib/editorSettingsStorage'

export interface EditorHandle {
  getCursorPosition: () => number
  setCursorPosition: (position: number) => void
  focus: () => void
}

interface EditorProps {
  htmlContent: string
  setHtmlContent: (content: string) => void
  onValidationChange?: (errors: ValidationError[]) => void
  editorSettings?: EditorSettings
}

// HTMLタグと属性のオートコンプリート
const htmlCompletions = (context: CompletionContext): CompletionResult | null => {
  const word = context.matchBefore(/\w*/)
  if (!word) return null

  const tagCompletions = [
    { label: 'div', type: 'tag', info: 'ブロック要素コンテナ' },
    { label: 'span', type: 'tag', info: 'インライン要素コンテナ' },
    { label: 'h1', type: 'tag', info: '見出し1' },
    { label: 'h2', type: 'tag', info: '見出し2' },
    { label: 'h3', type: 'tag', info: '見出し3' },
    { label: 'p', type: 'tag', info: '段落' },
    { label: 'ul', type: 'tag', info: '順序なしリスト' },
    { label: 'ol', type: 'tag', info: '順序ありリスト' },
    { label: 'li', type: 'tag', info: 'リスト項目' },
    { label: 'img', type: 'tag', info: '画像' },
    { label: 'a', type: 'tag', info: 'リンク' },
    { label: 'strong', type: 'tag', info: '強調（太字）' },
    { label: 'em', type: 'tag', info: '強調（斜体）' },
    { label: 'br', type: 'tag', info: '改行' },
    { label: 'hr', type: 'tag', info: '水平線' },
    { label: 'table', type: 'tag', info: 'テーブル' },
    { label: 'tr', type: 'tag', info: 'テーブル行' },
    { label: 'td', type: 'tag', info: 'テーブルセル' },
    { label: 'th', type: 'tag', info: 'テーブルヘッダー' },
  ]

  const attributeCompletions = [
    { label: 'class', type: 'attribute', info: 'CSSクラス' },
    { label: 'id', type: 'attribute', info: '要素ID' },
    { label: 'style', type: 'attribute', info: 'インラインスタイル' },
    { label: 'src', type: 'attribute', info: '画像/リソースのURL' },
    { label: 'alt', type: 'attribute', info: '代替テキスト' },
    { label: 'href', type: 'attribute', info: 'リンク先URL' },
    { label: 'target', type: 'attribute', info: 'リンクの開き方' },
    { label: 'title', type: 'attribute', info: 'ツールチップ' },
  ]

  const classCompletions = [
    { label: 'slide', type: 'class', info: 'スライドコンテナ' },
    { label: 'split', type: 'class', info: '2分割レイアウト' },
    { label: 'left', type: 'class', info: '左側コンテンツ' },
    { label: 'right', type: 'class', info: '右側コンテンツ' },
  ]

  // 現在の位置の前の文字列を取得
  const before = context.state.doc.sliceString(Math.max(0, word.from - 50), word.from)
  
  // タグ内かどうか（<tag の後）
  const inTag = /<\w+\s*$/.test(before)
  // 属性かどうか（<tag attr の後）
  const inAttribute = /<\w+[^>]*\s+\w*$/.test(before) && !before.includes('=')
  // class属性の値かどうか
  const inClassValue = /class\s*=\s*["']?\w*$/.test(before)

  let options: Array<{ label: string; type: string; info: string }> = []

  if (inClassValue) {
    options = classCompletions.filter(c => c.label.startsWith(word.text))
  } else if (inAttribute) {
    options = attributeCompletions.filter(c => c.label.startsWith(word.text))
  } else if (inTag || word.text.length === 0) {
    options = tagCompletions.filter(c => c.label.startsWith(word.text))
  } else {
    // デフォルト: タグと属性の両方
    options = [...tagCompletions, ...attributeCompletions].filter(c => c.label.startsWith(word.text))
  }

  if (options.length === 0) return null

  return {
    from: word.from,
    options: options.map(opt => ({
      label: opt.label,
      type: opt.type,
      detail: opt.info,
    })),
  }
}

// エラーガターマーカー
class ErrorMarker extends GutterMarker {
  constructor(public message: string, public isError: boolean) {
    super()
  }

  toDOM() {
    const marker = document.createElement('div')
    marker.textContent = this.isError ? '❌' : '⚠️'
    marker.title = this.message
    marker.style.cursor = 'help'
    marker.style.fontSize = '12px'
    marker.style.textAlign = 'center'
    return marker
  }
}

const Editor = forwardRef<EditorHandle, EditorProps>(({ htmlContent, setHtmlContent, onValidationChange, editorSettings = DEFAULT_EDITOR_SETTINGS }, ref) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const themeConfigRef = useRef<Compartment | null>(null)
  const tabSizeConfigRef = useRef<Compartment | null>(null)

  // リアルタイム検証
  const validationErrors = useMemo(() => {
    if (!htmlContent.trim()) return []
    return validateHTML(htmlContent)
  }, [htmlContent])

  // 親コンポーネントにエラー情報を通知
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(validationErrors)
    }
  }, [validationErrors, onValidationChange])

  // CodeMirrorの初期化
  useEffect(() => {
    if (!editorRef.current) return
    if (viewRef.current) return // 既に初期化済みの場合はスキップ

    // Compartmentを作成
    if (!themeConfigRef.current) {
      themeConfigRef.current = new Compartment()
    }
    if (!tabSizeConfigRef.current) {
      tabSizeConfigRef.current = new Compartment()
    }

    const themeConfig = themeConfigRef.current
    const tabSizeConfig = tabSizeConfigRef.current

    // テーマ設定（フォントサイズ、フォントファミリー、行の高さ）
    const createThemeExtension = (settings: EditorSettings) => EditorView.theme({
      '&': {
        fontSize: `${settings.fontSize}px`,
        fontFamily: settings.fontFamily,
        height: '100%',
      },
      '.cm-content': {
        padding: '15px',
        lineHeight: `${settings.lineHeight}`,
      },
      '.cm-editor': {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      },
      '.cm-scroller': {
        overflow: 'auto',
        flex: 1,
        minHeight: 0,
      },
      '.cm-lineNumbers': {
        minWidth: '50px',
      },
      '.cm-focused': {
        outline: 'none',
      },
    })

    // タブサイズ設定
    const createTabSizeExtension = (tabSize: number) => EditorState.tabSize.of(tabSize)

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      EditorState.allowMultipleSelections.of(true),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion({
        override: [htmlCompletions],
        activateOnTyping: true,
      }),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
      ]),
      html(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString()
          setHtmlContent(newContent)
        }
      }),
      // 設定可能なテーマとタブサイズ
      themeConfig.of(createThemeExtension(editorSettings)),
      tabSizeConfig.of(createTabSizeExtension(editorSettings.tabSize)),
    ]

    const state = EditorState.create({
      doc: htmlContent,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      if (view) {
        view.destroy()
        viewRef.current = null
      }
    }
  }, []) // 初期化は1回だけ

  // 設定変更時にエディタを更新
  useEffect(() => {
    if (!viewRef.current || !themeConfigRef.current || !tabSizeConfigRef.current) return

    const view = viewRef.current
    const themeConfig = themeConfigRef.current
    const tabSizeConfig = tabSizeConfigRef.current

    // テーマ設定を更新
    const themeExtension = EditorView.theme({
      '&': {
        fontSize: `${editorSettings.fontSize}px`,
        fontFamily: editorSettings.fontFamily,
        height: '100%',
      },
      '.cm-content': {
        padding: '15px',
        lineHeight: `${editorSettings.lineHeight}`,
      },
      '.cm-editor': {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      },
      '.cm-scroller': {
        overflow: 'auto',
        flex: 1,
        minHeight: 0,
      },
      '.cm-lineNumbers': {
        minWidth: '50px',
      },
      '.cm-focused': {
        outline: 'none',
      },
    })

    view.dispatch({
      effects: [
        themeConfig.reconfigure(themeExtension),
        tabSizeConfig.reconfigure(EditorState.tabSize.of(editorSettings.tabSize)),
      ],
    })
  }, [editorSettings])

  // コンテンツの同期（外部からの変更）
  useEffect(() => {
    if (!viewRef.current) return
    const currentContent = viewRef.current.state.doc.toString()
    if (currentContent !== htmlContent) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: htmlContent,
        },
      })
    }
  }, [htmlContent])

  // エラー表示の更新
  useEffect(() => {
    if (!viewRef.current) return
    // エラー表示を更新するために、ドキュメントを再評価
    viewRef.current.dispatch({
      effects: [],
    })
  }, [validationErrors])

  // EditorHandleの実装
  useImperativeHandle(ref, () => ({
    getCursorPosition: () => {
      if (!viewRef.current) return 0
      return viewRef.current.state.selection.main.head
    },
    setCursorPosition: (position: number) => {
      if (!viewRef.current) return
      viewRef.current.dispatch({
        selection: { anchor: position, head: position },
      })
      viewRef.current.focus()
    },
    focus: () => {
      viewRef.current?.focus()
    },
  }))

  return (
    <div className={styles.editorPanel}>
      <div className={styles.panelHeader}>HTMLエディタ</div>
      <div className={styles.editorWrapper}>
        <div ref={editorRef} className={styles.codeMirrorContainer} />
      </div>
    </div>
  )
})

Editor.displayName = 'Editor'

export default Editor

