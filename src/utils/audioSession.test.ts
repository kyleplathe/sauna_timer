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

  it('defaults cues to ambient so music can keep playing', () => {
    const session = { type: 'auto' }
    Object.defineProperty(navigator, 'audioSession', {
      configurable: true,
      value: session,
    })

    prepareCueAudio()
    expect(session.type).toBe('ambient')

    releaseCueAudio()
    expect(session.type).toBe('ambient')
  })

  it('restores ambient idle mode after an optional transient cue', () => {
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

    expect(() => prepareCueAudio('ambient')).not.toThrow()
  })

  it('no-ops when Audio Session API is missing', () => {
    expect(() => prepareCueAudio('ambient')).not.toThrow()
    expect(() => releaseCueAudio()).not.toThrow()
  })
})

describe('music mix preference', () => {
  it('keeps ambient unless interrupt-music is explicitly enabled', async () => {
    vi.resetModules()
    const session = { type: 'auto' }
    Object.defineProperty(navigator, 'audioSession', {
      configurable: true,
      value: session,
    })

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

    const { setDuckMusicEnabled, playBeep } = await import('./audio')

    setDuckMusicEnabled(false)
    playBeep(440, 0.05, 0.1)
    expect(session.type).toBe('ambient')

    setDuckMusicEnabled(true)
    playBeep(440, 0.05, 0.1)
    expect(session.type).toBe('transient')

    vi.unstubAllGlobals()
  })
})
