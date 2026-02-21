import { DEFAULT_CSS_DESIGN_TEMPLATE_TYPE } from './cssDesignTemplateConfig'
import type { CSSDesignTemplateType } from '@/types'

const STORAGE_KEY = 'slideEditor_cssDesignTemplate'
export const CSS_DESIGN_TEMPLATE_CHANGE_EVENT = 'cssDesignTemplateChange'

const VALID_TYPES: CSSDesignTemplateType[] = ['default', 'nature', 'monochrome', 'ocean', 'warm']

export function getCSSDesignTemplateType(): CSSDesignTemplateType {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && VALID_TYPES.includes(stored as CSSDesignTemplateType)) {
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
