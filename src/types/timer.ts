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
}

export interface AppSettings {
  audio: AudioSettings
  darkMode: boolean
  handsFreeModeEnabled: boolean
  handsFreeTransitionDuration: number
  preferredColdType: ColdType
  temperatureUnit: 'C' | 'F'
  disclaimerAccepted: boolean
}
