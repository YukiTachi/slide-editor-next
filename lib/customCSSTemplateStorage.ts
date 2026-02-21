import type { CSSDesignTemplate, CSSDesignTemplateType } from '@/types'

// cssDesignTemplateStorage.ts と同じイベント名を使用（循環参照を避けるため直接定義）
const TEMPLATE_CHANGE_EVENT = 'cssDesignTemplateChange'

const TEMPLATES_KEY = 'slideEditor_customCSSTemplates'
const CSS_PREFIX = 'slideEditor_customCSS_'

interface CustomTemplateMeta {
  id: CSSDesignTemplateType
  name: string
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

export function loadCustomTemplates(): CSSDesignTemplate[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    if (!raw) return []
    const metas: CustomTemplateMeta[] = JSON.parse(raw)
    if (!Array.isArray(metas)) return []
    return metas
      .filter(m => m && m.id && m.name)
      .map(m => ({
        id: m.id,
        name: m.name,
        description: 'カスタムCSS',
        icon: '🎨',
        colors: {
          primary: '#888888',
          secondary: '#888888',
          text: '#333333',
          heading: '#333333',
          headingSub: '#555555',
          footer: '#999999',
          highlight: '#e0e0e0',
          background: '#f5f5f5',
        },
        listBullet: '▶',
        customCSS: getCustomTemplateCSS(m.id),
      }))
  } catch {
    return []
  }
}

export function getCustomTemplateCSS(id: CSSDesignTemplateType): string | undefined {
  if (!isBrowser()) return undefined
  try {
    return localStorage.getItem(CSS_PREFIX + id) ?? undefined
  } catch {
    return undefined
  }
}

export function saveCustomTemplate(name: string, css: string): CSSDesignTemplateType {
  if (!isBrowser()) throw new Error('ブラウザ環境が必要です')

  const id: CSSDesignTemplateType = `custom_${Date.now()}`

  // メタデータ保存
  const metas = loadCustomTemplateMetas()
  metas.push({ id, name })
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(metas))

  // CSS本体保存
  localStorage.setItem(CSS_PREFIX + id, css)

  // 変更イベント発火
  window.dispatchEvent(new CustomEvent(TEMPLATE_CHANGE_EVENT, { detail: id }))

  return id
}

export function deleteCustomTemplate(id: CSSDesignTemplateType): void {
  if (!isBrowser()) return
  try {
    const metas = loadCustomTemplateMetas().filter(m => m.id !== id)
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(metas))
    localStorage.removeItem(CSS_PREFIX + id)
    window.dispatchEvent(new CustomEvent(TEMPLATE_CHANGE_EVENT, { detail: id }))
  } catch (error) {
    console.warn('カスタムテンプレートの削除に失敗しました:', error)
  }
}

function loadCustomTemplateMetas(): CustomTemplateMeta[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((m: CustomTemplateMeta) => m && m.id && m.name)
  } catch {
    return []
  }
}
