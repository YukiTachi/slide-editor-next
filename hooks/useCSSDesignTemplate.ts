'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { getCSSDesignTemplateType, saveCSSDesignTemplateType, resetCSSDesignTemplateType, CSS_DESIGN_TEMPLATE_CHANGE_EVENT } from '@/lib/cssDesignTemplateStorage'
import { getCSSDesignTemplate, getAllCSSDesignTemplates, DEFAULT_CSS_DESIGN_TEMPLATE_TYPE } from '@/lib/cssDesignTemplateConfig'
import { saveCustomTemplate, deleteCustomTemplate } from '@/lib/customCSSTemplateStorage'
import type { CSSDesignTemplateType, CSSDesignTemplate } from '@/types'

export function useCSSDesignTemplate() {
  const [templateType, setTemplateTypeState] = useState<CSSDesignTemplateType>(() => getCSSDesignTemplateType())
  const [allTemplates, setAllTemplates] = useState<CSSDesignTemplate[]>(() => getAllCSSDesignTemplates())

  const refreshTemplates = useCallback(() => {
    setAllTemplates(getAllCSSDesignTemplates())
  }, [])

  useEffect(() => {
    const saved = getCSSDesignTemplateType()
    setTemplateTypeState(saved)
    refreshTemplates()

    const handleTemplateChange = (event: Event) => {
      const customEvent = event as CustomEvent<CSSDesignTemplateType>
      if (customEvent.detail) {
        setTemplateTypeState(customEvent.detail)
      }
      refreshTemplates()
    }

    window.addEventListener(CSS_DESIGN_TEMPLATE_CHANGE_EVENT, handleTemplateChange)
    return () => {
      window.removeEventListener(CSS_DESIGN_TEMPLATE_CHANGE_EVENT, handleTemplateChange)
    }
  }, [refreshTemplates])

  const setCSSDesignTemplate = useCallback((newType: CSSDesignTemplateType) => {
    setTemplateTypeState(newType)
    saveCSSDesignTemplateType(newType)
  }, [])

  const template: CSSDesignTemplate = useMemo(() => {
    return getCSSDesignTemplate(templateType)
  }, [templateType, allTemplates])

  const resetCSSDesignTemplate = useCallback(() => {
    resetCSSDesignTemplateType()
    setTemplateTypeState(DEFAULT_CSS_DESIGN_TEMPLATE_TYPE)
  }, [])

  const addCustomTemplate = useCallback((name: string, css: string): CSSDesignTemplateType => {
    const id = saveCustomTemplate(name, css)
    refreshTemplates()
    return id
  }, [refreshTemplates])

  const removeCustomTemplate = useCallback((id: CSSDesignTemplateType) => {
    deleteCustomTemplate(id)
    // 削除したテンプレートが選択中ならdefaultにフォールバック
    if (templateType === id) {
      setCSSDesignTemplate(DEFAULT_CSS_DESIGN_TEMPLATE_TYPE)
    }
    refreshTemplates()
  }, [templateType, setCSSDesignTemplate, refreshTemplates])

  return {
    templateType,
    template,
    allTemplates,
    setCSSDesignTemplate,
    resetCSSDesignTemplate,
    addCustomTemplate,
    removeCustomTemplate,
  }
}
