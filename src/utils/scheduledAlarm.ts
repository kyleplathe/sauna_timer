import { prepareCueAudio, setIdleAudioMode } from './audioSession'

const ALARM_SRC = `${import.meta.env.BASE_URL}phase-end-alarm.wav`
const KEEPALIVE_SRC = `${import.meta.env.BASE_URL}lockscreen-keepalive.wav`

type Heartbeat = () => void

let heartbeat: Heartbeat | null = null
let keepaliveAudio: HTMLAudioElement | null = null
let alarmAudio: HTMLAudioElement | null = null
let alarmTimer: ReturnType<typeof setTimeout> | null = null
let alarmEndsAt: number | null = null
let alarmVolume = 0.7

/** Register a callback fired while session keepalive audio is playing (works while locked). */
export function setSessionHeartbeat(cb: Heartbeat | null): void {
  heartbeat = cb
}

function pulse(): void {
  heartbeat?.()
}

function ensureAlarmElement(): HTMLAudioElement {
  if (!alarmAudio) {
    alarmAudio = new Audio(ALARM_SRC)
    alarmAudio.setAttribute('playsinline', 'true')
    alarmAudio.preload = 'auto'
  }
  return alarmAudio
}

/** Play the phase-end alarm now — ambient mix so music keeps playing. */
export function playPhaseEndAlarm(volume = alarmVolume): void {
  alarmVolume = volume
  setIdleAudioMode('ambient')
  prepareCueAudio('ambient')
  const audio = ensureAlarmElement()
  audio.volume = Math.min(1, Math.max(0.05, volume))
  audio.currentTime = 0
  void audio.play().catch(() => undefined)
  globalThis.setTimeout(() => setIdleAudioMode('ambient'), 1600)
}

export function cancelScheduledPhaseEndAlarm(): void {
  if (alarmTimer) {
    clearTimeout(alarmTimer)
    alarmTimer = null
  }
  alarmEndsAt = null
}

/**
 * Schedule a phase-end alarm for `remainingMs` from now.
 * Uses setTimeout plus overdue checks from the keepalive heartbeat so it can
 * still fire while the phone is locked (JS timers alone are unreliable on iOS).
 */
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
  alarmEndsAt = Date.now() + remainingMs
  // Warm the element so play() is allowed later without a fresh gesture.
  void ensureAlarmElement().load()
  alarmTimer = setTimeout(() => {
    alarmTimer = null
    alarmEndsAt = null
    playPhaseEndAlarm(volume)
  }, remainingMs)
}

/** If the scheduled end time already passed (JS was frozen), fire the alarm. */
export function checkScheduledPhaseEndAlarm(): void {
  if (alarmEndsAt == null) return
  if (Date.now() < alarmEndsAt - 40) return
  cancelScheduledPhaseEndAlarm()
  playPhaseEndAlarm(alarmVolume)
}

/**
 * Near-silent looping HTMLAudio — only for locked-phone sessions.
 * Prefer ambient mixing. Does not claim Media Session (that steals Spotify).
 */
export function startSessionKeepalive(): () => void {
  setIdleAudioMode('ambient')
  prepareCueAudio('ambient')

  const audio = new Audio(KEEPALIVE_SRC)
  keepaliveAudio = audio
  audio.loop = true
  audio.volume = 0.015
  audio.setAttribute('playsinline', 'true')
  void audio.play().catch(() => undefined)

  const onTick = () => {
    checkScheduledPhaseEndAlarm()
    pulse()
  }
  audio.addEventListener('timeupdate', onTick)
  const id = globalThis.setInterval(onTick, 1000)

  return () => {
    globalThis.clearInterval(id)
    audio.removeEventListener('timeupdate', onTick)
    try {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    } catch {
      // ignore
    }
    if (keepaliveAudio === audio) keepaliveAudio = null
    setIdleAudioMode('ambient')
  }
}
