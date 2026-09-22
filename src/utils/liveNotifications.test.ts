import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('liveNotifications', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('requests notification permission when default', async () => {
    const requestPermission = vi.fn(async () => 'granted' as NotificationPermission)
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission,
    })

    const { requestLockScreenPermission } = await import('./liveNotifications')
    await expect(requestLockScreenPermission()).resolves.toBe('granted')
    expect(requestPermission).toHaveBeenCalledOnce()
  })

  it('shows a quiet tagged notification via the service worker registration', async () => {
    const showNotification = vi.fn(async () => undefined)
    vi.stubGlobal('Notification', { permission: 'granted' })
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({
          active: { postMessage: vi.fn() },
          showNotification,
          getNotifications: async () => [],
          update: async () => undefined,
        }),
        controller: null,
        register: async () => ({ update: async () => undefined }),
      },
    })

    const { postLiveTimerNotification } = await import('./liveNotifications')
    await postLiveTimerNotification({
      title: 'Sauna · Beginner',
      body: '04:20 left · live countdown is in Now Playing',
    })

    expect(showNotification).toHaveBeenCalledWith('Sauna · Beginner', {
      body: '04:20 left · live countdown is in Now Playing',
      tag: 'ember-ice-live-timer',
      renotify: false,
      silent: true,
      requireInteraction: true,
    })
  })

  it('registers the service worker with updateViaCache none', async () => {
    const register = vi.fn(async () => ({
      update: vi.fn(async () => undefined),
    }))
    vi.stubGlobal('navigator', {
      serviceWorker: { register },
    })

    const { ensureServiceWorker } = await import('./liveNotifications')
    await ensureServiceWorker()

    expect(register).toHaveBeenCalledWith(
      expect.stringContaining('sw.js'),
      expect.objectContaining({ updateViaCache: 'none' }),
    )
  })

  it('skips notifications when permission is missing', async () => {
    const showNotification = vi.fn()
    vi.stubGlobal('Notification', { permission: 'denied' })
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({
          showNotification,
        }),
      },
    })

    const { postLiveTimerNotification } = await import('./liveNotifications')
    await postLiveTimerNotification({ title: 'x', body: 'y' })
    expect(showNotification).not.toHaveBeenCalled()
  })
})
