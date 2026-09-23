import { describe, expect, it } from 'vitest'
import type { Program } from '../types/timer'
import { getTotalDuration } from './protocols'
import {
  continueSession,
  nextCoords,
  startSession,
  tick,
  totalPhases,
} from './timerEngine'

const program: Program = {
  id: 'test',
  name: 'Test',
  description: '',
  rounds: 2,
  coldType: 'shower',
  isPreset: true,
  phases: [
    { type: 'sauna', duration: 2 },
    { type: 'cold', duration: 1 },
    { type: 'rest', duration: 1 },
  ],
}

describe('timer engine', () => {
  it('skips rest after the last cold phase', () => {
    expect(nextCoords(program, 2, 1)).toBeNull()
    expect(totalPhases(program)).toBe(5)
    expect(getTotalDuration(program)).toBe(7)
  })

  it('runs sauna then cold then rest on the first round', () => {
    let { state, events } = startSession(program)
    expect(events[0]).toMatchObject({ type: 'phaseStart', round: 1 })
    expect(state.status).toBe('running')
    expect(state.phaseIndex).toBe(0)

    ;({ state, events } = tick(state, program, 2000, { handsFree: false, transitionSeconds: 5 }))
    expect(state.status).toBe('awaitingNext')
    expect(events.some((event) => event.type === 'phaseEnd')).toBe(true)

    ;({ state } = continueSession(program, state))
    expect(state.phaseIndex).toBe(1)
    expect(state.status).toBe('running')
  })

  it('inserts a hands-free transition and then auto-starts the next phase', () => {
    let { state } = startSession(program)
    ;({ state } = tick(state, program, 2000, { handsFree: true, transitionSeconds: 5 }))
    expect(state.status).toBe('transition')
    expect(state.remainingMs).toBe(5000)

    const result = tick(state, program, 5000, { handsFree: true, transitionSeconds: 5 })
    expect(result.state.status).toBe('running')
    expect(result.state.phaseIndex).toBe(1)
    expect(result.events.some((event) => event.type === 'phaseStart')).toBe(true)
  })

  it('emits a 30-second warning when crossing the threshold', () => {
    const longProgram: Program = {
      ...program,
      phases: [{ type: 'sauna', duration: 40 }, ...program.phases.slice(1)],
    }
    let { state } = startSession(longProgram)
    const result = tick(state, longProgram, 11_000, {
      handsFree: false,
      transitionSeconds: 5,
    })
    expect(result.events).toContainEqual({ type: 'warning', secondsRemaining: 30 })
  })

  it('emits a tone-countdown warning for each of the last 5 seconds', () => {
    const shortProgram: Program = {
      ...program,
      phases: [{ type: 'sauna', duration: 8 }, ...program.phases.slice(1)],
    }
    let { state } = startSession(shortProgram)
    const options = { handsFree: false, transitionSeconds: 5 }
    const warnings: number[] = []

    for (let elapsed = 0; elapsed < 7; elapsed += 1) {
      const result = tick(state, shortProgram, 1000, options)
      state = result.state
      result.events.forEach((event) => {
        if (event.type === 'warning') warnings.push(event.secondsRemaining)
      })
    }

    expect(warnings).toEqual([5, 4, 3, 2, 1])
  })

  it('completes after the last cold phase', () => {
    let { state } = startSession(program)
    const options = { handsFree: false, transitionSeconds: 5 }
    for (let i = 0; i < 4; i += 1) {
      const phase = program.phases[state.phaseIndex]
      ;({ state } = tick(state, program, phase.duration * 1000, options))
      if (state.status === 'awaitingNext') {
        ;({ state } = continueSession(program, state))
      }
    }
    const last = tick(state, program, program.phases[state.phaseIndex].duration * 1000, options)
    expect(last.state.status).toBe('complete')
    expect(last.events.some((event) => event.type === 'complete')).toBe(true)
  })

  it('completes the dry-run demo after one heat and one cold', async () => {
    const { PRESET_PROGRAMS } = await import('./protocols')
    const practice = PRESET_PROGRAMS.find((item) => item.id === 'practice')
    expect(practice).toBeTruthy()
    expect(practice!.rounds).toBe(1)
    expect(totalPhases(practice!)).toBe(2)

    const options = { handsFree: true, transitionSeconds: 5 }
    let { state } = startSession(practice!)
    ;({ state } = tick(state, practice!, practice!.phases[0].duration * 1000, options))
    expect(state.status).toBe('transition')
    ;({ state } = tick(state, practice!, state.remainingMs, options))
    expect(state.status).toBe('running')
    expect(practice!.phases[state.phaseIndex].type).toBe('cold')
    const done = tick(state, practice!, practice!.phases[1].duration * 1000, options)
    expect(done.state.status).toBe('complete')
    expect(done.events.some((event) => event.type === 'complete')).toBe(true)
  })
})
