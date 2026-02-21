'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { getCSSDesignTemplateType, saveCSSDesignTemplateType, resetCSSDesignTemplateType, CSS_DESIGN_TEMPLATE_CHANGE_EVENT } from '@/lib/cssDesignTemplateStorage'
import { getCSSDesignTemplate, DEFAULT_CSS_DESIGN_TEMPLATE_TYPE } from '@/lib/cssDesignTemplateConfig'
import type { CSSDesignTemplateType, CSSDesignTemplate } from '@/types'

export function useCSSDesignTemplate() {
  const [templateType, setTemplateTypeState] = useState<CSSDesignTemplateType>(() => getCSSDesignTemplateType())

  useEffect(() => {
    const saved = getCSSDesignTemplateType()
    setTemplateTypeState(saved)

    const handleTemplateChange = (event: Event) => {
      const customEvent = event as CustomEvent<CSSDesignTemplateType>
      setTemplateTypeState(customEvent.detail)
    }

    window.addEventListener(CSS_DESIGN_TEMPLATE_CHANGE_EVENT, handleTemplateChange)
    return () => {
      window.removeEventListener(CSS_DESIGN_TEMPLATE_CHANGE_EVENT, handleTemplateChange)
    }
  }, [])

  const setCSSDesignTemplate = useCallback((newType: CSSDesignTemplateType) => {
    setTemplateTypeState(newType)
    saveCSSDesignTemplateType(newType)
  }, [])

  const template: CSSDesignTemplate = useMemo(() => {
    return getCSSDesignTemplate(templateType)
  }, [templateType])

  const resetCSSDesignTemplate = useCallback(() => {
    resetCSSDesignTemplateType()
    setTemplateTypeState(DEFAULT_CSS_DESIGN_TEMPLATE_TYPE)
  }, [])

  return {
    templateType,
    template,
    setCSSDesignTemplate,
    resetCSSDesignTemplate,
  }
}
