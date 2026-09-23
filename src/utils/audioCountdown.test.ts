import { afterEach, describe, expect, it, vi } from 'vitest'

describe('countdown tones', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('plays a rising tick for each of the last 5 seconds', async () => {
    vi.useFakeTimers()
    const frequencies: number[] = []
    class FakeOscillator {
      frequency = {
        stored: 0,
        set value(next: number) {
          frequencies.push(next)
          this.stored = next
        },
        get value() {
          return this.stored
        },
      }
      type = 'sine'
      connect() {}
      start() {}
      stop() {}
    }
    class FakeGain {
      gain = {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      }
      connect() {}
    }
    class FakeAudioContext {
      currentTime = 0
      destination = {}
      createOscillator() {
        return new FakeOscillator()
      }
      createGain() {
        return new FakeGain()
      }
      resume() {
        return Promise.resolve()
      }
    }
    vi.stubGlobal('AudioContext', FakeAudioContext)

    const { announceWarning, setDuckMusicEnabled } = await import('./audio')
    setDuckMusicEnabled(false)

    for (const seconds of [5, 4, 3, 2, 1]) {
      announceWarning(seconds, false, 0.8)
    }

    expect(frequencies).toEqual([480, 570, 660, 750, 840])
  })
})
