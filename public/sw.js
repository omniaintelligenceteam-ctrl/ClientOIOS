// Service Worker — push notifications only (no offline caching)

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', () => {
  self.clients.claim()
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'OIOS', body: event.data.text() }
  }

  const { title = 'OIOS', body = '', icon = '/icon-192.png', href = '/dashboard' } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      data: { href },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const href = event.notification.data?.href || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === href && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(href)
    })
  )
})
