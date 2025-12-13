// プロジェクトファイル管理ユーティリティ

export interface ProjectMeta {
  id: string
  name: string
  updatedAt: string // ISO文字列
}

const PROJECTS_KEY = 'slideEditor_projects_v1'
const PROJECT_CONTENT_PREFIX = 'slideEditor_project_'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function loadProjectsFromStorage(): ProjectMeta[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(PROJECTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ProjectMeta[]
    if (!Array.isArray(parsed)) return []
    // updatedAt の新しい順にソート
    return parsed
      .filter(p => p && p.id && p.name && p.updatedAt)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  } catch {
    return []
  }
}

function saveProjectsToStorage(projects: ProjectMeta[]): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
  } catch (e) {
    console.error('プロジェクト一覧の保存に失敗しました:', e)
  }
}

export function getProjects(): ProjectMeta[] {
  return loadProjectsFromStorage()
}

function generateProjectId(): string {
  const time = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `proj_${time}_${rand}`
}

export function saveProject(
  htmlContent: string,
  name: string,
  existingId?: string
): ProjectMeta {
  if (!isBrowser()) {
    throw new Error('ブラウザ環境以外ではプロジェクト保存は利用できません')
  }

  const projects = loadProjectsFromStorage()
  const now = new Date().toISOString()

  let project: ProjectMeta
  let id = existingId

  if (id) {
    // 既存プロジェクトを更新
    const index = projects.findIndex(p => p.id === id)
    if (index >= 0) {
      projects[index] = {
        ...projects[index],
        name,
        updatedAt: now
      }
      project = projects[index]
    } else {
      // 見つからない場合は新規として扱う
      id = generateProjectId()
      project = { id, name, updatedAt: now }
      projects.push(project)
    }
  } else {
    // 新規プロジェクト
    id = generateProjectId()
    project = { id, name, updatedAt: now }
    projects.push(project)
  }

  // コンテンツを保存
  try {
    localStorage.setItem(PROJECT_CONTENT_PREFIX + project.id, htmlContent)
  } catch (e) {
    console.error('プロジェクト内容の保存に失敗しました:', e)
  }

  // 一覧を保存（新しい順にソート）
  saveProjectsToStorage(
    projects.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  )

  return project
}

export function loadProjectContent(id: string): string | null {
  if (!isBrowser()) return null
  try {
    const content = localStorage.getItem(PROJECT_CONTENT_PREFIX + id)
    return content ?? null
  } catch (e) {
    console.error('プロジェクト内容の読み込みに失敗しました:', e)
    return null
  }
}

export function deleteProject(id: string): void {
  if (!isBrowser()) return
  const projects = loadProjectsFromStorage().filter(p => p.id !== id)
  saveProjectsToStorage(projects)
  try {
    localStorage.removeItem(PROJECT_CONTENT_PREFIX + id)
    // バージョン履歴も削除
    const { deleteAllVersions } = require('./versionStorage')
    deleteAllVersions(id)
  } catch (e) {
    console.error('プロジェクト削除時に内容の削除に失敗しました:', e)
  }
}


