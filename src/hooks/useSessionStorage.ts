import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppSettings, Program, Session, SessionStats } from '../types/timer'
import {
  chooseNewest,
  readAllEnvelopes,
  readLocalEnvelope,
  requestPersistentStorage,
  writeDurable,
  writeLocalEnvelope,
  type Envelope,
} from '../utils/durableStore'
import {
  emptySessionLog,
  mergeSessionLogs,
  normalizeSessionLog,
  removeSession,
  upsertSession,
  type SessionLog,
} from '../utils/sessionLog'

const SESSIONS_KEY = 'sauna_sessions'
const CUSTOM_PROGRAMS_KEY = 'sauna_custom_programs'
const SETTINGS_KEY = 'sauna_settings'

export const DEFAULT_SETTINGS: AppSettings = {
  audio: {
    enabled: true,
    warnings: true,
    volume: 0.85,
  },
  darkMode: true,
  handsFreeModeEnabled: true,
  handsFreeTransitionDuration: 10,
  preferredColdType: 'shower',
  temperatureUnit: 'F',
  disclaimerAccepted: false,
  practiceDismissed: false,
}

function mergeSettings(stored: Partial<AppSettings> | null | undefined): AppSettings {
  const audio = stored?.audio
  return {
    ...DEFAULT_SETTINGS,
    darkMode: stored?.darkMode ?? DEFAULT_SETTINGS.darkMode,
    handsFreeModeEnabled:
      stored?.handsFreeModeEnabled ?? DEFAULT_SETTINGS.handsFreeModeEnabled,
    handsFreeTransitionDuration:
      stored?.handsFreeTransitionDuration ?? DEFAULT_SETTINGS.handsFreeTransitionDuration,
    preferredColdType: stored?.preferredColdType ?? DEFAULT_SETTINGS.preferredColdType,
    temperatureUnit: stored?.temperatureUnit ?? DEFAULT_SETTINGS.temperatureUnit,
    disclaimerAccepted: stored?.disclaimerAccepted ?? DEFAULT_SETTINGS.disclaimerAccepted,
    practiceDismissed: stored?.practiceDismissed ?? DEFAULT_SETTINGS.practiceDismissed,
    audio: {
      enabled: audio?.enabled ?? DEFAULT_SETTINGS.audio.enabled,
      warnings: audio?.warnings ?? DEFAULT_SETTINGS.audio.warnings,
      volume: typeof audio?.volume === 'number' ? audio.volume : DEFAULT_SETTINGS.audio.volume,
    },
  }
}

function loadSettings(): { settings: AppSettings; updatedAt: number } {
  const envelope = readLocalEnvelope<Partial<AppSettings>>(SETTINGS_KEY)
  return { settings: mergeSettings(envelope?.value), updatedAt: envelope?.updatedAt ?? 0 }
}

function loadPrograms(): { programs: Program[]; updatedAt: number } {
  const envelope = readLocalEnvelope<Program[]>(CUSTOM_PROGRAMS_KEY)
  const programs = Array.isArray(envelope?.value) ? envelope.value : []
  return { programs, updatedAt: envelope?.updatedAt ?? 0 }
}

