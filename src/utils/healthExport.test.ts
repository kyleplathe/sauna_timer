import { describe, expect, it } from 'vitest'
import type { Session } from '../types/timer'
import { generateHealthDataCSV, sessionToHealthData } from './healthExport'
import { formatClock, formatDuration } from './protocols'

describe('format helpers', () => {
  it('formats clocks and durations', () => {
    expect(formatClock(65)).toBe('01:05')
    expect(formatDuration(90)).toBe('1m 30s')
    expect(formatDuration(120)).toBe('2m')
  })
})

describe('health export', () => {
  const session: Session = {
    id: 's1',
    programId: 'beginner-shower',
    programName: 'Beginner',
    startTime: Date.UTC(2026, 0, 1, 12, 0, 0),
    endTime: Date.UTC(2026, 0, 1, 12, 12, 0),
    completedPhases: 5,
    totalPhases: 5,
    duration: 720,
    completed: true,
  }

  it('maps a session to a mindful-session record', () => {
    const data = sessionToHealthData(session)
    expect(data.type).toBe('MindfulSession')
    expect(data.value).toBe(12)
    expect(data.metadata.activity).toContain('Contrast Therapy')
  })

  it('builds a CSV with a header and quoted values', () => {
    const csv = generateHealthDataCSV([session])
    expect(csv.startsWith('Type,Start Date,End Date')).toBe(true)
    expect(csv).toContain('MindfulSession')
    expect(csv).toContain('Beginner')
  })
})
