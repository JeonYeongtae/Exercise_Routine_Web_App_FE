/* 운동 루틴 PWA — 푸시 알림 서비스워커 핸들러
 * workbox가 생성한 sw.js가 importScripts('/push-sw.js')로 이 파일을 불러온다.
 * (vite.config.ts의 workbox.importScripts 설정 참고) */

self.addEventListener('push', (event) => {
  let data = { title: '운동할 시간이에요 💪', body: '오늘의 루틴을 시작해볼까요?', url: '/' }
  try {
    if (event.data) data = Object.assign(data, event.data.json())
  } catch (_e) {
    if (event.data) data.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      vibrate: [120, 60, 120],
      tag: 'workout-reminder',
      renotify: true,
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    }),
  )
})
