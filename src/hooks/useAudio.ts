import { useCallback, useEffect } from 'react'
import type { AudioSettings, PhaseType } from '../types/timer'
import {
  announceCompletion,
  announcePhaseChange,
  announceTransition,
  announceWarning,
  setDuckMusicEnabled,
} from '../utils/audio'

export function useAudio(
  audioSettings: AudioSettings,
  coldType: 'plunge' | 'shower',
) {
  useEffect(() => {
    setDuckMusicEnabled(!!audioSettings.duckMusic)
  }, [audioSettings.duckMusic])

  const playPhaseChangeSound = useCallback(
    (phaseType: PhaseType) => {
      if (!audioSettings.enabled) return
      announcePhaseChange(
        phaseType,
        coldType,
        audioSettings.voiceGuidance,
        audioSettings.volume,
      )
    },
    [audioSettings, coldType],
  )

  const playWarningSound = useCallback(
    (secondsRemaining: number) => {
      if (!audioSettings.enabled || !audioSettings.warnings) return
      announceWarning(
        secondsRemaining,
        audioSettings.voiceGuidance,
        audioSettings.volume,
      )
    },
    [audioSettings],
  )

  const playCompletionSound = useCallback(() => {
    if (!audioSettings.enabled) return
    announceCompletion(audioSettings.voiceGuidance, audioSettings.volume)
  }, [audioSettings])

  const playTransitionCue = useCallback(
    (nextLabel: string) => {
      if (!audioSettings.enabled) return
      announceTransition(nextLabel, audioSettings.voiceGuidance, audioSettings.volume)
    },
    [audioSettings],
  )

  return {
    playPhaseChangeSound,
    playWarningSound,
    playCompletionSound,
    playTransitionCue,
  }
}
