import type { Program, Session } from '../types/timer'
import { totalPhases, tick, type EngineState, type EngineStatus } from './timerEngine'

export const ACTIVE_SESSION_KEY = 'sauna_active_session'
export const ACTIVE_SESSION_VERSION = 1

/** Ignore a leftover timer from a previous day. */
export const RESUME_MAX_AGE_MS = 12 * 60 * 60 * 1000

/**
 * If the current phase ended while the app was dead, step forward once only
 * inside this window. Longer than that, the person was not following the clock,
 * so keep the partial history row and do not fast-forward the protocol.
 */
export const PHASE_OVERTIME_GRACE_MS = 15 * 60 * 1000

export interface ActiveSessionCheckpoint {
  version: typeof ACTIVE_SESSION_VERSION
  sessionId: string
  startedAt: number
  updatedAt: number
  program: Program
  state: EngineState
  /** Wall-clock instant when the running phase or walk timer hits zero. */
  phaseEndsAt: number | null
  handsFree: boolean
  transitionSeconds: number
}

export type ResumeDecision =
  | { kind: 'resume'; checkpoint: ActiveSessionCheckpoint; advancedPhase: boolean }
  | { kind: 'finished'; checkpoint: ActiveSessionCheckpoint; state: EngineState }
  | { kind: 'stale' }

const STATUSES: EngineStatus[] = [
  'idle',
  'running',
  'paused',
  'awaitingNext',
  'transition',
  'complete',
]

export function isLiveStatus(status: EngineStatus): boolean {
  return (
    status === 'running' ||
    status === 'paused' ||
    status === 'transition' ||
    status === 'awaitingNext'
  )
}

function isProgram(value: unknown): value is Program {
  if (!value || typeof value !== 'object') return false
  const program = value as Partial<Program>
  return (
    typeof program.id === 'string' &&
    typeof program.name === 'string' &&
    typeof program.rounds === 'number' &&
    (program.coldType === 'plunge' || program.coldType === 'shower') &&
    Array.isArray(program.phases) &&
    program.phases.length > 0
  )
}

function isState(value: unknown): value is EngineState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<EngineState>
  return (
    typeof state.status === 'string' &&
    STATUSES.includes(state.status) &&
    typeof state.round === 'number' &&
    typeof state.phaseIndex === 'number' &&
    typeof state.remainingMs === 'number' &&
    typeof state.phaseDurationMs === 'number' &&
    typeof state.completedPhases === 'number'
  )
}

export function parseCheckpoint(value: unknown): ActiveSessionCheckpoint | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<ActiveSessionCheckpoint>
  if (record.version !== ACTIVE_SESSION_VERSION) return null
  if (typeof record.sessionId !== 'string' || typeof record.startedAt !== 'number') {
    return null
  }
  if (typeof record.updatedAt !== 'number') return null
  if (typeof record.handsFree !== 'boolean') return null
  if (typeof record.transitionSeconds !== 'number') return null
  if (!isProgram(record.program) || !isState(record.state)) return null
  if (record.phaseEndsAt != null && typeof record.phaseEndsAt !== 'number') return null
  return {
    version: ACTIVE_SESSION_VERSION,
    sessionId: record.sessionId,
    startedAt: record.startedAt,
    updatedAt: record.updatedAt,
    program: record.program,
    state: {
      ...record.state,
      pausedFrom:
        record.state.pausedFrom === 'running' || record.state.pausedFrom === 'transition'
          ? record.state.pausedFrom
          : null,
    },
    phaseEndsAt: record.phaseEndsAt ?? null,
    handsFree: record.handsFree,
    transitionSeconds: record.transitionSeconds,
  }
}

export function restoreActiveSession(
  checkpoint: ActiveSessionCheckpoint,
  now: number,
): ResumeDecision {
  if (!isLiveStatus(checkpoint.state.status)) return { kind: 'stale' }
  if (now - checkpoint.updatedAt > RESUME_MAX_AGE_MS) return { kind: 'stale' }
  if (checkpoint.state.status === 'paused' || checkpoint.state.status === 'awaitingNext') {
    return { kind: 'resume', checkpoint, advancedPhase: false }
  }

  if (checkpoint.phaseEndsAt == null) {
    return { kind: 'resume', checkpoint, advancedPhase: false }
  }

  const remaining = checkpoint.phaseEndsAt - now
  if (remaining > 0) {
    const capped = Math.min(checkpoint.state.phaseDurationMs, remaining)
    return {
      kind: 'resume',
      advancedPhase: false,
      checkpoint: {
        ...checkpoint,
        updatedAt: now,
        state: { ...checkpoint.state, remainingMs: capped },
      },
    }
  }

  if (now - checkpoint.phaseEndsAt > PHASE_OVERTIME_GRACE_MS) return { kind: 'stale' }

  const stepped = tick(
    checkpoint.state,
    checkpoint.program,
    Math.max(checkpoint.state.remainingMs, 1),
    {
      handsFree: checkpoint.handsFree,
      transitionSeconds: checkpoint.transitionSeconds,
    },
  )

  if (stepped.state.status === 'complete') {
    return { kind: 'finished', checkpoint, state: stepped.state }
  }

  const phaseEndsAt =
    stepped.state.status === 'running' || stepped.state.status === 'transition'
      ? now + stepped.state.remainingMs
      : null

  return {
    kind: 'resume',
    advancedPhase: true,
    checkpoint: {
      ...checkpoint,
      updatedAt: now,
      state: stepped.state,
      phaseEndsAt,
    },
  }
}

export function sessionFromProgress(
  checkpoint: Pick<ActiveSessionCheckpoint, 'sessionId' | 'startedAt' | 'program'>,
  state: EngineState,
  now: number,
  completed: boolean,
): Session {
  return {
    id: checkpoint.sessionId,
    programId: checkpoint.program.id,
    programName: checkpoint.program.name,
    startTime: checkpoint.startedAt,
    endTime: now,
    completedPhases: state.completedPhases,
    totalPhases: totalPhases(checkpoint.program),
    duration: Math.max(1, Math.floor((now - checkpoint.startedAt) / 1000)),
    completed,
  }
}
