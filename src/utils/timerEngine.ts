import type { Phase, Program } from '../types/timer'

export type EngineStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'awaitingNext'
  | 'transition'
  | 'complete'

export interface EngineState {
  status: EngineStatus
  round: number
  phaseIndex: number
  remainingMs: number
  phaseDurationMs: number
  completedPhases: number
  pausedFrom: 'running' | 'transition' | null
}

export interface EngineOptions {
  handsFree: boolean
  transitionSeconds: number
}

export type EngineEvent =
  | { type: 'warning'; secondsRemaining: number }
  | { type: 'phaseStart'; phase: Phase; round: number }
  | { type: 'phaseEnd'; phase: Phase; round: number }
  | { type: 'transitionStart'; nextPhase: Phase; nextRound: number }
  | { type: 'complete'; completedPhases: number; totalPhases: number }

export const idleState: EngineState = {
  status: 'idle',
  round: 1,
  phaseIndex: 0,
  remainingMs: 0,
  phaseDurationMs: 0,
  completedPhases: 0,
  pausedFrom: null,
}

const WARNING_SECONDS = [30, 10, 5, 4, 3, 2, 1]

export function totalPhases(program: Program): number {
  const restCount = program.phases.filter((phase) => phase.type === 'rest').length
  return Math.max(1, program.phases.length * program.rounds - (restCount > 0 ? 1 : 0))
}

export function nextCoords(
  program: Program,
  round: number,
  phaseIndex: number,
): { round: number; phaseIndex: number } | null {
  let nextRound = round
  let nextIndex = phaseIndex + 1

  while (true) {
    if (nextIndex < program.phases.length) {
      const phase = program.phases[nextIndex]
      const isLastRound = nextRound >= program.rounds
      if (phase.type === 'rest' && isLastRound) return null
      if (phase.duration <= 0) {
        nextIndex += 1
        continue
      }
      return { round: nextRound, phaseIndex: nextIndex }
    }
    if (nextRound < program.rounds) {
      nextRound += 1
      nextIndex = 0
      continue
    }
    return null
  }
}

function beginPhase(
  program: Program,
  round: number,
  phaseIndex: number,
  completedPhases: number,
): EngineState {
  const phase = program.phases[phaseIndex]
  return {
    status: 'running',
    round,
    phaseIndex,
    remainingMs: phase.duration * 1000,
    phaseDurationMs: phase.duration * 1000,
    completedPhases,
    pausedFrom: null,
  }
}

export function startSession(program: Program): {
  state: EngineState
  events: EngineEvent[]
} {
  const first = program.phases.find((phase) => phase.duration > 0) ?? program.phases[0]
  const phaseIndex = program.phases.indexOf(first)
  const state = beginPhase(program, 1, phaseIndex, 0)
  return {
    state,
    events: [{ type: 'phaseStart', phase: first, round: 1 }],
  }
}

export function pauseEngine(state: EngineState): EngineState {
  if (state.status !== 'running' && state.status !== 'transition') return state
  return {
    ...state,
    status: 'paused',
    pausedFrom: state.status,
  }
}

export function resumeEngine(state: EngineState): EngineState {
  if (state.status !== 'paused') return state
  return {
    ...state,
    status: state.pausedFrom ?? 'running',
    pausedFrom: null,
  }
}

function startNext(
  program: Program,
  state: EngineState,
): { state: EngineState; events: EngineEvent[] } {
  const next = nextCoords(program, state.round, state.phaseIndex)
  const completed = state.completedPhases + 1
  if (!next) {
    return {
      state: {
        ...state,
        status: 'complete',
        remainingMs: 0,
        completedPhases: completed,
        pausedFrom: null,
      },
      events: [
        {
          type: 'complete',
          completedPhases: completed,
          totalPhases: totalPhases(program),
        },
      ],
    }
  }
  const phase = program.phases[next.phaseIndex]
  return {
    state: beginPhase(program, next.round, next.phaseIndex, completed),
    events: [{ type: 'phaseStart', phase, round: next.round }],
  }
}

function endCurrentPhase(
  program: Program,
  state: EngineState,
  options: EngineOptions,
): { state: EngineState; events: EngineEvent[] } {
  const phase = program.phases[state.phaseIndex]
  const endEvent: EngineEvent = { type: 'phaseEnd', phase, round: state.round }
  const next = nextCoords(program, state.round, state.phaseIndex)

  if (!next) {
    return {
      state: {
        ...state,
        status: 'complete',
        remainingMs: 0,
        completedPhases: state.completedPhases + 1,
        pausedFrom: null,
      },
      events: [
        endEvent,
        {
          type: 'complete',
          completedPhases: state.completedPhases + 1,
          totalPhases: totalPhases(program),
        },
      ],
    }
  }

  const nextPhase = program.phases[next.phaseIndex]
  if (options.handsFree) {
    const durationMs = Math.max(1, options.transitionSeconds) * 1000
    return {
      state: {
        ...state,
        status: 'transition',
        remainingMs: durationMs,
        phaseDurationMs: durationMs,
        pausedFrom: null,
      },
      events: [
        endEvent,
        { type: 'transitionStart', nextPhase, nextRound: next.round },
      ],
    }
  }

  return {
    state: {
      ...state,
      status: 'awaitingNext',
      remainingMs: 0,
      pausedFrom: null,
    },
    events: [endEvent],
  }
}

export function continueSession(
  program: Program,
  state: EngineState,
): { state: EngineState; events: EngineEvent[] } {
  if (state.status === 'awaitingNext' || state.status === 'transition') {
    return startNext(program, state)
  }
  return { state, events: [] }
}

export function skipPhase(
  program: Program,
  state: EngineState,
): { state: EngineState; events: EngineEvent[] } {
  if (state.status === 'idle' || state.status === 'complete') {
    return { state, events: [] }
  }
  if (state.status === 'awaitingNext' || state.status === 'transition') {
    return startNext(program, state)
  }
  return startNext(program, state)
}

export function stopSession(): EngineState {
  return { ...idleState }
}

export function tick(
  state: EngineState,
  program: Program,
  deltaMs: number,
  options: EngineOptions,
): { state: EngineState; events: EngineEvent[] } {
  if (state.status !== 'running' && state.status !== 'transition') {
    return { state, events: [] }
  }

  const prev = state.remainingMs
  const remaining = prev - deltaMs
  const events: EngineEvent[] = []

  if (state.status === 'running') {
    for (const seconds of WARNING_SECONDS) {
      const threshold = seconds * 1000
      if (prev > threshold && remaining <= threshold && remaining > 0) {
        events.push({ type: 'warning', secondsRemaining: seconds })
      }
    }
  }

  if (remaining > 0) {
    return { state: { ...state, remainingMs: remaining }, events }
  }

  if (state.status === 'transition') {
    const next = startNext(program, state)
    return { state: next.state, events: [...events, ...next.events] }
  }

  const ended = endCurrentPhase(program, { ...state, remainingMs: 0 }, options)
  return { state: ended.state, events: [...events, ...ended.events] }
}
