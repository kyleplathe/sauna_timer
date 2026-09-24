import { describe, expect, it } from 'vitest'
import type { Program } from '../types/timer'
import {
  PHASE_OVERTIME_GRACE_MS,
  parseCheckpoint,
  restoreActiveSession,
  sessionFromProgress,
  type ActiveSessionCheckpoint,
} from './activeSession'
import { startSession } from './timerEngine'

const program: Program = {
  id: 'advanced-shower',
  name: 'Advanced',
  description: '',
  rounds: 2,
  coldType: 'shower',
  isPreset: true,
  phases: [
    { type: 'sauna', duration: 20 * 60 },
    { type: 'cold', duration: 4 * 60 },
    { type: 'rest', duration: 3 * 60 },
  ],
}

function checkpoint(patch: Partial<ActiveSessionCheckpoint> = {}): ActiveSessionCheckpoint {
  const started = startSession(program)
  return {
    version: 1,
    sessionId: 'session-1',
    startedAt: 1_000_000,
    updatedAt: 1_000_000,
    program,
    state: started.state,
    phaseEndsAt: 1_000_000 + started.state.remainingMs,
    handsFree: true,
    transitionSeconds: 10,
    ...patch,
  }
}

describe('restoreActiveSession', () => {
  it('subtracts time spent closed from the current phase', () => {
    const saved = checkpoint()
    const decision = restoreActiveSession(saved, saved.phaseEndsAt! - 5 * 60 * 1000)
    expect(decision.kind).toBe('resume')
    if (decision.kind !== 'resume') return
    expect(decision.advancedPhase).toBe(false)
    expect(decision.checkpoint.state.phaseIndex).toBe(0)
    expect(decision.checkpoint.state.remainingMs).toBe(5 * 60 * 1000)
  })

  it('steps to the walk timer when the phase ended a moment ago', () => {
    const saved = checkpoint()
    const decision = restoreActiveSession(saved, saved.phaseEndsAt! + 30_000)
    expect(decision.kind).toBe('resume')
    if (decision.kind !== 'resume') return
    expect(decision.advancedPhase).toBe(true)
    expect(decision.checkpoint.state.status).toBe('transition')
    expect(decision.checkpoint.state.remainingMs).toBe(10_000)
  })

  it('does not fast-forward a protocol that ended long ago', () => {
    const saved = checkpoint()
    const decision = restoreActiveSession(
      saved,
      saved.phaseEndsAt! + PHASE_OVERTIME_GRACE_MS + 1,
    )
    expect(decision.kind).toBe('stale')
  })

  it('keeps a paused phase frozen', () => {
    const saved = checkpoint()
    saved.state = {
      ...saved.state,
      status: 'paused',
      remainingMs: 90_000,
      pausedFrom: 'running',
    }
    saved.phaseEndsAt = null
    const decision = restoreActiveSession(saved, saved.updatedAt + 60 * 60 * 1000)
    expect(decision.kind).toBe('resume')
    if (decision.kind !== 'resume') return
    expect(decision.checkpoint.state.remainingMs).toBe(90_000)
    expect(decision.checkpoint.state.status).toBe('paused')
  })

  it('records a finish when the last phase ended while closed', () => {
    const saved = checkpoint()
    const last = {
      ...saved.state,
      round: 2,
      phaseIndex: 1,
      remainingMs: 4 * 60 * 1000,
      phaseDurationMs: 4 * 60 * 1000,
      completedPhases: 4,
    }
    const decision = restoreActiveSession(
      {
        ...saved,
        state: last,
        phaseEndsAt: saved.updatedAt + last.remainingMs,
      },
      saved.updatedAt + last.remainingMs + 5_000,
    )
    expect(decision.kind).toBe('finished')
    if (decision.kind !== 'finished') return
    const row = sessionFromProgress(decision.checkpoint, decision.state, saved.updatedAt, true)
    expect(row.completed).toBe(true)
    expect(row.id).toBe('session-1')
  })

  it('rejects a checkpoint that is not a live session', () => {
    expect(parseCheckpoint({ version: 1 })).toBeNull()
    const saved = checkpoint()
    expect(
      restoreActiveSession(
        { ...saved, state: { ...saved.state, status: 'complete', remainingMs: 0 } },
        saved.updatedAt + 1000,
      ).kind,
    ).toBe('stale')
  })
})
