import { useCallback, useEffect, useRef, useState } from 'react'
import type { Phase, Program } from '../types/timer'
import {
  continueSession,
  idleState,
  nextCoords,
  pauseEngine,
  resumeEngine,
  skipPhase,
  startSession,
  stopSession,
  tick,
  totalPhases,
  type EngineEvent,
  type EngineState,
} from '../utils/timerEngine'
import { wallClockTickDelta } from '../utils/wallClockTick'

interface UseTimerArgs {
  program: Program | null
  handsFree: boolean
  transitionSeconds: number
  onEvent: (event: EngineEvent) => void
  /** Restored engine state from a checkpoint. Applied once, on mount. */
  initialState?: EngineState
  initialPhaseEndsAt?: number | null
}

function phaseKey(state: EngineState): string {
  return `${state.status}|${state.round}|${state.phaseIndex}|${state.phaseDurationMs}`
}

function initialPhaseAnchor(
  state: EngineState | undefined,
  endsAt: number | null | undefined,
): { key: string; at: number } | null {
  if (!state || endsAt == null) return null
  if (state.status !== 'running' && state.status !== 'transition') return null
  return { key: phaseKey(state), at: endsAt }
}

export function useTimer({
  program,
  handsFree,
  transitionSeconds,
  onEvent,
  initialState,
  initialPhaseEndsAt,
}: UseTimerArgs) {
  const [state, setState] = useState<EngineState>(initialState ?? idleState)
  const stateRef = useRef(state)
  const programRef = useRef(program)
  const optionsRef = useRef({ handsFree, transitionSeconds })
  const onEventRef = useRef(onEvent)
  const endsAtRef = useRef(initialPhaseAnchor(initialState, initialPhaseEndsAt))

  stateRef.current = state
  programRef.current = program
  optionsRef.current = { handsFree, transitionSeconds }
  onEventRef.current = onEvent

  const anchorPhase = useCallback((next: EngineState, endsAt?: number | null) => {
    if (next.status !== 'running' && next.status !== 'transition') {
      endsAtRef.current = null
      return
    }
    const key = phaseKey(next)
    if (endsAt != null) {
      endsAtRef.current = { key, at: endsAt }
      return
    }
    if (!endsAtRef.current || endsAtRef.current.key !== key) {
      endsAtRef.current = { key, at: Date.now() + next.remainingMs }
    }
  }, [])

  const apply = useCallback((result: { state: EngineState; events: EngineEvent[] }) => {
    stateRef.current = result.state
    setState(result.state)
    anchorPhase(result.state)
    result.events.forEach((event) => onEventRef.current(event))
  }, [anchorPhase])

  const syncFromWallClock = useCallback(() => {
    const current = stateRef.current
    if (current.status !== 'running' && current.status !== 'transition') {
      endsAtRef.current = null
      return
    }

    const key = phaseKey(current)
    if (!endsAtRef.current || endsAtRef.current.key !== key) {
      endsAtRef.current = { key, at: Date.now() + current.remainingMs }
    }

    const delta = wallClockTickDelta(
      current.remainingMs,
      endsAtRef.current.at,
      Date.now(),
    )
    if (delta == null) return

    const currentProgram = programRef.current
    if (!currentProgram) return

    apply(tick(current, currentProgram, delta, optionsRef.current))

    const next = stateRef.current
    if (next.status === 'running' || next.status === 'transition') {
      const nextKey = phaseKey(next)
      if (!endsAtRef.current || endsAtRef.current.key !== nextKey) {
        endsAtRef.current = { key: nextKey, at: Date.now() + next.remainingMs }
      }
    } else {
      endsAtRef.current = null
    }
  }, [apply])

  useEffect(() => {
    if (state.status !== 'running' && state.status !== 'transition') {
      endsAtRef.current = null
      return
    }

    const key = phaseKey(stateRef.current)
    if (!endsAtRef.current || endsAtRef.current.key !== key) {
      endsAtRef.current = {
        key,
        at: Date.now() + stateRef.current.remainingMs,
      }
    }

    const id = window.setInterval(() => {
      syncFromWallClock()
    }, 100)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncFromWallClock()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onVisibility)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onVisibility)
    }
  }, [state.status, state.round, state.phaseIndex, syncFromWallClock])

  const start = useCallback(() => {
    if (!programRef.current) return
    apply(startSession(programRef.current))
  }, [apply])

  const pause = useCallback(() => {
    const next = pauseEngine(stateRef.current)
    endsAtRef.current = null
    stateRef.current = next
    setState(next)
  }, [])

  const resume = useCallback(() => {
    const next = resumeEngine(stateRef.current)
    stateRef.current = next
    setState(next)
    anchorPhase(next)
  }, [anchorPhase])

  const stop = useCallback(() => {
    endsAtRef.current = null
    const next = stopSession()
    stateRef.current = next
    setState(next)
  }, [])

  const skip = useCallback(() => {
    if (!programRef.current) return
    apply(skipPhase(programRef.current, stateRef.current))
  }, [apply])

  const continueNext = useCallback(() => {
    if (!programRef.current) return
    apply(continueSession(programRef.current, stateRef.current))
  }, [apply])

  const hydrate = useCallback((next: EngineState, phaseEndsAt: number | null) => {
    stateRef.current = next
    setState(next)
    anchorPhase(next, phaseEndsAt)
  }, [anchorPhase])

  const getState = useCallback(() => stateRef.current, [])
  const getPhaseEndsAt = useCallback(() => endsAtRef.current?.at ?? null, [])

  const currentPhase: Phase | null = program
    ? (program.phases[state.phaseIndex] ?? null)
    : null

  const upcoming = program
    ? nextCoords(program, state.round, state.phaseIndex)
    : null

  return {
    state,
    currentPhase,
    nextPhase: upcoming && program ? program.phases[upcoming.phaseIndex] : null,
    nextRound: upcoming?.round ?? null,
    totalPhaseCount: program ? totalPhases(program) : 0,
    start,
    pause,
    resume,
    stop,
    skip,
    continueNext,
    hydrate,
    getState,
    getPhaseEndsAt,
  }
}
