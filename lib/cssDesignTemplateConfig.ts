import type { BuiltInCSSDesignTemplateType, CSSDesignTemplateType, CSSDesignTemplate } from '@/types'
import { loadCustomTemplates, getCustomTemplateCSS } from './customCSSTemplateStorage'

export const DEFAULT_CSS_DESIGN_TEMPLATE_TYPE: CSSDesignTemplateType = 'default'

export const CSS_DESIGN_TEMPLATE_PRESETS: Record<BuiltInCSSDesignTemplateType, CSSDesignTemplate> = {
  default: {
    id: 'default',
    name: 'スタンダード',
    description: '青/赤アクセントのビジネス調デザイン',
    icon: '🔵',
    colors: {
      primary: '#3498db',
      secondary: '#e74c3c',
      text: '#2c3e50',
      heading: '#2c3e50',
      headingSub: '#34495e',
      footer: '#7f8c8d',
      highlight: '#fff59d',
      background: '#f0f0f0',
    },
    listBullet: '▶',
  },
  nature: {
    id: 'nature',
    name: 'ナチュラル',
    description: '緑系の落ち着いたデザイン',
    icon: '🌿',
    colors: {
      primary: '#27ae60',
      secondary: '#f39c12',
      text: '#2c3e50',
      heading: '#2c3e50',
      headingSub: '#34495e',
      footer: '#7f8c8d',
      highlight: '#d4efdf',
      background: '#f5f5f0',
    },
    listBullet: '●',
  },
  monochrome: {
    id: 'monochrome',
    name: 'モノクローム',
    description: 'グレースケールのシンプルデザイン',
    icon: '⬛',
    colors: {
      primary: '#555555',
      secondary: '#888888',
      text: '#333333',
      heading: '#222222',
      headingSub: '#444444',
      footer: '#999999',
      highlight: '#e0e0e0',
      background: '#f5f5f5',
    },
    listBullet: '―',
  },
  ocean: {
    id: 'ocean',
    name: 'オーシャン',
    description: '深い青系のクールなデザイン',
    icon: '🌊',
    colors: {
      primary: '#2980b9',
      secondary: '#1abc9c',
      text: '#2c3e50',
      heading: '#1a5276',
      headingSub: '#21618c',
      footer: '#7f8c8d',
      highlight: '#d6eaf8',
      background: '#eaf2f8',
    },
    listBullet: '◆',
  },
  warm: {
    id: 'warm',
    name: 'ウォーム',
    description: '暖色系のやさしいデザイン',
    icon: '🔥',
    colors: {
      primary: '#e67e22',
      secondary: '#e74c3c',
      text: '#4a3728',
      heading: '#4a3728',
      headingSub: '#6d4c41',
      footer: '#a1887f',
      highlight: '#fdebd0',
      background: '#fdf2e9',
    },
    listBullet: '▸',
  },
}

export function getCSSDesignTemplate(type: CSSDesignTemplateType): CSSDesignTemplate {
  // ビルトインテンプレート
  if (type in CSS_DESIGN_TEMPLATE_PRESETS) {
    return CSS_DESIGN_TEMPLATE_PRESETS[type as BuiltInCSSDesignTemplateType]
  }

  // カスタムテンプレート
  if (typeof type === 'string' && type.startsWith('custom_')) {
    const customTemplates = loadCustomTemplates()
    const found = customTemplates.find(t => t.id === type)
    if (found) return found
  }

  return CSS_DESIGN_TEMPLATE_PRESETS[DEFAULT_CSS_DESIGN_TEMPLATE_TYPE as BuiltInCSSDesignTemplateType]
}

export function getAllCSSDesignTemplates(): CSSDesignTemplate[] {
  const builtIn = Object.values(CSS_DESIGN_TEMPLATE_PRESETS)
  const custom = loadCustomTemplates()
  return [...builtIn, ...custom]
}
