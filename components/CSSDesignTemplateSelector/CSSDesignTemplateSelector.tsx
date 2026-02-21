'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './CSSDesignTemplateSelector.module.css'
import type { CSSDesignTemplateType, CSSDesignTemplate } from '@/types'

interface CSSDesignTemplateSelectorProps {
  currentTemplateType: CSSDesignTemplateType
  onTemplateChange: (templateType: CSSDesignTemplateType) => void
  allTemplates: CSSDesignTemplate[]
  onAddCustomTemplate?: (name: string, css: string) => CSSDesignTemplateType
  onDeleteCustomTemplate?: (id: CSSDesignTemplateType) => void
}

export default function CSSDesignTemplateSelector({
  currentTemplateType,
  onTemplateChange,
  allTemplates,
  onAddCustomTemplate,
  onDeleteCustomTemplate,
}: CSSDesignTemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const builtInTemplates = allTemplates.filter(t => !t.customCSS)
  const customTemplates = allTemplates.filter(t => t.customCSS)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  const currentOption = allTemplates.find(opt => opt.id === currentTemplateType) || allTemplates[0]

  const handleSelect = (templateType: CSSDesignTemplateType) => {
    onTemplateChange(templateType)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen(!isOpen)
    } else if (isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      const currentIndex = allTemplates.findIndex(opt => opt.id === currentTemplateType)
      const nextIndex = e.key === 'ArrowDown'
        ? (currentIndex + 1) % allTemplates.length
        : (currentIndex - 1 + allTemplates.length) % allTemplates.length
      onTemplateChange(allTemplates[nextIndex].id)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onAddCustomTemplate) return

    const name = file.name.replace(/\.css$/i, '')
    const reader = new FileReader()
    reader.onload = () => {
      const css = reader.result as string
      const id = onAddCustomTemplate(name, css)
      onTemplateChange(id)
    }
    reader.readAsText(file)

    // 同じファイルを再選択可能にする
    e.target.value = ''
  }

  const handleDelete = (e: React.MouseEvent, id: CSSDesignTemplateType) => {
    e.stopPropagation()
    if (onDeleteCustomTemplate) {
      onDeleteCustomTemplate(id)
    }
  }

  const renderTemplateOption = (option: CSSDesignTemplate, isCustom: boolean) => {
    const isSelected = currentTemplateType === option.id

    return (
      <button
        key={option.id}
        className={`${styles.option} ${isSelected ? styles.selected : ''}`}
        onClick={() => handleSelect(option.id)}
        role="option"
        aria-selected={isSelected}
      >
        <span className={styles.optionIcon}>{option.icon}</span>
        <div className={styles.optionContent}>
          <div className={styles.optionLabel}>{option.name}</div>
          <div className={styles.optionDescription}>{option.description}</div>
        </div>
        {!isCustom && (
          <div className={styles.colorDots}>
            <span
              className={styles.colorDot}
              style={{ backgroundColor: option.colors.primary }}
              title="Primary"
            />
            <span
              className={styles.colorDot}
              style={{ backgroundColor: option.colors.secondary }}
              title="Secondary"
            />
          </div>
        )}
        {isSelected && <span className={styles.checkmark}>✓</span>}
        {isCustom && onDeleteCustomTemplate && (
          <button
            className={styles.deleteButton}
            onClick={(e) => handleDelete(e, option.id)}
            title="テンプレートを削除"
            aria-label={`${option.name}を削除`}
          >
            ×
          </button>
        )}
      </button>
    )
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.selectorButton}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title={`デザインテンプレート: ${currentOption.name}`}
      >
        <span className={styles.selectorIcon}>{currentOption.icon}</span>
        <span className={styles.selectorLabel}>{currentOption.name}</span>
        <span className={styles.selectorArrow}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {builtInTemplates.map((option) => renderTemplateOption(option, false))}

          {customTemplates.length > 0 && (
            <>
              <div className={styles.separator} />
              <div className={styles.sectionLabel}>カスタム</div>
              {customTemplates.map((option) => renderTemplateOption(option, true))}
            </>
          )}

          <div className={styles.separator} />
          <button
            className={styles.addButton}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className={styles.addIcon}>+</span>
            <span>カスタムテンプレートを追加</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".css"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      )}
    </div>
  )
}
