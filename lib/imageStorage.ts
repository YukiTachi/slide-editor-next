// 画像ストレージ管理ユーティリティ

const IMAGES_STORAGE_KEY = 'slideEditorImages'
const IMAGES_FOLDER = 'images/'

export interface ImageData {
  data: string // Base64データ
  originalName: string
  size: number
  type: string
  timestamp: number
}

export interface StoredImages {
  [fileName: string]: ImageData
}

// 画像ストレージを初期化
export function initializeImageStorage(): void {
  if (typeof window === 'undefined') return
  
  if (!localStorage.getItem(IMAGES_STORAGE_KEY)) {
    localStorage.setItem(IMAGES_STORAGE_KEY, JSON.stringify({}))
  }
}

// 画像ファイル名を生成
export function generateImageFileName(originalName: string, counter: number = 1): string {
  const extension = originalName.split('.').pop()?.toLowerCase() || 'png'
  const timestamp = new Date().getTime()
  return `image_${timestamp}_${counter}.${extension}`
}

// 画像をストレージに保存
export function saveImageToStorage(file: File, fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const images: StoredImages = JSON.parse(
          localStorage.getItem(IMAGES_STORAGE_KEY) || '{}'
        )
        images[fileName] = {
          data: e.target?.result as string,
          originalName: file.name,
          size: file.size,
          type: file.type,
          timestamp: new Date().getTime()
        }
        localStorage.setItem(IMAGES_STORAGE_KEY, JSON.stringify(images))
        resolve(fileName)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ストレージから画像を取得
export function getImageFromStorage(fileName: string): string | null {
  if (typeof window === 'undefined') return null
  
  const images: StoredImages = JSON.parse(
    localStorage.getItem(IMAGES_STORAGE_KEY) || '{}'
  )
  return images[fileName] ? images[fileName].data : null
}

// ストレージ内の画像をdata URIに変換
export function convertStorageImagesToDataURI(htmlContent: string): string {
  if (typeof window === 'undefined') return htmlContent
  
  const images: StoredImages = JSON.parse(
    localStorage.getItem(IMAGES_STORAGE_KEY) || '{}'
  )
  let processedContent = htmlContent

  // images/filename.ext パターンを検索してdata URIに置換
  const imagePathRegex = /src="images\/([^"]+)"/g
  const matches = [...processedContent.matchAll(imagePathRegex)]

  for (const match of matches) {
    const fileName = match[1]
    const imageData = images[fileName]?.data
    if (imageData) {
      processedContent = processedContent.replace(
        `src="images/${fileName}"`,
        `src="${imageData}"`
      )
    }
  }

  return processedContent
}

// すべての保存された画像を取得
export function getAllStoredImages(): StoredImages {
  if (typeof window === 'undefined') return {}
  
  return JSON.parse(localStorage.getItem(IMAGES_STORAGE_KEY) || '{}')
}

// 画像を削除
export function deleteImageFromStorage(fileName: string): void {
  if (typeof window === 'undefined') return
  
  const images: StoredImages = JSON.parse(
    localStorage.getItem(IMAGES_STORAGE_KEY) || '{}'
  )
  delete images[fileName]
  localStorage.setItem(IMAGES_STORAGE_KEY, JSON.stringify(images))
}

// Base64画像を外部ファイル参照に変換
export function convertBase64ToExternal(htmlContent: string): Promise<string> {
  return new Promise((resolve) => {
    const base64Regex = /<img[^>]*src="data:image\/[^;]+;base64,[^"]+"[^>]*>/g
    const matches = htmlContent.match(base64Regex)

    if (!matches || matches.length === 0) {
      resolve(htmlContent)
      return
    }

    let newHtmlContent = htmlContent
    let convertedCount = 0
    let processedCount = 0

    matches.forEach((match) => {
      try {
        // base64データを抽出
        const base64Match = match.match(/src="(data:image\/[^;]+;base64,[^"]+)"/)
        if (!base64Match) {
          processedCount++
          if (processedCount === matches.length) {
            resolve(newHtmlContent)
          }
          return
        }

        const base64Data = base64Match[1]
        const altMatch = match.match(/alt="([^"]*)"/)
        const altText = altMatch ? altMatch[1] : 'converted_image'

        // base64データからファイル名を生成
        const mimeType = base64Data.match(/data:image\/([^;]+);/)
        const extension = mimeType ? mimeType[1] : 'png'
        const fileName = `converted_${Date.now()}_${convertedCount}.${extension}`

        // base64データをローカルストレージに保存
        const images: StoredImages = JSON.parse(
          localStorage.getItem(IMAGES_STORAGE_KEY) || '{}'
        )
        images[fileName] = {
          data: base64Data,
          originalName: altText,
          size: (base64Data.length * 3) / 4, // 概算サイズ
          type: `image/${extension}`,
          timestamp: new Date().getTime()
        }
        localStorage.setItem(IMAGES_STORAGE_KEY, JSON.stringify(images))

        // HTML内のbase64参照を外部ファイル参照に置換
        const newImageTag = match.replace(
          /src="data:image\/[^;]+;base64,[^"]+"/,
          `src="${IMAGES_FOLDER}${fileName}"`
        )

        newHtmlContent = newHtmlContent.replace(match, newImageTag)
        convertedCount++
        processedCount++

        if (processedCount === matches.length) {
          resolve(newHtmlContent)
        }
      } catch (error) {
        console.error('画像変換エラー:', error)
        processedCount++
        if (processedCount === matches.length) {
          resolve(newHtmlContent)
        }
      }
    })
  })
}