function loadSessions(): { log: SessionLog; updatedAt: number } {
  const envelope = readLocalEnvelope<unknown>(SESSIONS_KEY)
  if (!envelope) return { log: emptySessionLog(), updatedAt: 0 }
  return { log: normalizeSessionLog(envelope.value), updatedAt: envelope.updatedAt }
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function useSessionStorage() {
  const initialSessions = loadSessions()
  const initialPrograms = loadPrograms()
  const initialSettings = loadSettings()

  const [sessions, setSessions] = useState<Session[]>(initialSessions.log.sessions)
  const [customPrograms, setCustomPrograms] = useState<Program[]>(initialPrograms.programs)
  const [settings, setSettings] = useState<AppSettings>(initialSettings.settings)

  const logRef = useRef(initialSessions.log)
  const sessionsStamp = useRef(initialSessions.updatedAt)
  const programsRef = useRef(initialPrograms.programs)
  const programsStamp = useRef(initialPrograms.updatedAt)
  const programsDirty = useRef(false)
  const settingsRef = useRef(initialSettings.settings)
  const settingsStamp = useRef(initialSettings.updatedAt)
  const settingsDirty = useRef(false)
  const hydrated = useRef(false)

  const commitLog = useCallback((log: SessionLog, updatedAt = Date.now()) => {
    logRef.current = log
    sessionsStamp.current = updatedAt
    setSessions(log.sessions)
    if (hydrated.current) {
      void writeDurable(SESSIONS_KEY, log, updatedAt)
      return
    }
    writeLocalEnvelope(SESSIONS_KEY, { updatedAt, value: log })
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      requestPersistentStorage()
      const [sessionCopies, programCopies, settingsCopies] = await Promise.all([
        readAllEnvelopes<unknown>(SESSIONS_KEY),
        readAllEnvelopes<Program[]>(CUSTOM_PROGRAMS_KEY),
        readAllEnvelopes<Partial<AppSettings>>(SETTINGS_KEY),
      ])
      if (cancelled) return

      const mergedLog = mergeSessionLogs([
        ...sessionCopies
          .filter((copy): copy is Envelope<unknown> => !!copy)
          .map((copy) => normalizeSessionLog(copy.value)),
        logRef.current,
      ])
      hydrated.current = true
      commitLog(mergedLog)

      const newestPrograms = chooseNewest(
        programCopies.map((copy) =>
          copy && Array.isArray(copy.value) ? copy : null,
        ),
      )
      if (!programsDirty.current && newestPrograms && newestPrograms.updatedAt >= programsStamp.current) {
        programsRef.current = newestPrograms.value
        programsStamp.current = newestPrograms.updatedAt
        setCustomPrograms(newestPrograms.value)
      }
      await writeDurable(CUSTOM_PROGRAMS_KEY, programsRef.current, programsStamp.current || Date.now())

      const newestSettings = chooseNewest(settingsCopies)
      if (!settingsDirty.current && newestSettings && newestSettings.updatedAt > settingsStamp.current) {
        const merged = mergeSettings(newestSettings.value)
        settingsRef.current = merged
        settingsStamp.current = newestSettings.updatedAt
        setSettings(merged)
      }
      await writeDurable(SETTINGS_KEY, settingsRef.current, settingsStamp.current || Date.now())
    })()
    return () => {
      cancelled = true
    }
  }, [commitLog])

  const saveSession = useCallback((session: Session) => {
    commitLog(upsertSession(logRef.current, session))
  }, [commitLog])

  const deleteSession = useCallback((sessionId: string) => {
    commitLog(removeSession(logRef.current, sessionId))
  }, [commitLog])

  const saveCustomProgram = useCallback((program: Program) => {
    programsDirty.current = true
    const updated = programsRef.current.some((item) => item.id === program.id)
      ? programsRef.current.map((item) => (item.id === program.id ? program : item))
      : [...programsRef.current, program]
    programsRef.current = updated
    const updatedAt = Date.now()
    programsStamp.current = updatedAt
    setCustomPrograms(updated)
    if (hydrated.current) void writeDurable(CUSTOM_PROGRAMS_KEY, updated, updatedAt)
    else writeLocalEnvelope(CUSTOM_PROGRAMS_KEY, { updatedAt, value: updated })
  }, [])

  const deleteCustomProgram = useCallback((programId: string) => {
    programsDirty.current = true
    const updated = programsRef.current.filter((program) => program.id !== programId)
    programsRef.current = updated
    const updatedAt = Date.now()
    programsStamp.current = updatedAt
    setCustomPrograms(updated)
    if (hydrated.current) void writeDurable(CUSTOM_PROGRAMS_KEY, updated, updatedAt)
    else writeLocalEnvelope(CUSTOM_PROGRAMS_KEY, { updatedAt, value: updated })
  }, [])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    settingsDirty.current = true
    const updated = { ...settingsRef.current, ...patch }
    settingsRef.current = updated
    const updatedAt = Date.now()
    settingsStamp.current = updatedAt
    setSettings(updated)
    if (hydrated.current) void writeDurable(SETTINGS_KEY, updated, updatedAt)
    else writeLocalEnvelope(SETTINGS_KEY, { updatedAt, value: updated })
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
