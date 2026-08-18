import { DEFAULT_CSS_DESIGN_TEMPLATE_TYPE } from './cssDesignTemplateConfig'
import type { BuiltInCSSDesignTemplateType, CSSDesignTemplateType } from '@/types'

const STORAGE_KEY = 'slideEditor_cssDesignTemplate'
export const CSS_DESIGN_TEMPLATE_CHANGE_EVENT = 'cssDesignTemplateChange'

const VALID_BUILTIN_TYPES: BuiltInCSSDesignTemplateType[] = ['default', 'nature', 'monochrome', 'ocean', 'warm']

function isValidTemplateType(value: string): value is CSSDesignTemplateType {
  if (VALID_BUILTIN_TYPES.includes(value as BuiltInCSSDesignTemplateType)) return true
  if (value.startsWith('custom_')) return true
  return false
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

// SSR/静的エクスポート時のプリレンダリングではLocalStorageが存在しないため既定値を返す
export function getCSSDesignTemplateType(): CSSDesignTemplateType {
  if (!isBrowser()) return DEFAULT_CSS_DESIGN_TEMPLATE_TYPE

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && isValidTemplateType(stored)) {
      return stored as CSSDesignTemplateType
    }
  } catch (error) {
    console.warn('Failed to load CSS design template from storage:', error)
  }
  return DEFAULT_CSS_DESIGN_TEMPLATE_TYPE
}

export function saveCSSDesignTemplateType(type: CSSDesignTemplateType): void {
  try {
    localStorage.setItem(STORAGE_KEY, type)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CSS_DESIGN_TEMPLATE_CHANGE_EVENT, { detail: type }))
    }
  } catch (error) {
    console.warn('Failed to save CSS design template to storage:', error)
  }
}

export function resetCSSDesignTemplateType(): void {
  saveCSSDesignTemplateType(DEFAULT_CSS_DESIGN_TEMPLATE_TYPE)
}
