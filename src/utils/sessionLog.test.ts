import { describe, expect, it } from 'vitest'
import type { Session } from '../types/timer'
import {
  mergeSessionLogs,
  normalizeSessionLog,
  removeSession,
  upsertSession,
} from './sessionLog'

function session(id: string, patch: Partial<Session> = {}): Session {
  return {
    id,
    programId: 'advanced-shower',
    programName: 'Advanced',
    startTime: 1_000 + id.length,
    completedPhases: 1,
    totalPhases: 11,
    duration: 60,
    completed: false,
    ...patch,
  }
}

describe('session log', () => {
  it('reads a legacy bare array', () => {
    const log = normalizeSessionLog([session('a')])
    expect(log.sessions).toHaveLength(1)
    expect(log.deletedIds).toEqual([])
  })

  it('keeps older sessions when a newer replica only has the in-progress one', () => {
    const merged = mergeSessionLogs([
      { sessions: [session('old', { startTime: 1 }), session('older', { startTime: 2 })], deletedIds: [] },
      { sessions: [session('live', { startTime: 3, completedPhases: 4 })], deletedIds: [] },
    ])
    expect(merged.sessions.map((item) => item.id)).toEqual(['old', 'older', 'live'])
  })

  it('prefers the completed copy of the same session', () => {
    const merged = mergeSessionLogs([
      { sessions: [session('s', { completedPhases: 2 })], deletedIds: [] },
      { sessions: [session('s', { completed: true, completedPhases: 11 })], deletedIds: [] },
    ])
    expect(merged.sessions[0]?.completed).toBe(true)
    expect(merged.sessions[0]?.completedPhases).toBe(11)
  })

  it('honors a delete tombstone from either copy', () => {
    const merged = mergeSessionLogs([
      { sessions: [session('gone'), session('keep')], deletedIds: [] },
      removeSession({ sessions: [], deletedIds: [] }, 'gone'),
    ])
    expect(merged.sessions.map((item) => item.id)).toEqual(['keep'])
    expect(merged.deletedIds).toContain('gone')
  })

  it('updates an in-progress session in place', () => {
    const log = upsertSession(
      { sessions: [session('s', { completedPhases: 1 })], deletedIds: [] },
      session('s', { completedPhases: 3, completed: true }),
    )
    expect(log.sessions).toHaveLength(1)
    expect(log.sessions[0]?.completedPhases).toBe(3)
  })
})
