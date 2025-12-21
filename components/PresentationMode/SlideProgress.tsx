'use client'

import styles from './PresentationMode.module.css'

interface SlideProgressProps {
  currentSlide: number
  totalSlides: number
  showProgressBar?: boolean
}

export default function SlideProgress({
  currentSlide,
  totalSlides,
  showProgressBar = false
}: SlideProgressProps) {
  const progress = totalSlides > 0 ? ((currentSlide + 1) / totalSlides) * 100 : 0

  return (
    <div className={styles.progress}>
      <span className={styles.slideNumber}>
        {currentSlide + 1} / {totalSlides}
      </span>
      {showProgressBar && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

