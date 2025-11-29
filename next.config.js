/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静的エクスポートを有効化（Nginx環境で使用する場合）
  output: 'export',
  
  // 画像最適化設定
  images: {
    unoptimized: true, // 静的エクスポート時は必要
  },
  
  // React 19のStrict Modeはデフォルトで有効
  reactStrictMode: true,
}

module.exports = nextConfig

