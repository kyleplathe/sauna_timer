import { playChime, unlockWebAudio } from './audio'
import { prepareCueAudio, setIdleAudioMode } from './audioSession'

const ALARM_SRC = `${import.meta.env.BASE_URL}phase-end-alarm.wav`

let alarmAudio: HTMLAudioElement | null = null
let alarmTimer: ReturnType<typeof setTimeout> | null = null
let alarmVolume = 0.7

function ensureAlarmElement(): HTMLAudioElement {
  if (!alarmAudio) {
    alarmAudio = new Audio(ALARM_SRC)
    alarmAudio.setAttribute('playsinline', 'true')
    alarmAudio.preload = 'auto'
  }
  return alarmAudio
}

/**
 * Call from Start / Resume (user gesture).
 * Without this unlock, a deferred phase-end play() is blocked on iOS.
 */
export function unlockSessionAudio(): void {
  setIdleAudioMode('ambient')
  prepareCueAudio('ambient')
  unlockWebAudio()

  const audio = ensureAlarmElement()
  // Do not call load() here — that resets gesture unlock on iOS.
  const previousVolume = audio.volume
  audio.volume = 0.001
  audio.currentTime = 0
  void audio
    .play()
    .then(() => {
      audio.pause()
      audio.currentTime = 0
      audio.volume = previousVolume
    })
    .catch(() => {
      audio.volume = previousVolume
    })
}

/** Play the phase-end alarm now — ambient mix so music keeps playing. */
export function playPhaseEndAlarm(volume = alarmVolume): void {
  alarmVolume = volume
  setIdleAudioMode('ambient')
  prepareCueAudio('ambient')
  const audio = ensureAlarmElement()
  audio.volume = Math.min(1, Math.max(0.05, volume))
  audio.currentTime = 0
  void audio.play().catch(() => {
    // HTMLAudio blocked (no gesture unlock) — still give an audible cue.
    playChime(volume)
  })
  globalThis.setTimeout(() => setIdleAudioMode('ambient'), 1600)
}

export function cancelScheduledPhaseEndAlarm(): void {
  if (alarmTimer) {
    clearTimeout(alarmTimer)
    alarmTimer = null
  }
}

/** Schedule a phase-end alarm for `remainingMs` from now. */
export function schedulePhaseEndAlarm(
  remainingMs: number,
  volume = 0.7,
): void {
  cancelScheduledPhaseEndAlarm()
  if (remainingMs <= 0) {
    playPhaseEndAlarm(volume)
    return
  }
  alarmVolume = volume
  // Keep the already-unlocked element; never load() (resets iOS unlock).
  void ensureAlarmElement()
  alarmTimer = setTimeout(() => {
    alarmTimer = null
    playPhaseEndAlarm(volume)
  }, remainingMs)
}
