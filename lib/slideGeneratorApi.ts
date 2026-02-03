// API GatewayのエンドポイントURL（環境変数または直接指定）
const LAMBDA_API_URL = process.env.NEXT_PUBLIC_LAMBDA_API_URL || 'https://your-api-id.execute-api.region.amazonaws.com/prod/generate-slides'
// API Key（API Gatewayで認証を設定した場合）
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || ''

// タイムアウト設定（60秒 + コールドスタート考慮で余裕を持たせる）
const TIMEOUT_MS = 70000

export async function generateSlides(theme: string, content: string, chapters: string[]): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    // API Keyが設定されている場合はヘッダーに追加
    if (API_KEY) {
      headers['x-api-key'] = API_KEY
    }

    const response = await fetch(LAMBDA_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        theme,
        content,
        chapters,
      }),
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    // ページ番号を更新（既存の関数を使用）
    const { SlideTemplates } = await import('@/lib/slideTemplates')
    const finalHTML = SlideTemplates.updatePageNumbers(data.html)
    
    return finalHTML
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('リクエストがタイムアウトしました。時間をおいて再度お試しください。')
    }
    throw error
  }
}
