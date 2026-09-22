import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getIdleAudioMode,
  prepareCueAudio,
  releaseCueAudio,
  setIdleAudioMode,
} from './audioSession'

describe('audioSession', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'audioSession')
    setIdleAudioMode('auto')
  })

  it('sets transient type for ducking when supported', () => {
    const session = { type: 'auto' }
    Object.defineProperty(navigator, 'audioSession', {
      configurable: true,
      value: session,
    })

    prepareCueAudio('transient')
    expect(session.type).toBe('transient')

    releaseCueAudio()
    expect(session.type).toBe('auto')
  })

  it('restores ambient idle mode after a ducked cue', () => {
    const session = { type: 'auto' }
    Object.defineProperty(navigator, 'audioSession', {
      configurable: true,
      value: session,
    })

    setIdleAudioMode('ambient')
    expect(getIdleAudioMode()).toBe('ambient')
    expect(session.type).toBe('ambient')

    prepareCueAudio('transient')
    expect(session.type).toBe('transient')

    releaseCueAudio()
    expect(session.type).toBe('ambient')
  })

  it('swallows unsupported type assignment', () => {
    const session = {
      set type(_value: string) {
        throw new Error('unsupported')
      },
      get type() {
        return 'auto'
      },
    }
    Object.defineProperty(navigator, 'audioSession', {
      configurable: true,
      value: session,
    })

    expect(() => prepareCueAudio('transient')).not.toThrow()
  })

  it('no-ops when Audio Session API is missing', () => {
    expect(() => prepareCueAudio('transient')).not.toThrow()
    expect(() => releaseCueAudio()).not.toThrow()
  })
})

describe('duck preference', () => {
  it('exports setDuckMusicEnabled without throwing', async () => {
    const { setDuckMusicEnabled, playBeep } = await import('./audio')
    const session = { type: 'auto' }
    Object.defineProperty(navigator, 'audioSession', {
      configurable: true,
      value: session,
    })

    // jsdom / vitest may lack AudioContext — stub a minimal one.
    class FakeOscillator {
      frequency = { value: 0 }
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

    setDuckMusicEnabled(true)
    playBeep(440, 0.05, 0.1)
    expect(session.type).toBe('transient')

    setDuckMusicEnabled(false)
    playBeep(440, 0.05, 0.1)
    expect(session.type).toBe('ambient')

    vi.unstubAllGlobals()
  })
})
