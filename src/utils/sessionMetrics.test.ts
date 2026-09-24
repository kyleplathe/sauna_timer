import { describe, expect, it } from 'vitest'
import type { Session } from '../types/timer'
import { PRESET_PROGRAMS } from './protocols'
import {
  computeSessionStats,
  exposureForProgram,
  exposureFromProgramProgress,
  formatAvgTempC,
  resolveSessionExposure,
} from './sessionMetrics'

const day = (offset: number) => {
  const date = new Date('2026-09-24T12:00:00.000Z')
  date.setUTCDate(date.getUTCDate() + offset)
  return date.getTime()
}

function session(
  overrides: Partial<Session> & Pick<Session, 'id' | 'startTime'>,
): Session {
  return {
    programId: 'intermediate',
    programName: 'Intermediate',
    completedPhases: 9,
    totalPhases: 9,
    duration: 45 * 60,
    completed: true,
    ...overrides,
  }
}

describe('exposureForProgram', () => {
  it('averages sauna and cold setpoints for intermediate', () => {
    const program = PRESET_PROGRAMS.find((item) => item.id === 'intermediate')!
    const exposure = exposureForProgram(program)
    expect(exposure.avgHeatC).toBe(80)
    expect(exposure.avgColdC).toBe(12)
    expect(exposure.heatSeconds).toBe(15 * 60 * 3)
    expect(exposure.coldSeconds).toBe(2 * 60 * 3)
    expect(exposure.roundsCompleted).toBe(3)
  })
})

describe('exposureFromProgramProgress', () => {
  it('scales heat and cold by completion ratio', () => {
    const program = PRESET_PROGRAMS.find((item) => item.id === 'beginner')!
    const half = exposureFromProgramProgress(program, 3, 6)
    expect(half.heatSeconds).toBe(Math.round(10 * 60 * 2 * 0.5))
    expect(half.coldSeconds).toBe(Math.round(60 * 2 * 0.5))
    expect(half.avgHeatC).toBe(70)
  })
})

describe('resolveSessionExposure', () => {
  it('prefers stored snapshots over protocol lookup', () => {
    const result = resolveSessionExposure(
      session({
        id: 'a',
        startTime: day(0),
        avgHeatC: 88,
        avgColdC: 8,
        heatSeconds: 1000,
        coldSeconds: 200,
        roundsCompleted: 2,
      }),
    )
    expect(result).toEqual({
      avgHeatC: 88,
      avgColdC: 8,
      heatSeconds: 1000,
      coldSeconds: 200,
      roundsCompleted: 2,
    })
  })

  it('falls back to presets for older sessions without snapshots', () => {
    const result = resolveSessionExposure(
      session({
        id: 'b',
        startTime: day(0),
        programId: 'advanced',
        programName: 'Advanced',
        completedPhases: 12,
        totalPhases: 12,
      }),
    )
    expect(result?.avgHeatC).toBe(90)
    expect(result?.avgColdC).toBe(10)
  })
})

describe('computeSessionStats', () => {
  it('accumulates time, streak, averages, and favorite protocol', () => {
    const sessions: Session[] = [
      session({
        id: '1',
        startTime: day(-2),
        duration: 40 * 60,
        avgHeatC: 80,
        avgColdC: 12,
        heatSeconds: 40 * 60,
        coldSeconds: 6 * 60,
        programName: 'Intermediate',
      }),
      session({
        id: '2',
        startTime: day(-1),
        duration: 50 * 60,
        avgHeatC: 90,
        avgColdC: 10,
        heatSeconds: 50 * 60,
        coldSeconds: 8 * 60,
        programName: 'Advanced',
      }),
      session({
        id: '3',
        startTime: day(0),
        duration: 30 * 60,
        avgHeatC: 70,
        avgColdC: 15,
        heatSeconds: 20 * 60,
        coldSeconds: 3 * 60,
        programName: 'Intermediate',
      }),
      session({
        id: 'partial',
        startTime: day(0),
        completed: false,
        duration: 5 * 60,
      }),
    ]

    const stats = computeSessionStats(sessions, { now: day(0) })

    expect(stats.totalSessions).toBe(3)
    expect(stats.totalDuration).toBe(120 * 60)
    expect(stats.averageDuration).toBe(40 * 60)
    expect(stats.currentStreak).toBe(3)
    expect(stats.longestStreak).toBe(3)
    expect(stats.averageHeatC).toBe(80)
    expect(stats.averageColdC).toBeCloseTo(12.33, 1)
    expect(stats.totalHeatSeconds).toBe(110 * 60)
    expect(stats.totalColdSeconds).toBe(17 * 60)
    expect(stats.favoriteProtocol).toBe('Intermediate')
    expect(stats.sessionsThisWeek).toBe(3)
  })

  it('zeros out when there are no completed sessions', () => {
    const stats = computeSessionStats([])
    expect(stats.totalSessions).toBe(0)
    expect(stats.averageDuration).toBe(0)
    expect(stats.averageHeatC).toBeUndefined()
    expect(stats.totalHeatSeconds).toBe(0)
    expect(stats.favoriteProtocol).toBeUndefined()
  })
})

describe('formatAvgTempC', () => {
  it('formats celsius and fahrenheit', () => {
    expect(formatAvgTempC(80, 'C')).toBe('80°C')
    expect(formatAvgTempC(80, 'F')).toBe('176°F')
    expect(formatAvgTempC(undefined)).toBe('—')
  })
})
