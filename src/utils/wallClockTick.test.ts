import { describe, expect, it } from 'vitest'
import { wallClockTickDelta } from './wallClockTick'

describe('wallClockTickDelta', () => {
  it('finishes the phase when wall clock is past endsAt even if remaining is under 80ms', () => {
    // Previously delta < 80 caused an infinite stuck-at-00:01 loop.
    expect(wallClockTickDelta(50, 1_000, 1_050)).toBe(50)
    expect(wallClockTickDelta(79, 1_000, 1_000)).toBe(79)
    expect(wallClockTickDelta(1, 1_000, 2_000)).toBe(1)
  })

  it('ignores tiny jitter mid-phase', () => {
    expect(wallClockTickDelta(5_000, 10_000, 5_005)).toBeNull()
  })

  it('returns a normal delta when the clock has moved enough', () => {
    expect(wallClockTickDelta(5_000, 10_000, 5_200)).toBe(200)
  })
})
