import { useCallback, useMemo, useState } from 'react'
import type { AppSettings, Program, Session, SessionStats } from '../types/timer'
import { computeSessionStats } from '../utils/sessionMetrics'

const SESSIONS_KEY = 'sauna_sessions'
const CUSTOM_PROGRAMS_KEY = 'sauna_custom_programs'
const SETTINGS_KEY = 'sauna_settings'
/** One-time flip away from settings that pause Spotify during cues. */
const AUDIO_MIX_MIGRATION_KEY = 'sauna_audio_mix_v2'

export const DEFAULT_SETTINGS: AppSettings = {
  audio: {
    enabled: true,
    voiceGuidance: false,
    warnings: true,
    volume: 0.85,
    duckMusic: false,
  },
  darkMode: true,
  handsFreeModeEnabled: true,
  handsFreeTransitionDuration: 10,
  preferredColdType: 'shower',
  temperatureUnit: 'F',
  disclaimerAccepted: false,
  practiceDismissed: false,
  keepScreenAwake: true,
  lockScreenLive: false,
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

function loadSettings(): AppSettings {
  const stored = readJson<Partial<AppSettings>>(SETTINGS_KEY, {})
  const merged: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...stored,
    audio: {
      ...DEFAULT_SETTINGS.audio,
      ...stored.audio,
    },
  }

  // Existing installs still had duck+voice on, which pauses Spotify on iPhone.
  if (localStorage.getItem(AUDIO_MIX_MIGRATION_KEY) !== '1') {
    merged.audio = {
      ...merged.audio,
      duckMusic: false,
      voiceGuidance: false,
    }
    merged.keepScreenAwake = true
    merged.lockScreenLive = false
    writeJson(SETTINGS_KEY, merged)
    localStorage.setItem(AUDIO_MIX_MIGRATION_KEY, '1')
  }

  return merged
}

export function useSessionStorage() {
  const [sessions, setSessions] = useState<Session[]>(() =>
    readJson<Session[]>(SESSIONS_KEY, []),
  )
  const [customPrograms, setCustomPrograms] = useState<Program[]>(() =>
    readJson<Program[]>(CUSTOM_PROGRAMS_KEY, []),
  )
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())

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

  const stats: SessionStats = useMemo(
    () => computeSessionStats(sessions, { customPrograms }),
    [sessions, customPrograms],
  )

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
