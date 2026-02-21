'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './CSSDesignTemplateSelector.module.css'
import type { CSSDesignTemplateType } from '@/types'
import { getAllCSSDesignTemplates } from '@/lib/cssDesignTemplateConfig'

interface CSSDesignTemplateSelectorProps {
  currentTemplateType: CSSDesignTemplateType
  onTemplateChange: (templateType: CSSDesignTemplateType) => void
}

const TEMPLATE_OPTIONS = getAllCSSDesignTemplates()

export default function CSSDesignTemplateSelector({
  currentTemplateType,
  onTemplateChange,
}: CSSDesignTemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const currentOption = TEMPLATE_OPTIONS.find(opt => opt.id === currentTemplateType) || TEMPLATE_OPTIONS[0]

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
      const currentIndex = TEMPLATE_OPTIONS.findIndex(opt => opt.id === currentTemplateType)
      const nextIndex = e.key === 'ArrowDown'
        ? (currentIndex + 1) % TEMPLATE_OPTIONS.length
        : (currentIndex - 1 + TEMPLATE_OPTIONS.length) % TEMPLATE_OPTIONS.length
      onTemplateChange(TEMPLATE_OPTIONS[nextIndex].id)
    }
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
          {TEMPLATE_OPTIONS.map((option) => {
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
                {isSelected && <span className={styles.checkmark}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
