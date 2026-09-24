import type { Program, Session, SessionStats } from '../types/timer'
import { PRESET_PROGRAMS, fahrenheitToCelsius } from './protocols'

export interface SessionExposure {
  /** Mean sauna setpoint in °C for the protocol used. */
  avgHeatC: number
  /** Mean cold setpoint in °C for the protocol used. */
  avgColdC: number
  /** Planned sauna seconds for completed rounds/phases. */
  heatSeconds: number
  /** Planned cold seconds for completed rounds/phases. */
  coldSeconds: number
  roundsCompleted: number
}

function toCelsius(value: number, unit: 'C' | 'F'): number {
  return unit === 'C' ? value : fahrenheitToCelsius(value)
}

function mean(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** Planned heat/cold exposure for a fully completed program. */
export function exposureForProgram(program: Program): SessionExposure {
  const heatTemps = program.phases
    .filter((phase) => phase.type === 'sauna' && phase.temperature)
    .map((phase) => toCelsius(phase.temperature!.value, phase.temperature!.unit))
  const coldTemps = program.phases
    .filter((phase) => phase.type === 'cold' && phase.temperature)
    .map((phase) => toCelsius(phase.temperature!.value, phase.temperature!.unit))

  const heatPerRound = program.phases
    .filter((phase) => phase.type === 'sauna')
    .reduce((sum, phase) => sum + phase.duration, 0)
  const coldPerRound = program.phases
    .filter((phase) => phase.type === 'cold')
    .reduce((sum, phase) => sum + phase.duration, 0)

  return {
    avgHeatC: mean(heatTemps) ?? 0,
    avgColdC: mean(coldTemps) ?? 0,
    heatSeconds: heatPerRound * program.rounds,
    coldSeconds: coldPerRound * program.rounds,
    roundsCompleted: program.rounds,
  }
}

/**
 * Scale planned exposure by how much of the program finished.
 * Phases advance 0..totalPhases; we proportion heat/cold by completed/total.
 */
export function exposureFromProgramProgress(
  program: Program,
  completedPhases: number,
  totalPhases: number,
): SessionExposure {
  const full = exposureForProgram(program)
  const ratio =
    totalPhases > 0 ? Math.min(1, Math.max(0, completedPhases / totalPhases)) : 0
  const roundsCompleted = Math.max(
    0,
    Math.round(program.rounds * ratio * 10) / 10,
  )

  return {
    avgHeatC: full.avgHeatC,
    avgColdC: full.avgColdC,
    heatSeconds: Math.round(full.heatSeconds * ratio),
    coldSeconds: Math.round(full.coldSeconds * ratio),
    roundsCompleted,
  }
}

export function findProgramById(
  programId: string,
  customPrograms: Program[] = [],
): Program | undefined {
  return (
    customPrograms.find((program) => program.id === programId) ??
    PRESET_PROGRAMS.find((program) => program.id === programId)
  )
}

/** Prefer stored snapshot; fall back to looking up the protocol. */
export function resolveSessionExposure(
  session: Session,
  customPrograms: Program[] = [],
): SessionExposure | null {
  if (
    typeof session.avgHeatC === 'number' &&
    typeof session.heatSeconds === 'number' &&
    typeof session.coldSeconds === 'number'
  ) {
    return {
      avgHeatC: session.avgHeatC,
      avgColdC: session.avgColdC ?? 0,
      heatSeconds: session.heatSeconds,
      coldSeconds: session.coldSeconds,
      roundsCompleted: session.roundsCompleted ?? 0,
    }
  }

  const program = findProgramById(session.programId, customPrograms)
  if (!program) return null
  return exposureFromProgramProgress(
    program,
    session.completedPhases,
    session.totalPhases,
  )
}

export function formatAvgTempC(
  celsius: number | undefined,
  preferred: 'C' | 'F' = 'C',
): string {
  if (celsius === undefined || Number.isNaN(celsius)) return '—'
  if (preferred === 'F') {
    return `${Math.round((celsius * 9) / 5 + 32)}°F`
  }
  return `${Math.round(celsius)}°C`
}

export function computeSessionStats(
  sessions: Session[],
  options: { now?: number; customPrograms?: Program[] } = {},
): SessionStats {
  const now = options.now ?? Date.now()
  const customPrograms = options.customPrograms ?? []
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000
  const completed = sessions.filter((session) => session.completed)

  const uniqueDays = [
    ...new Set(completed.map((session) => startOfDay(session.startTime))),
  ].sort((a, b) => a - b)

  let longestStreak = 0
  let tempStreak = 0
  let previous = 0
  uniqueDays.forEach((day) => {
    if (previous && day - previous <= 24 * 60 * 60 * 1000) {
      tempStreak += 1
    } else {
      tempStreak = 1
    }
    longestStreak = Math.max(longestStreak, tempStreak)
    previous = day
  })

  const today = startOfDay(now)
  const lastDay = uniqueDays[uniqueDays.length - 1]
  const currentStreak =
    lastDay && today - lastDay <= 24 * 60 * 60 * 1000 ? tempStreak : 0

  const exposures = completed
    .map((session) => resolveSessionExposure(session, customPrograms))
    .filter((value): value is SessionExposure => value !== null)

  const heatTemps = exposures
    .map((exposure) => exposure.avgHeatC)
    .filter((value) => value > 0)
  const coldTemps = exposures
    .map((exposure) => exposure.avgColdC)
    .filter((value) => value > 0)

  const totalHeatSeconds = exposures.reduce(
    (sum, exposure) => sum + exposure.heatSeconds,
    0,
  )
  const totalColdSeconds = exposures.reduce(
    (sum, exposure) => sum + exposure.coldSeconds,
    0,
  )
  const totalDuration = completed.reduce(
    (sum, session) => sum + session.duration,
    0,
  )

  const protocolCounts = new Map<string, number>()
  completed.forEach((session) => {
    protocolCounts.set(
      session.programName,
      (protocolCounts.get(session.programName) ?? 0) + 1,
    )
  })
  let favoriteProtocol: string | undefined
  let favoriteCount = 0
  protocolCounts.forEach((count, name) => {
    if (count > favoriteCount) {
      favoriteCount = count
      favoriteProtocol = name
    }
  })

  return {
    totalSessions: completed.length,
    totalDuration,
    currentStreak,
    longestStreak,
    sessionsThisWeek: completed.filter((session) => session.startTime >= weekAgo)
      .length,
    sessionsThisMonth: completed.filter(
      (session) => session.startTime >= monthAgo,
    ).length,
    lastSessionDate: completed[completed.length - 1]?.startTime,
    averageDuration:
      completed.length > 0 ? Math.round(totalDuration / completed.length) : 0,
    averageHeatC: mean(heatTemps),
    averageColdC: mean(coldTemps),
    totalHeatSeconds,
    totalColdSeconds,
    favoriteProtocol,
  }
}
