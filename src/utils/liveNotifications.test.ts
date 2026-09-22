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

  it('posts live timer updates through the service worker', async () => {
    const postMessage = vi.fn()
    const showNotification = vi.fn()
    vi.stubGlobal('Notification', { permission: 'granted' })
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({
          active: { postMessage },
          showNotification,
          getNotifications: async () => [],
        }),
        controller: null,
      },
    })

    const { postLiveTimerNotification } = await import('./liveNotifications')
    await postLiveTimerNotification({
      title: '04:20 · Sauna',
      body: 'Beginner · Ember & Ice',
    })

    expect(postMessage).toHaveBeenCalledWith({
      type: 'live-timer-update',
      title: '04:20 · Sauna',
      body: 'Beginner · Ember & Ice',
    })
    expect(showNotification).not.toHaveBeenCalled()
  })

  it('skips notifications when permission is missing', async () => {
    vi.stubGlobal('Notification', { permission: 'denied' })
    const postMessage = vi.fn()
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({
          active: { postMessage },
        }),
      },
    })

    const { postLiveTimerNotification } = await import('./liveNotifications')
    await postLiveTimerNotification({ title: 'x', body: 'y' })
    expect(postMessage).not.toHaveBeenCalled()
  })
})
