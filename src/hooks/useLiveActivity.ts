import { useEffect, useRef } from 'react'
import { formatClock, phaseLabel } from '../utils/protocols'
import type { ColdType, PhaseType } from '../types/timer'

interface LiveActivityArgs {
  active: boolean
  phaseType: PhaseType | null
  coldType: ColdType
  remainingMs: number
  status: string
  programName: string
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
 * Best-effort "live activity" for a web timer:
 * - Screen Wake Lock so the phone stays awake during a session
 * - Media Session metadata for Control Center / lock screen Now Playing
 * - Document title countdown when the tab is backgrounded
 *
 * True iOS Lock Screen widgets / Dynamic Island require a native app;
 * the in-app island UI covers the always-on-top case while this tab is open.
 */
export function useLiveActivity({
  active,
  phaseType,
  coldType,
  remainingMs,
  status,
  programName,
}: LiveActivityArgs): void {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const baseTitleRef = useRef(
    typeof document !== 'undefined' ? document.title : 'Ember & Ice',
  )

  useEffect(() => {
    if (!active) {
      void wakeLockRef.current?.release().catch(() => undefined)
      wakeLockRef.current = null
      clearMediaSession()
      document.title = baseTitleRef.current
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
      if (document.visibilityState === 'visible' && active) {
        void requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      void wakeLockRef.current?.release().catch(() => undefined)
      wakeLockRef.current = null
      clearMediaSession()
      document.title = baseTitleRef.current
    }
  }, [active])

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

    document.title = title
    setMediaSession(title, programName, 'Ember & Ice')
  }, [active, phaseType, coldType, remainingMs, status, programName])
}
