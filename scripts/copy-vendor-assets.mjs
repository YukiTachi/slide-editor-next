/**
 * node_modules から Chart.js / KaTeX / Prism.js の配信用ファイルを public/vendor/ にコピーし、
 * バージョン定数を lib/vendorManifest.generated.ts に書き出す。
 *
 * - `npm run dev` / `npm run build` の predev / prebuild で自動実行される（コンテナ内）
 * - 配置先は public/vendor/<パッケージ名>@<バージョン>/（長期キャッシュ対策のためURLにバージョンを含める）
 * - コピー元が見つからなければ非0終了する（npm install 忘れの早期検出）
 *
 * 設計の詳細は docs/CDN_LOCAL_BUNDLE_PLAN.md を参照。
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const NODE_MODULES = join(ROOT, 'node_modules')
const VENDOR_DIR = join(ROOT, 'public', 'vendor')
const MANIFEST_PATH = join(ROOT, 'lib', 'vendorManifest.generated.ts')

/**
 * コピー対象の定義
 * - file: 単一ファイル。src（パッケージ内の相対パス）→ dest（配置先ディレクトリ内の相対パス）
 * - dir : ディレクトリ内の拡張子一致ファイルをすべて dest/ にコピー（サブディレクトリは辿らない）
 */
const TARGETS = [
  {
    name: 'chart.js',
    manifestKey: 'chartjs',
    entries: [{ kind: 'file', src: 'dist/chart.umd.min.js', dest: 'chart.umd.min.js' }],
  },
  {
    name: 'katex',
    manifestKey: 'katex',
    entries: [
      { kind: 'file', src: 'dist/katex.min.js', dest: 'katex.min.js' },
      { kind: 'file', src: 'dist/katex.min.css', dest: 'katex.min.css' },
      // CSS の @font-face は woff2 を最優先で宣言しており、対象ブラウザはすべて woff2 対応のため woff/ttf は省く
      { kind: 'dir', src: 'dist/fonts', dest: 'fonts', ext: '.woff2' },
    ],
  },
  {
    name: 'prismjs',
    manifestKey: 'prismjs',
    entries: [
      // 言語定義は autoloader が必要時に1ファイルずつ取得する。依存解決の漏れを防ぐため全言語を置く
      { kind: 'dir', src: 'components', dest: 'components', ext: '.min.js' },
      { kind: 'file', src: 'plugins/autoloader/prism-autoloader.min.js', dest: 'plugins/autoloader/prism-autoloader.min.js' },
      { kind: 'file', src: 'plugins/line-numbers/prism-line-numbers.min.js', dest: 'plugins/line-numbers/prism-line-numbers.min.js' },
      { kind: 'file', src: 'plugins/line-numbers/prism-line-numbers.min.css', dest: 'plugins/line-numbers/prism-line-numbers.min.css' },
      { kind: 'file', src: 'themes/prism-tomorrow.min.css', dest: 'themes/prism-tomorrow.min.css' },
    ],
  },
]

function fail(message) {
  console.error(`[vendor] エラー: ${message}`)
  console.error('[vendor] node_modules が揃っていることを確認してください（npm ci / npm install）。')
  process.exit(1)
}

function readPackageVersion(name) {
  const pkgJsonPath = join(NODE_MODULES, name, 'package.json')
  if (!existsSync(pkgJsonPath)) fail(`${name} がインストールされていません（${pkgJsonPath} が見つかりません）`)
  const version = JSON.parse(readFileSync(pkgJsonPath, 'utf8')).version
  if (typeof version !== 'string' || version === '') fail(`${name} のバージョンを package.json から読めません`)
  return version
}

function copyFile(src, dest) {
  if (!existsSync(src)) fail(`コピー元が見つかりません: ${src}`)
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(src, dest)
  return 1
}

function copyDirByExt(srcDir, destDir, ext) {
  if (!existsSync(srcDir)) fail(`コピー元ディレクトリが見つかりません: ${srcDir}`)
  const files = readdirSync(srcDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(ext))
    .map((entry) => entry.name)
  if (files.length === 0) fail(`${srcDir} に ${ext} ファイルがありません`)
  mkdirSync(destDir, { recursive: true })
  for (const file of files) cpSync(join(srcDir, file), join(destDir, file))
  return files.length
}

function writeManifest(versions) {
  const lines = [
    '// このファイルは scripts/copy-vendor-assets.mjs が生成する。手で編集しないこと。',
    '// public/vendor/<パッケージ名>@<バージョン>/ の配置と一致させるため、インストール済みの実バージョンを書き出している。',
    'export const VENDOR_VERSIONS = {',
    ...Object.entries(versions).map(([key, version]) => `  ${key}: '${version}',`),
    '} as const',
    '',
  ]
  const next = lines.join('\n')
  const current = existsSync(MANIFEST_PATH) ? readFileSync(MANIFEST_PATH, 'utf8') : null
  if (current === next) return false
  writeFileSync(MANIFEST_PATH, next)
  return true
}

function main() {
  // 古いバージョンのディレクトリを残さないよう作り直す
  rmSync(VENDOR_DIR, { recursive: true, force: true })
  mkdirSync(VENDOR_DIR, { recursive: true })

  const versions = {}
  for (const target of TARGETS) {
    const version = readPackageVersion(target.name)
    versions[target.manifestKey] = version
    const pkgDir = join(NODE_MODULES, target.name)
    const outDir = join(VENDOR_DIR, `${target.name}@${version}`)
    let count = 0
    for (const entry of target.entries) {
      if (entry.kind === 'file') {
        count += copyFile(join(pkgDir, entry.src), join(outDir, entry.dest))
      } else {
        count += copyDirByExt(join(pkgDir, entry.src), join(outDir, entry.dest), entry.ext)
      }
    }
    console.log(`[vendor] ${target.name}@${version}: ${count} files -> public/vendor/${target.name}@${version}/`)
  }

  const updated = writeManifest(versions)
  console.log(`[vendor] lib/vendorManifest.generated.ts ${updated ? 'を更新しました' : 'は変更なし'}`)
}

main()
