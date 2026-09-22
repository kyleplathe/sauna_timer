const SW_URL = `${import.meta.env.BASE_URL}sw.js`

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const registration = await navigator.serviceWorker.register(SW_URL, {
      scope: import.meta.env.BASE_URL,
      // Always revalidate sw.js so phones do not keep a stale lock-screen worker.
      updateViaCache: 'none',
    })
    void registration.update().catch(() => undefined)
    return registration
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
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return
  }

  const options = {
    body: payload.body,
    tag: 'ember-ice-live-timer',
    renotify: false,
    silent: true,
    requireInteraction: true,
  } as NotificationOptions

  // Prefer ServiceWorkerRegistration.showNotification (works from the page).
  // Fall back to postMessage only if registration is unavailable.
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(payload.title, options)
      return
    } catch {
      // Fall through to constructor / worker message paths.
    }
  }

  try {
    new Notification(payload.title, options)
  } catch {
    // ignore
  }
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
