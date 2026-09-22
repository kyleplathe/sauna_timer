export type PhaseType = 'sauna' | 'cold' | 'rest'
export type ColdType = 'plunge' | 'shower'

export interface Phase {
  type: PhaseType
  duration: number
  temperature?: {
    value: number
    unit: 'C' | 'F'
  }
}

export interface Program {
  id: string
  name: string
  description: string
  rounds: number
  phases: Phase[]
  coldType: ColdType
  isPreset: boolean
}

export interface Session {
  id: string
  programId: string
  programName: string
  startTime: number
  endTime?: number
  completedPhases: number
  totalPhases: number
  duration: number
  completed: boolean
}

export interface SessionStats {
  totalSessions: number
  totalDuration: number
  currentStreak: number
  longestStreak: number
  sessionsThisWeek: number
  sessionsThisMonth: number
  lastSessionDate?: number
}

export interface AudioSettings {
  enabled: boolean
  voiceGuidance: boolean
  warnings: boolean
  volume: number
  /** Duck background music for cues instead of stopping it (when the browser allows). */
  duckMusic: boolean
}

export interface AppSettings {
  audio: AudioSettings
  darkMode: boolean
  handsFreeModeEnabled: boolean
  handsFreeTransitionDuration: number
  preferredColdType: ColdType
  temperatureUnit: 'C' | 'F'
  disclaimerAccepted: boolean
  /** Hide the Dry run demo protocol card until restored from Settings. */
  practiceDismissed: boolean
  /** Keep the display awake during a session (prevents lock-screen live view). */
  keepScreenAwake: boolean
  /** Update a lock-screen / notification live timer while a session runs. */
  lockScreenLive: boolean
}
