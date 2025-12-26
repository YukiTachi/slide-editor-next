'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './SlideSizeSelector.module.css'
import type { SlideSizeType } from '@/types'
import { SLIDE_SIZE_PRESETS } from '@/lib/slideSizeConfig'

interface SlideSizeSelectorProps {
  currentSizeType: SlideSizeType
  onSizeChange: (sizeType: SlideSizeType) => void
}

const SIZE_OPTIONS = [
  {
    type: 'a4-landscape' as SlideSizeType,
    label: 'A4横向き',
    shortLabel: 'A4',
    description: '297mm × 210mm',
    icon: '📄',
  },
  {
    type: '16-9' as SlideSizeType,
    label: '16:9',
    shortLabel: '16:9',
    description: '1920px × 1080px',
    icon: '🖥️',
  },
]

export default function SlideSizeSelector({
  currentSizeType,
  onSizeChange,
}: SlideSizeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // クリック外部で閉じる
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

  const currentOption = SIZE_OPTIONS.find(opt => opt.type === currentSizeType) || SIZE_OPTIONS[0]

  const handleSelect = (sizeType: SlideSizeType) => {
    onSizeChange(sizeType)
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
      const currentIndex = SIZE_OPTIONS.findIndex(opt => opt.type === currentSizeType)
      const nextIndex = e.key === 'ArrowDown'
        ? (currentIndex + 1) % SIZE_OPTIONS.length
        : (currentIndex - 1 + SIZE_OPTIONS.length) % SIZE_OPTIONS.length
      onSizeChange(SIZE_OPTIONS[nextIndex].type)
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
        title={`スライドサイズ: ${currentOption.label} (${currentOption.description})`}
      >
        <span className={styles.selectorIcon}>{currentOption.icon}</span>
        <span className={styles.selectorLabel}>{currentOption.shortLabel}</span>
        <span className={styles.selectorArrow}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {SIZE_OPTIONS.map((option) => {
            const config = SLIDE_SIZE_PRESETS[option.type]
            const isSelected = currentSizeType === option.type

            return (
              <button
                key={option.type}
                className={`${styles.option} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleSelect(option.type)}
                role="option"
                aria-selected={isSelected}
              >
                <span className={styles.optionIcon}>{option.icon}</span>
                <div className={styles.optionContent}>
                  <div className={styles.optionLabel}>{option.label}</div>
                  <div className={styles.optionDescription}>{config.width} × {config.height}</div>
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

