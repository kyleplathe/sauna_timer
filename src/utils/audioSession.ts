export type CueAudioMode = 'transient' | 'ambient'
export type IdleAudioMode = 'auto' | 'ambient'

type AudioSessionNavigator = Navigator & {
  audioSession?: {
    type: string
  }
}

let idleMode: IdleAudioMode = 'auto'

/**
 * Cues always use ambient so they mix over Spotify / Apple Music.
 * Transient playback pauses other apps on iPhone, so it is not offered.
 */
export function prepareCueAudio(_mode: CueAudioMode = 'ambient'): void {
  const session = (navigator as AudioSessionNavigator).audioSession
  if (!session) return
  try {
    session.type = 'ambient'
  } catch {
    // Unsupported type on this browser — leave platform default alone.
  }
}

/** Idle session type. Ambient keeps background music playing between cues. */
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
