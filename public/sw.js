/* Ember & Ice — lock-screen live timer notifications */
const LIVE_TAG = 'ember-ice-live-timer'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of all) {
        if ('focus' in client) {
          await client.focus()
          return
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(self.registration.scope)
      }
    })(),
  )
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data !== 'object') return

  if (data.type === 'live-timer-update') {
    event.waitUntil(
      // Same tag + renotify:false replaces quietly — never spam a new alert per tick.
      self.registration.showNotification(data.title || 'Ember & Ice', {
        body: data.body || '',
        tag: LIVE_TAG,
        renotify: false,
        silent: true,
        requireInteraction: true,
        badge: './favicon.svg',
        icon: './favicon.svg',
        data: { url: self.registration.scope },
      }),
    )
    return
  }

  if (data.type === 'live-timer-clear') {
    event.waitUntil(
      self.registration.getNotifications({ tag: LIVE_TAG }).then((notes) => {
        notes.forEach((note) => note.close())
      }),
    )
  }
})
