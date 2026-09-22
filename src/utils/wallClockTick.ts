/**
 * How far the in-memory timer should advance to match the wall clock.
 * Returns null when the change is too small to bother applying.
 *
 * Important: when the wall clock says the phase is over, always return a
 * delta large enough to finish — otherwise remainingMs can sit under 1s
 * forever (UI stuck on 00:01) because tiny deltas were filtered out.
 */
export function wallClockTickDelta(
  remainingMs: number,
  endsAtMs: number,
  nowMs: number,
  minDeltaMs = 16,
): number | null {
  if (remainingMs <= 0) return null
  const wallRemaining = Math.max(0, endsAtMs - nowMs)
  if (wallRemaining <= 0) {
    return remainingMs
  }
  const delta = remainingMs - wallRemaining
  if (delta < minDeltaMs) return null
  return delta
}
