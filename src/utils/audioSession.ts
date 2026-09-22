export type CueAudioMode = 'transient' | 'ambient'
export type IdleAudioMode = 'auto' | 'ambient'

type AudioSessionNavigator = Navigator & {
  audioSession?: {
    type: string
  }
}

let idleMode: IdleAudioMode = 'auto'

/**
 * Set how our cues interact with Spotify / Apple Music.
 * Default to ambient (mix). Transient often pauses other apps on iOS
 * even though the spec says it should only duck.
 */
export function prepareCueAudio(mode: CueAudioMode = 'ambient'): void {
  const session = (navigator as AudioSessionNavigator).audioSession
  if (!session) return
  try {
    session.type = mode
  } catch {
    // Unsupported type on this browser — leave platform default alone.
  }
}

/**
 * Idle / keepalive session type. Prefer ambient so music keeps playing.
 */
export function setIdleAudioMode(mode: IdleAudioMode): void {
  idleMode = mode
  const session = (navigator as AudioSessionNavigator).audioSession
  if (!session) return
  try {
    session.type = mode
  } catch {
    // ignore
  }
}

export function getIdleAudioMode(): IdleAudioMode {
  return idleMode
}

export function releaseCueAudio(): void {
  const session = (navigator as AudioSessionNavigator).audioSession
  if (!session) return
  try {
    session.type = idleMode === 'auto' ? 'ambient' : idleMode
  } catch {
    // ignore
  }
}
