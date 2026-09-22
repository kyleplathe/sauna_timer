import { useEffect, useRef, useState } from 'react'
import { formatClock, phaseLabel } from '../utils/protocols'
import type { ColdType, PhaseType } from '../types/timer'
import {
  clearLiveTimerNotification,
  postLiveTimerNotification,
  requestLockScreenPermission,
} from '../utils/liveNotifications'
import { prepareCueAudio, setIdleAudioMode } from '../utils/audioSession'

interface LiveActivityArgs {
  active: boolean
  phaseType: PhaseType | null
  coldType: ColdType
  remainingMs: number
  status: string
  programName: string
  /** When true, keep the screen on. Leave false so the phone can lock and show the live notification. */
  keepScreenAwake: boolean
  /** Prefer lock-screen notification + Now Playing while a session runs. */
  lockScreenLive: boolean
}

function setMediaSession(
  title: string,
  artist: string,
  album: string,
): void {
  if (!('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album,
    })
    navigator.mediaSession.playbackState = 'playing'
  } catch {
    // Media Session is best-effort on web.
  }
}

function clearMediaSession(): void {
  if (!('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.metadata = null
    navigator.mediaSession.playbackState = 'none'
  } catch {
    // ignore
  }
}

/**
 * Near-silent keepalive so iOS/Android can show Now Playing on the lock screen.
 * Uses ambient session type so it should mix instead of stopping other music.
 */
function startLockScreenAudio(): () => void {
  setIdleAudioMode('ambient')
  prepareCueAudio('ambient')
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AudioCtx) return () => undefined

  const ctx = new AudioCtx()
  void ctx.resume()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = 20
  gain.gain.value = 0.0008
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()

  return () => {
    try {
      osc.stop()
      void ctx.close()
    } catch {
      // ignore
    }
  }
}

/**
 * Best-effort lock-screen live timer from the web:
 * - Updating notification (installed PWA / Android; limited on iOS)
 * - Media Session + quiet ambient audio so Now Playing can stay on the lock screen
 * - Optional wake lock (off by default so the phone can actually lock)
 *
 * True Dynamic Island Live Activities still require a native app.
 * Cue beeps/voice still use transient ducking so music lowers instead of stopping.
 */
export function useLiveActivity({
  active,
  phaseType,
  coldType,
  remainingMs,
  status,
  programName,
  keepScreenAwake,
  lockScreenLive,
}: LiveActivityArgs): { showInAppIsland: boolean } {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const stopAudioRef = useRef<(() => void) | null>(null)
  const lastNotifySecondRef = useRef<number | null>(null)
  const baseTitleRef = useRef(
    typeof document !== 'undefined' ? document.title : 'Ember & Ice',
  )
  const [foreground, setForeground] = useState(
    () =>
      typeof document === 'undefined' || document.visibilityState === 'visible',
  )

  useEffect(() => {
    const onVisibility = () => {
      setForeground(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!active) {
      void wakeLockRef.current?.release().catch(() => undefined)
      wakeLockRef.current = null
      stopAudioRef.current?.()
      stopAudioRef.current = null
      setIdleAudioMode('auto')
      clearMediaSession()
      void clearLiveTimerNotification()
      document.title = baseTitleRef.current
      lastNotifySecondRef.current = null
      return
    }

    let cancelled = false

    const boot = async () => {
      if (lockScreenLive) {
        await requestLockScreenPermission()
        if (!cancelled && !stopAudioRef.current) {
          stopAudioRef.current = startLockScreenAudio()
        }
      } else {
        stopAudioRef.current?.()
        stopAudioRef.current = null
        setIdleAudioMode('auto')
      }
    }
    void boot()

    return () => {
      cancelled = true
    }
  }, [active, lockScreenLive])

  useEffect(() => {
    if (!active || !keepScreenAwake) {
      void wakeLockRef.current?.release().catch(() => undefined)
      wakeLockRef.current = null
      return
    }

    let cancelled = false

    const requestWakeLock = async () => {
      if (!('wakeLock' in navigator)) return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await sentinel.release()
          return
        }
        wakeLockRef.current = sentinel
        sentinel.addEventListener('release', () => {
          if (wakeLockRef.current === sentinel) wakeLockRef.current = null
        })
      } catch {
        // Permission / battery policies can deny wake lock.
      }
    }

    void requestWakeLock()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void requestWakeLock()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      void wakeLockRef.current?.release().catch(() => undefined)
      wakeLockRef.current = null
    }
  }, [active, keepScreenAwake])

  useEffect(() => {
    if (!active || !phaseType) return

    const label =
      status === 'transition'
        ? 'Walk'
        : status === 'paused'
          ? 'Paused'
          : phaseLabel(phaseType, coldType)
    const clock = formatClock(remainingMs / 1000)
    const title = `${clock} · ${label}`
    const body = `${programName} · Ember & Ice`

    document.title = title
    setMediaSession(title, programName, 'Ember & Ice')

    if (lockScreenLive) {
      const second = Math.ceil(remainingMs / 1000)
      if (lastNotifySecondRef.current !== second) {
        lastNotifySecondRef.current = second
        void postLiveTimerNotification({ title, body })
      }
    }
  }, [
    active,
    phaseType,
    coldType,
    remainingMs,
    status,
    programName,
    lockScreenLive,
  ])

  useEffect(() => {
    return () => {
      stopAudioRef.current?.()
      stopAudioRef.current = null
      setIdleAudioMode('auto')
      void clearLiveTimerNotification()
      clearMediaSession()
    }
  }, [])

  // In-app island only while the app is open and visible — lock screen uses notification / Now Playing.
  return { showInAppIsland: active && foreground }
}
