// Service Workerは使用しません
// このファイルは404エラーを防ぐために存在します
// 最小限の実装で、すぐに登録を解除します

self.addEventListener('install', (event) => {
  // インストールを即座に完了させる
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // アクティベート時に登録を解除
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      self.registration.unregister()
    ])
  )
})

