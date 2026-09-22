import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('scheduledAlarm', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('fires the phase-end alarm after the scheduled delay', async () => {
    vi.useFakeTimers()
    const play = vi.fn(async () => undefined)
    vi.stubGlobal(
      'Audio',
      class {
        volume = 1
        currentTime = 0
        loop = false
        preload = ''
        addEventListener() {}
        removeEventListener() {}
        load() {}
        pause() {}
        removeAttribute() {}
        setAttribute() {}
        play = play
      },
    )

    const { schedulePhaseEndAlarm, cancelScheduledPhaseEndAlarm } = await import(
      './scheduledAlarm'
    )
    schedulePhaseEndAlarm(5_000, 0.8)
    expect(play).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(play).toHaveBeenCalled()
    cancelScheduledPhaseEndAlarm()
  })

  it('cancels a pending alarm so it does not fire', async () => {
    vi.useFakeTimers()
    const play = vi.fn(async () => undefined)
    vi.stubGlobal(
      'Audio',
      class {
        volume = 1
        currentTime = 0
        loop = false
        preload = ''
        addEventListener() {}
        removeEventListener() {}
        load() {}
        pause() {}
        removeAttribute() {}
        setAttribute() {}
        play = play
      },
    )

    const { schedulePhaseEndAlarm, cancelScheduledPhaseEndAlarm } = await import(
      './scheduledAlarm'
    )
    schedulePhaseEndAlarm(3_000, 0.5)
    cancelScheduledPhaseEndAlarm()
    await vi.advanceTimersByTimeAsync(4_000)
    expect(play).not.toHaveBeenCalled()
  })
})
