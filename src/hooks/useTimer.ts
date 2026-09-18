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

interface UseTimerArgs {
  program: Program | null
  handsFree: boolean
  transitionSeconds: number
  onEvent: (event: EngineEvent) => void
}

export function useTimer({
  program,
  handsFree,
  transitionSeconds,
  onEvent,
}: UseTimerArgs) {
  const [state, setState] = useState<EngineState>(idleState)
  const stateRef = useRef(state)
  const programRef = useRef(program)
  const optionsRef = useRef({ handsFree, transitionSeconds })
  const onEventRef = useRef(onEvent)

  stateRef.current = state
  programRef.current = program
  optionsRef.current = { handsFree, transitionSeconds }
  onEventRef.current = onEvent

  const apply = useCallback((result: { state: EngineState; events: EngineEvent[] }) => {
    stateRef.current = result.state
    setState(result.state)
    result.events.forEach((event) => onEventRef.current(event))
  }, [])

  useEffect(() => {
    if (state.status !== 'running' && state.status !== 'transition') return

    let last = Date.now()
    const id = window.setInterval(() => {
      const now = Date.now()
      const delta = now - last
      last = now
      const currentProgram = programRef.current
      if (!currentProgram) return
      apply(tick(stateRef.current, currentProgram, delta, optionsRef.current))
    }, 100)

    return () => window.clearInterval(id)
  }, [apply, state.status])

  const start = useCallback(() => {
    if (!programRef.current) return
    apply(startSession(programRef.current))
  }, [apply])

  const pause = useCallback(() => {
    const next = pauseEngine(stateRef.current)
    stateRef.current = next
    setState(next)
  }, [])

  const resume = useCallback(() => {
    const next = resumeEngine(stateRef.current)
    stateRef.current = next
    setState(next)
  }, [])

  const stop = useCallback(() => {
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
  }
}
