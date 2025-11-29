/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静的エクスポートを有効にする場合（現在のNginx環境で使用する場合）
  // Next.js 15では output: 'export' の代わりに generateStaticParams を使用
  // output: 'export',
  
  // 画像最適化設定
  images: {
    unoptimized: true, // 静的エクスポート時は必要
  },
  
  // React 19のStrict Modeはデフォルトで有効
  reactStrictMode: true,
}

module.exports = nextConfig

