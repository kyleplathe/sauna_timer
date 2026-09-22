const SW_URL = `${import.meta.env.BASE_URL}sw.js`

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register(SW_URL, {
      scope: import.meta.env.BASE_URL,
    })
  } catch {
    return null
  }
}

export async function requestLockScreenPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export async function postLiveTimerNotification(payload: {
  title: string
  body: string
}): Promise<void> {
  if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') {
    return
  }
  const registration = await navigator.serviceWorker.ready
  const worker = registration.active ?? navigator.serviceWorker.controller
  if (worker) {
    worker.postMessage({ type: 'live-timer-update', ...payload })
    return
  }
  await registration.showNotification(payload.title, {
    body: payload.body,
    tag: 'ember-ice-live-timer',
    silent: true,
    requireInteraction: true,
  } as NotificationOptions)
}

export async function clearLiveTimerNotification(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const registration = await navigator.serviceWorker.ready
    const worker = registration.active ?? navigator.serviceWorker.controller
    worker?.postMessage({ type: 'live-timer-clear' })
    const notes = await registration.getNotifications({
      tag: 'ember-ice-live-timer',
    })
    notes.forEach((note) => note.close())
  } catch {
    // ignore
  }
}
