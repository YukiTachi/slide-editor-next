// HTML階層構造パーサー
// HTMLコンテンツからタグの階層構造を抽出する

export interface HTMLElementNode {
  tagName: string
  id?: string
  className?: string
  attributes?: Record<string, string>
  startPosition: number  // HTML内の開始位置
  endPosition: number     // HTML内の終了位置
  lineNumber: number      // 行番号
  children: HTMLElementNode[]
  isSelfClosing: boolean
}

// 自己完結型タグ（閉じタグ不要）
const SELF_CLOSING_TAGS = new Set([
  'img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed',
  'source', 'track', 'wbr'
])

/**
 * HTMLコンテンツから階層構造を解析
 */
export function parseHTMLHierarchy(htmlContent: string): HTMLElementNode[] {
  const nodes: HTMLElementNode[] = []
  const stack: HTMLElementNode[] = []
  
  // 正規表現でタグを抽出
  const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*)>/g
  const lines = htmlContent.split('\n')
  
  let match
  let currentLine = 1
  let currentPos = 0
  
  while ((match = tagRegex.exec(htmlContent)) !== null) {
    const isClosing = match[1] === '/'
    const tagName = match[2].toLowerCase()
    const attributes = match[3]
    const tagStart = match.index
    const tagEnd = tagStart + match[0].length
    
    // 行番号を計算
    while (currentLine <= lines.length && 
           currentPos + lines[currentLine - 1].length < tagStart) {
      currentPos += lines[currentLine - 1].length + 1
      currentLine++
    }
    
    if (isClosing) {
      // 終了タグ: スタックから対応する開始タグを探す
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tagName === tagName) {
          const node = stack[i]
          node.endPosition = tagEnd
          stack.splice(i)
          break
        }
      }
    } else {
      // 開始タグ
      const isSelfClosing = SELF_CLOSING_TAGS.has(tagName) || 
                            attributes.trim().endsWith('/')
      
      const parsedAttrs = parseAttributes(attributes)
      
      const node: HTMLElementNode = {
        tagName,
        startPosition: tagStart,
        endPosition: isSelfClosing ? tagEnd : -1,
        lineNumber: currentLine,
        children: [],
        isSelfClosing,
        ...parsedAttrs
      }
      
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node)
      } else {
        nodes.push(node)
      }
      
      if (!isSelfClosing) {
        stack.push(node)
      }
    }
  }
  
  // 閉じられていないタグの終了位置を設定
  stack.forEach(node => {
    if (node.endPosition === -1) {
      node.endPosition = htmlContent.length
    }
  })
  
  return nodes
}

/**
 * 属性文字列を解析
 */
function parseAttributes(attrString: string): {
  id?: string
  className?: string
  attributes?: Record<string, string>
} {
  const result: {
    id?: string
    className?: string
    attributes?: Record<string, string>
  } = {}
  
  if (!attrString.trim()) {
    return result
  }
  
  // id属性を抽出
  const idMatch = attrString.match(/\bid\s*=\s*["']([^"']+)["']/i)
  if (idMatch) {
    result.id = idMatch[1]
  }
  
  // class属性を抽出
  const classMatch = attrString.match(/\bclass\s*=\s*["']([^"']+)["']/i)
  if (classMatch) {
    result.className = classMatch[1]
  }
  
  // その他の属性を抽出（簡易版）
  const attrRegex = /(\w+)\s*=\s*["']([^"']+)["']/g
  const attributes: Record<string, string> = {}
  let attrMatch
  
  while ((attrMatch = attrRegex.exec(attrString)) !== null) {
    const key = attrMatch[1].toLowerCase()
    // idとclassは既に処理済みなのでスキップ
    if (key !== 'id' && key !== 'class') {
      attributes[key] = attrMatch[2]
    }
  }
  
  if (Object.keys(attributes).length > 0) {
    result.attributes = attributes
  }
  
  return result
}

