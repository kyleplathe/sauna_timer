import { prepareCueAudio, releaseCueAudio, setIdleAudioMode } from './audioSession'

let audioContext: AudioContext | null = null
let releaseCueTimer: ReturnType<typeof setTimeout> | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

/**
 * Must run inside a user gesture (Start / Resume).
 * Keeps Web Audio usable for countdown beeps. Cues stay ambient so they
 * mix over Spotify / Apple Music.
 */
export function unlockWebAudio(): void {
  setIdleAudioMode('ambient')
  prepareCueAudio('ambient')
  const ctx = getAudioContext()
  void ctx.resume()
  // Tiny inaudible blip so the graph is fully opened on iOS Safari.
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  gainNode.gain.setValueAtTime(0.0001, ctx.currentTime)
  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.02)
  scheduleCueRelease(80)
}

function scheduleCueRelease(holdMs: number): void {
  if (releaseCueTimer) clearTimeout(releaseCueTimer)
  releaseCueTimer = setTimeout(() => {
    releaseCueAudio()
    releaseCueTimer = null
  }, holdMs)
}

/** Play a short cue while keeping Spotify/Apple Music mixing (ambient). */
function withMixedCue(durationMs: number, play: () => void): void {
  setIdleAudioMode('ambient')
  prepareCueAudio('ambient')
  play()
  scheduleCueRelease(Math.max(250, durationMs + 120))
}

export function playBeep(
  frequency = 800,
  duration = 0.2,
  volume = 0.3,
): void {
  withMixedCue(duration * 1000, () => {
    const ctx = getAudioContext()
    void ctx.resume()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.frequency.value = frequency
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(Math.max(0.001, volume), ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  })
}

/** Rising tick used for the final 5-second countdown. */
export function playCountdownTick(secondsRemaining: number, volume = 0.3): void {
  const clamped = Math.min(5, Math.max(1, Math.round(secondsRemaining)))
  // Pitch rises toward zero so each second is distinct under music.
  const frequency = 480 + (5 - clamped) * 90
  const duration = clamped === 1 ? 0.28 : 0.12
  const level = volume * (clamped === 1 ? 1.2 : 1.0)
  playBeep(frequency, duration, level)
}

export function playChime(volume = 0.3): void {
  ;[523.25, 659.25, 783.99].forEach((freq, index) => {
    window.setTimeout(() => playBeep(freq, 0.3, volume), index * 100)
  })
}

export function playTransitionSound(volume = 0.3): void {
  playBeep(440, 0.15, volume)
  window.setTimeout(() => playBeep(554.37, 0.15, volume), 150)
}

export function playCompletionSound(volume = 0.3): void {
  const melody = [
    { freq: 523.25, duration: 0.2 },
    { freq: 659.25, duration: 0.2 },
    { freq: 783.99, duration: 0.2 },
    { freq: 1046.5, duration: 0.4 },
  ]
  let delay = 0
  melody.forEach((note) => {
    window.setTimeout(() => playBeep(note.freq, note.duration, volume), delay)
    delay += note.duration * 1000
  })
}

export function announcePhaseChange(volume: number): void {
  playTransitionSound(volume)
}

export function announceCompletion(volume: number): void {
  playCompletionSound(volume)
}

export function announceWarning(seconds: number, volume: number): void {
  if (seconds === 30) {
    playChime(volume * 0.7)
    return
  }
  if (seconds === 10) {
    playBeep(660, 0.15, volume * 0.7)
    return
  }
  if (seconds >= 1 && seconds <= 5) {
    playCountdownTick(seconds, volume)
  }
}

export function announceTransition(volume: number): void {
  playChime(volume)
}
