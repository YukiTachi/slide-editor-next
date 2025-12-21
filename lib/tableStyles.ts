import type { TableStyle } from '@/types'

// 表スタイルの説明
export const TABLE_STYLE_INFO: Record<TableStyle, { name: string; description: string; icon: string }> = {
  simple: {
    name: 'シンプル',
    description: 'ボーダーなしのシンプルな表',
    icon: '📋'
  },
  bordered: {
    name: 'ボーダー付き',
    description: 'すべてのセルにボーダー',
    icon: '⬜'
  },
  striped: {
    name: 'ストライプ',
    description: '交互の背景色で見やすく',
    icon: '📊'
  },
  highlight: {
    name: 'ヘッダー強調',
    description: 'ヘッダー行を強調表示',
    icon: '📈'
  },
  minimal: {
    name: 'ミニマル',
    description: '細いボーダーでシンプル',
    icon: '📑'
  }
}


