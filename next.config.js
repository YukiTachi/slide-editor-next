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

  webpack: (config, { isServer, webpack }) => {
    // pptxgenjsのESビルドが node:fs / node:https を参照しており、webpackが
    // node: スキームを解決できずビルドが落ちる。プレフィックスを剥がして
    // package.jsonのbrowserフィールド（fs/https → false）に解決を委ねる
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:(fs|https)$/, (resource) => {
        resource.request = resource.request.replace(/^node:/, '')
      })
    )
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
      }
    }
    return config
  },
}

module.exports = nextConfig

