// グラフレンダリングユーティリティ

'use client'

import { Chart, registerables } from 'chart.js'
import type { ChartConfig } from '@/types'

// Chart.jsを登録
Chart.register(...registerables)

// グラフをレンダリング
export function renderChart(
  canvas: HTMLCanvasElement,
  config: ChartConfig
): Chart | null {
  if (!canvas) {
    return null
  }

  try {
    // Chart.jsの設定を作成
    const chartConfig = {
      type: config.type,
      data: config.data,
      options: {
        responsive: config.options?.responsive ?? true,
        maintainAspectRatio: config.options?.maintainAspectRatio ?? false,
        plugins: {
          legend: {
            display: config.options?.plugins?.legend?.display ?? true,
            position: config.options?.plugins?.legend?.position ?? 'top'
          },
          title: {
            display: config.options?.plugins?.title?.display ?? (!!config.title),
            text: config.options?.plugins?.title?.text ?? config.title
          }
        },
        scales: config.options?.scales
      }
    }

    // グラフを作成
    const chart = new Chart(canvas, chartConfig)
    return chart
  } catch (error) {
    console.error('グラフのレンダリングに失敗:', error)
    return null
  }
}

// グラフを更新
export function updateChart(
  chart: Chart | null,
  config: ChartConfig
): void {
  if (!chart) {
    return
  }

  try {
    chart.data = config.data
    chart.options = {
      ...chart.options,
      plugins: {
        ...chart.options.plugins,
        title: {
          ...chart.options.plugins?.title,
          display: config.options?.plugins?.title?.display ?? (!!config.title),
          text: config.options?.plugins?.title?.text ?? config.title
        }
      }
    }
    chart.update()
  } catch (error) {
    console.error('グラフの更新に失敗:', error)
  }
}

// グラフを破棄
export function destroyChart(chart: Chart | null): void {
  if (chart) {
    try {
      chart.destroy()
    } catch (error) {
      console.error('グラフの破棄に失敗:', error)
    }
  }
}


