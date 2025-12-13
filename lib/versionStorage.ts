// バージョン管理ユーティリティ

export interface VersionInfo {
  id: string
  createdAt: string // ISO文字列
  description?: string // ユーザーが入力した説明（任意）
  content: string // HTMLコンテンツ
}

const VERSION_PREFIX = 'slideEditor_version_'
const MAX_VERSIONS_PER_PROJECT = 10 // プロジェクトあたりの最大バージョン数

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function generateVersionId(): string {
  const time = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `v_${time}_${rand}`
}

/**
 * プロジェクトのバージョン一覧を取得
 */
export function getVersions(projectId: string): VersionInfo[] {
  if (!isBrowser()) return []
  try {
    const key = VERSION_PREFIX + projectId
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as VersionInfo[]
    if (!Array.isArray(parsed)) return []
    // 作成日時の新しい順にソート
    return parsed
      .filter(v => v && v.id && v.createdAt && v.content)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  } catch (e) {
    console.error('バージョン一覧の読み込みに失敗しました:', e)
    return []
  }
}

/**
 * バージョンを保存
 */
export function saveVersion(
  projectId: string,
  content: string,
  description?: string
): VersionInfo {
  if (!isBrowser()) {
    throw new Error('ブラウザ環境以外ではバージョン保存は利用できません')
  }

  const versions = getVersions(projectId)
  const now = new Date().toISOString()
  
  const newVersion: VersionInfo = {
    id: generateVersionId(),
    createdAt: now,
    description: description || undefined,
    content
  }

  // 新しいバージョンを先頭に追加
  const updatedVersions = [newVersion, ...versions]

  // 最大バージョン数を超えた場合、古いバージョンを削除
  if (updatedVersions.length > MAX_VERSIONS_PER_PROJECT) {
    updatedVersions.splice(MAX_VERSIONS_PER_PROJECT)
  }

  // 保存
  try {
    const key = VERSION_PREFIX + projectId
    localStorage.setItem(key, JSON.stringify(updatedVersions))
  } catch (e) {
    console.error('バージョンの保存に失敗しました:', e)
    // ストレージ容量不足の可能性があるため、古いバージョンを削除して再試行
    if (updatedVersions.length > 1) {
      updatedVersions.pop()
      try {
        const key = VERSION_PREFIX + projectId
        localStorage.setItem(key, JSON.stringify(updatedVersions))
      } catch (e2) {
        console.error('バージョンの保存に再試行も失敗しました:', e2)
      }
    }
  }

  return newVersion
}

/**
 * 特定のバージョンを取得
 */
export function getVersion(projectId: string, versionId: string): VersionInfo | null {
  if (!isBrowser()) return null
  const versions = getVersions(projectId)
  return versions.find(v => v.id === versionId) || null
}

/**
 * バージョンを削除
 */
export function deleteVersion(projectId: string, versionId: string): boolean {
  if (!isBrowser()) return false
  const versions = getVersions(projectId)
  const filtered = versions.filter(v => v.id !== versionId)
  
  if (filtered.length === versions.length) {
    return false // 削除するバージョンが見つからなかった
  }

  try {
    const key = VERSION_PREFIX + projectId
    localStorage.setItem(key, JSON.stringify(filtered))
    return true
  } catch (e) {
    console.error('バージョンの削除に失敗しました:', e)
    return false
  }
}

/**
 * プロジェクトの全バージョンを削除（プロジェクト削除時など）
 */
export function deleteAllVersions(projectId: string): void {
  if (!isBrowser()) return
  try {
    const key = VERSION_PREFIX + projectId
    localStorage.removeItem(key)
  } catch (e) {
    console.error('バージョン一覧の削除に失敗しました:', e)
  }
}

/**
 * バージョン数を取得
 */
export function getVersionCount(projectId: string): number {
  return getVersions(projectId).length
}


