import type { ChartType } from '@/types'

// グラフタイプの説明
export const CHART_TYPE_INFO: Record<ChartType, { 
  name: string
  description: string
  icon: string
  supported: boolean
}> = {
  bar: {
    name: '棒グラフ',
    description: 'カテゴリごとの値を比較',
    icon: '📊',
    supported: true
  },
  line: {
    name: '折れ線グラフ',
    description: '時系列データの推移を表示',
    icon: '📈',
    supported: true
  },
  pie: {
    name: '円グラフ',
    description: '全体に対する割合を表示',
    icon: '🥧',
    supported: true
  },
  doughnut: {
    name: 'ドーナツチャート',
    description: '円グラフの中央が空いた形式',
    icon: '🍩',
    supported: true
  },
  radar: {
    name: 'レーダーチャート',
    description: '複数の指標を比較',
    icon: '📡',
    supported: true
  },
  polarArea: {
    name: '極座標エリアチャート',
    description: '極座標でのエリア表示',
    icon: '⭕',
    supported: true
  },
  bubble: {
    name: 'バブルチャート',
    description: '3次元データをバブルで表示',
    icon: '🫧',
    supported: true
  },
  scatter: {
    name: '散布図',
    description: '2変数の関係を表示',
    icon: '⚫',
    supported: true
  }
}

// 主要なグラフタイプ（最初にサポートするもの）
export const PRIMARY_CHART_TYPES: ChartType[] = ['bar', 'line', 'pie', 'doughnut']


