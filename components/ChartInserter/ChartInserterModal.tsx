'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './ChartInserterModal.module.css'
import { insertChartToHTML } from '@/lib/chartProcessor'
import { renderChart, destroyChart } from '@/lib/chartRenderer'
import { CHART_TYPE_INFO, PRIMARY_CHART_TYPES } from '@/lib/chartTypes'
import type { EditorHandle } from '@/components/Editor/Editor'
import type { ChartConfig, ChartType, ChartData, ChartDataset } from '@/types'

interface ChartInserterModalProps {
  isOpen: boolean
  onClose: () => void
  htmlContent: string
  setHtmlContent: (content: string) => void
  editorRef?: React.RefObject<EditorHandle | null>
  onStatusUpdate?: (message: string) => void
}

export default function ChartInserterModal({
  isOpen,
  onClose,
  htmlContent,
  setHtmlContent,
  editorRef,
  onStatusUpdate
}: ChartInserterModalProps) {
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [title, setTitle] = useState('')
  const [labels, setLabels] = useState<string[]>(['項目1', '項目2', '項目3', '項目4'])
  const [datasets, setDatasets] = useState<ChartDataset[]>([
    {
      label: 'データセット1',
      data: [10, 20, 30, 40],
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }
  ])
  const [showLegend, setShowLegend] = useState(true)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<any>(null)

  // ESCキーで閉じる
  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // グラフのプレビューを更新
  useEffect(() => {
    if (!isOpen || !previewCanvasRef.current) {
      return
    }

    // 既存のグラフを破棄
    if (chartInstanceRef.current) {
      destroyChart(chartInstanceRef.current)
      chartInstanceRef.current = null
    }

    // 新しいグラフをレンダリング
    const config: ChartConfig = {
      type: chartType,
      title: title || undefined,
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: showLegend,
            position: 'top'
          },
          title: {
            display: !!title,
            text: title
          }
        }
      }
    }

    const chart = renderChart(previewCanvasRef.current, config)
    if (chart) {
      chartInstanceRef.current = chart
    }

    return () => {
      if (chartInstanceRef.current) {
        destroyChart(chartInstanceRef.current)
        chartInstanceRef.current = null
      }
    }
  }, [isOpen, chartType, title, labels, datasets, showLegend])

  if (!isOpen) {
    return null
  }

  // document.bodyが存在しない場合はレンダリングしない
  if (typeof document === 'undefined' || !document.body) {
    return null
  }

  const handleInsert = () => {
    if (!htmlContent || !setHtmlContent || !editorRef) {
      alert('エディタが利用できません')
      return
    }

    // データの検証
    if (labels.length === 0) {
      alert('ラベルを少なくとも1つ入力してください')
      return
    }

    if (datasets.length === 0) {
      alert('データセットを少なくとも1つ入力してください')
      return
    }

    const config: ChartConfig = {
      type: chartType,
      title: title.trim() || undefined,
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: showLegend,
            position: 'top'
          },
          title: {
            display: !!title,
            text: title.trim() || undefined
          }
        }
      },
      width: 600,
      height: 400
    }

    const cursorPos = editorRef.current?.getCursorPosition() || 0
    const result = insertChartToHTML(htmlContent, cursorPos, config)
    
    setHtmlContent(result.newContent)
    setTimeout(() => {
      editorRef?.current?.setCursorPosition(result.newCursorPos)
    }, 0)
    
    if (onStatusUpdate) {
      const chartTypeName = CHART_TYPE_INFO[chartType].name
      onStatusUpdate(`${chartTypeName}を挿入しました`)
      setTimeout(() => onStatusUpdate(''), 3000)
    }
    onClose()
  }

  const handleLabelChange = (index: number, value: string) => {
    const newLabels = [...labels]
    newLabels[index] = value
    setLabels(newLabels)
  }

  const handleAddLabel = () => {
    setLabels([...labels, `項目${labels.length + 1}`])
  }

  const handleRemoveLabel = (index: number) => {
    if (labels.length <= 1) {
      alert('ラベルは少なくとも1つ必要です')
      return
    }
    const newLabels = labels.filter((_, i) => i !== index)
    setLabels(newLabels)
    // データセットのデータも調整
    const newDatasets = datasets.map(dataset => ({
      ...dataset,
      data: dataset.data.filter((_, i) => i !== index)
    }))
    setDatasets(newDatasets)
  }

  const handleDatasetDataChange = (datasetIndex: number, dataIndex: number, value: string) => {
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return

    const newDatasets = [...datasets]
    const newData = [...newDatasets[datasetIndex].data]
    newData[dataIndex] = numValue
    newDatasets[datasetIndex] = {
      ...newDatasets[datasetIndex],
      data: newData
    }
    setDatasets(newDatasets)
  }

  const handleAddDataset = () => {
    const colors = [
      { bg: 'rgba(54, 162, 235, 0.5)', border: 'rgba(54, 162, 235, 1)' },
      { bg: 'rgba(255, 99, 132, 0.5)', border: 'rgba(255, 99, 132, 1)' },
      { bg: 'rgba(75, 192, 192, 0.5)', border: 'rgba(75, 192, 192, 1)' },
      { bg: 'rgba(255, 206, 86, 0.5)', border: 'rgba(255, 206, 86, 1)' },
      { bg: 'rgba(153, 102, 255, 0.5)', border: 'rgba(153, 102, 255, 1)' }
    ]
    const colorIndex = datasets.length % colors.length
    const color = colors[colorIndex]

    setDatasets([
      ...datasets,
      {
        label: `データセット${datasets.length + 1}`,
        data: new Array(labels.length).fill(0),
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 1
      }
    ])
  }

  const handleRemoveDataset = (index: number) => {
    if (datasets.length <= 1) {
      alert('データセットは少なくとも1つ必要です')
      return
    }
    setDatasets(datasets.filter((_, i) => i !== index))
  }

  const handleDatasetLabelChange = (index: number, value: string) => {
    const newDatasets = [...datasets]
    newDatasets[index] = {
      ...newDatasets[index],
      label: value
    }
    setDatasets(newDatasets)
  }

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>📊 グラフを挿入</h3>
        
        <div className={styles.section}>
          <label className={styles.sectionTitle}>グラフタイプ:</label>
          <div className={styles.typeGrid}>
            {PRIMARY_CHART_TYPES.map((type) => {
              const typeInfo = CHART_TYPE_INFO[type]
              return (
                <label
                  key={type}
                  className={`${styles.typeOption} ${chartType === type ? styles.selected : ''}`}
                >
                  <input
                    type="radio"
                    name="chartType"
                    value={type}
                    checked={chartType === type}
                    onChange={() => setChartType(type)}
                  />
                  <span className={styles.typeIcon}>{typeInfo.icon}</span>
                  <div className={styles.typeInfo}>
                    <div className={styles.typeName}>{typeInfo.name}</div>
                    <div className={styles.typeDescription}>{typeInfo.description}</div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>
            <span>グラフタイトル（任意）:</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="グラフのタイトルを入力..."
              className={styles.textInput}
            />
          </label>
        </div>

        <div className={styles.section}>
          <label className={styles.sectionTitle}>ラベル（X軸）:</label>
          <div className={styles.dataTable}>
            {labels.map((label, index) => (
              <div key={index} className={styles.dataRow}>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => handleLabelChange(index, e.target.value)}
                  className={styles.dataInput}
                  placeholder={`ラベル${index + 1}`}
                />
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemoveLabel(index)}
                  disabled={labels.length <= 1}
                >
                  ×
                </button>
              </div>
            ))}
            <button className={styles.addBtn} onClick={handleAddLabel}>
              + ラベルを追加
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.sectionTitle}>データセット:</label>
          {datasets.map((dataset, datasetIndex) => (
            <div key={datasetIndex} className={styles.dataset}>
              <div className={styles.datasetHeader}>
                <input
                  type="text"
                  value={dataset.label}
                  onChange={(e) => handleDatasetLabelChange(datasetIndex, e.target.value)}
                  className={styles.datasetLabelInput}
                  placeholder="データセット名"
                />
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemoveDataset(datasetIndex)}
                  disabled={datasets.length <= 1}
                >
                  × 削除
                </button>
              </div>
              <div className={styles.dataTable}>
                {labels.map((_, dataIndex) => (
                  <div key={dataIndex} className={styles.dataRow}>
                    <span className={styles.dataLabel}>{labels[dataIndex]}:</span>
                    <input
                      type="number"
                      value={dataset.data[dataIndex] || 0}
                      onChange={(e) => handleDatasetDataChange(datasetIndex, dataIndex, e.target.value)}
                      className={styles.dataInput}
                      step="0.1"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button className={styles.addBtn} onClick={handleAddDataset}>
            + データセットを追加
          </button>
        </div>

        <div className={styles.section}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showLegend}
              onChange={(e) => setShowLegend(e.target.checked)}
            />
            <span>凡例を表示</span>
          </label>
        </div>

        <div className={styles.section}>
          <label className={styles.sectionTitle}>プレビュー:</label>
          <div className={styles.previewContainer}>
            <canvas ref={previewCanvasRef} width={600} height={400}></canvas>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.insertBtn} onClick={handleInsert}>
            📊 挿入
          </button>
          <button className={styles.cancelBtn} onClick={onClose}>
            ❌ キャンセル
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}


