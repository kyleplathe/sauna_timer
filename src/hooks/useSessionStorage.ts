import { useCallback, useMemo, useState } from 'react'
import type { AppSettings, Program, Session, SessionStats } from '../types/timer'

const SESSIONS_KEY = 'sauna_sessions'
const CUSTOM_PROGRAMS_KEY = 'sauna_custom_programs'
const SETTINGS_KEY = 'sauna_settings'

export const DEFAULT_SETTINGS: AppSettings = {
  audio: {
    enabled: true,
    voiceGuidance: true,
    warnings: true,
    volume: 0.7,
    duckMusic: true,
  },
  darkMode: true,
  handsFreeModeEnabled: true,
  handsFreeTransitionDuration: 10,
  preferredColdType: 'shower',
  temperatureUnit: 'F',
  disclaimerAccepted: false,
  practiceDismissed: false,
  keepScreenAwake: false,
  lockScreenLive: true,
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function useSessionStorage() {
  const [sessions, setSessions] = useState<Session[]>(() =>
    readJson<Session[]>(SESSIONS_KEY, []),
  )
  const [customPrograms, setCustomPrograms] = useState<Program[]>(() =>
    readJson<Program[]>(CUSTOM_PROGRAMS_KEY, []),
  )
  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...readJson<Partial<AppSettings>>(SETTINGS_KEY, {}),
    audio: {
      ...DEFAULT_SETTINGS.audio,
      ...readJson<Partial<AppSettings>>(SETTINGS_KEY, {}).audio,
    },
  }))

  const saveSession = useCallback((session: Session) => {
    setSessions((prev) => {
      const updated = [...prev, session]
      writeJson(SESSIONS_KEY, updated)
      return updated
    })
  }, [])

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const updated = prev.filter((session) => session.id !== sessionId)
      writeJson(SESSIONS_KEY, updated)
      return updated
    })
  }, [])

  const saveCustomProgram = useCallback((program: Program) => {
    setCustomPrograms((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === program.id)
      const updated =
        existingIndex >= 0
          ? prev.map((item, index) => (index === existingIndex ? program : item))
          : [...prev, program]
      writeJson(CUSTOM_PROGRAMS_KEY, updated)
      return updated
    })
  }, [])

  const deleteCustomProgram = useCallback((programId: string) => {
    setCustomPrograms((prev) => {
      const updated = prev.filter((program) => program.id !== programId)
      writeJson(CUSTOM_PROGRAMS_KEY, updated)
      return updated
    })
  }, [])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...patch }
      writeJson(SETTINGS_KEY, updated)
      return updated
    })
  }, [])

  const stats: SessionStats = useMemo(() => {
    const now = Date.now()
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

    return {
      totalSessions: completed.length,
      totalDuration: completed.reduce((sum, session) => sum + session.duration, 0),
      currentStreak,
      longestStreak,
      sessionsThisWeek: completed.filter((session) => session.startTime >= weekAgo)
        .length,
      sessionsThisMonth: completed.filter((session) => session.startTime >= monthAgo)
        .length,
      lastSessionDate: completed[completed.length - 1]?.startTime,
    }
  }, [sessions])

  return {
    sessions,
    customPrograms,
    settings,
    stats,
    saveSession,
    deleteSession,
    saveCustomProgram,
    deleteCustomProgram,
    updateSettings,
  }
}
