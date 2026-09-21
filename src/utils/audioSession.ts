export type CueAudioMode = 'transient' | 'ambient'

type AudioSessionNavigator = Navigator & {
  audioSession?: {
    type: string
  }
}

/**
 * Prefer ducking background music for short cues instead of pausing it.
 * Falls back silently when the Audio Session API is unavailable.
 */
export function prepareCueAudio(mode: CueAudioMode = 'transient'): void {
  const session = (navigator as AudioSessionNavigator).audioSession
  if (!session) return
  try {
    session.type = mode
  } catch {
    // Unsupported type on this browser — leave platform default alone.
  }
}

export function releaseCueAudio(): void {
  const session = (navigator as AudioSessionNavigator).audioSession
  if (!session) return
  try {
    session.type = 'auto'
  } catch {
    // ignore
  }
}
