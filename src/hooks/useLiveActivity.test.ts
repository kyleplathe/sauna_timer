import { describe, expect, it } from 'vitest'
import { liveNotificationKey } from '../hooks/useLiveActivity'

describe('liveNotificationKey', () => {
  it('stays stable across countdown ticks so notifications are not re-posted every second', () => {
    const a = liveNotificationKey('sauna', 'running', 'Beginner')
    const b = liveNotificationKey('sauna', 'running', 'Beginner')
    expect(a).toBe(b)
  })

  it('changes when the phase or pause state changes', () => {
    const running = liveNotificationKey('sauna', 'running', 'Beginner')
    const paused = liveNotificationKey('sauna', 'paused', 'Beginner')
    const cold = liveNotificationKey('cold', 'running', 'Beginner')
    const walk = liveNotificationKey('sauna', 'transition', 'Beginner')
    expect(running).not.toBe(paused)
    expect(running).not.toBe(cold)
    expect(running).not.toBe(walk)
  })
})
