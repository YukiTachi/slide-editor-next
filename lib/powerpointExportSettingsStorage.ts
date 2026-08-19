// PowerPointエクスポート設定の永続化
// スライドサイズは含めない（エディタのサイズ設定に追従するため。詳細は docs/POWERPOINT_EXPORT_PLAN.md）

import type { PowerPointExportConfig } from '@/types'

const SETTINGS_KEY = 'slideEditor_powerpointExportSettings'

export const DEFAULT_POWERPOINT_EXPORT_CONFIG: PowerPointExportConfig = {
  includePageNumbers: true,
  imageQuality: 'high',
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function validateConfig(value: unknown): value is PowerPointExportConfig {
  if (!value || typeof value !== 'object') return false
  const config = value as Partial<PowerPointExportConfig>
  if (typeof config.includePageNumbers !== 'boolean') return false
  if (!['high', 'medium', 'low'].includes(config.imageQuality as string)) return false
  return true
}

/**
 * 保存された設定を取得する。未保存・不正な値の場合はデフォルトを返す
 */
export function getPowerPointExportConfig(): PowerPointExportConfig {
  if (!isBrowser()) return DEFAULT_POWERPOINT_EXPORT_CONFIG

  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (!stored) return DEFAULT_POWERPOINT_EXPORT_CONFIG

    const parsed: unknown = JSON.parse(stored)
    return validateConfig(parsed) ? parsed : DEFAULT_POWERPOINT_EXPORT_CONFIG
  } catch (error) {
    console.error('PowerPointエクスポート設定の読み込みに失敗:', error)
    return DEFAULT_POWERPOINT_EXPORT_CONFIG
  }
}

export function savePowerPointExportConfig(config: PowerPointExportConfig): void {
  if (!isBrowser()) return

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('PowerPointエクスポート設定の保存に失敗:', error)
  }
}

export function resetPowerPointExportConfig(): void {
  if (!isBrowser()) return

  try {
    localStorage.removeItem(SETTINGS_KEY)
  } catch (error) {
    console.error('PowerPointエクスポート設定のリセットに失敗:', error)
  }
}
