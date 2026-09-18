import type { ColdType, Phase, PhaseType, Program } from '../types/timer'

export const PRESET_PROGRAMS: Program[] = [
  {
    id: 'practice',
    name: 'Dry run',
    description: 'A one-minute walkthrough so you can learn the flow before heat and ice.',
    rounds: 2,
    coldType: 'shower',
    isPreset: true,
    phases: [
      { type: 'sauna', duration: 20, temperature: { value: 70, unit: 'C' } },
      { type: 'cold', duration: 10, temperature: { value: 15, unit: 'C' } },
      { type: 'rest', duration: 8 },
    ],
  },
  {
    id: 'beginner',
    name: 'Beginner',
    description: 'Two gentle rounds. Heat first, finish on cold.',
    rounds: 2,
    coldType: 'plunge',
    isPreset: true,
    phases: [
      { type: 'sauna', duration: 10 * 60, temperature: { value: 70, unit: 'C' } },
      { type: 'cold', duration: 60, temperature: { value: 15, unit: 'C' } },
      { type: 'rest', duration: 5 * 60 },
    ],
  },
  {
    id: 'beginner-shower',
    name: 'Beginner',
    description: 'Two gentle rounds with a cold shower instead of a plunge.',
    rounds: 2,
    coldType: 'shower',
    isPreset: true,
    phases: [
      { type: 'sauna', duration: 10 * 60, temperature: { value: 70, unit: 'C' } },
      { type: 'cold', duration: 90, temperature: { value: 15, unit: 'C' } },
      { type: 'rest', duration: 5 * 60 },
    ],
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    description: 'Three rounds to build heat-and-cold resilience.',
    rounds: 3,
    coldType: 'plunge',
    isPreset: true,
    phases: [
      { type: 'sauna', duration: 15 * 60, temperature: { value: 80, unit: 'C' } },
      { type: 'cold', duration: 2 * 60, temperature: { value: 12, unit: 'C' } },
      { type: 'rest', duration: 5 * 60 },
    ],
  },
  {
    id: 'intermediate-shower',
    name: 'Intermediate',
    description: 'Three rounds with a longer cold shower.',
    rounds: 3,
    coldType: 'shower',
    isPreset: true,
    phases: [
      { type: 'sauna', duration: 15 * 60, temperature: { value: 80, unit: 'C' } },
      { type: 'cold', duration: 3 * 60, temperature: { value: 12, unit: 'C' } },
      { type: 'rest', duration: 5 * 60 },
    ],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'Four intense rounds. End on cold.',
    rounds: 4,
    coldType: 'plunge',
    isPreset: true,
    phases: [
      { type: 'sauna', duration: 20 * 60, temperature: { value: 90, unit: 'C' } },
      { type: 'cold', duration: 3 * 60, temperature: { value: 10, unit: 'C' } },
      { type: 'rest', duration: 3 * 60 },
    ],
  },
  {
    id: 'advanced-shower',
    name: 'Advanced',
    description: 'Four rounds with a demanding cold shower.',
    rounds: 4,
    coldType: 'shower',
    isPreset: true,
    phases: [
      { type: 'sauna', duration: 20 * 60, temperature: { value: 90, unit: 'C' } },
      { type: 'cold', duration: 4 * 60, temperature: { value: 10, unit: 'C' } },
      { type: 'rest', duration: 3 * 60 },
    ],
  },
  {
    id: 'quick-recovery',
    name: 'Quick recovery',
    description: 'A shorter session for busy days.',
    rounds: 2,
    coldType: 'plunge',
    isPreset: true,
    phases: [
      { type: 'sauna', duration: 8 * 60, temperature: { value: 75, unit: 'C' } },
      { type: 'cold', duration: 90, temperature: { value: 12, unit: 'C' } },
      { type: 'rest', duration: 3 * 60 },
    ],
  },
  {
    id: 'quick-recovery-shower',
    name: 'Quick recovery',
    description: 'A shorter shower-based session for busy days.',
    rounds: 2,
    coldType: 'shower',
    isPreset: true,
    phases: [
      { type: 'sauna', duration: 8 * 60, temperature: { value: 75, unit: 'C' } },
      { type: 'cold', duration: 2 * 60, temperature: { value: 12, unit: 'C' } },
      { type: 'rest', duration: 3 * 60 },
    ],
  },
]

export function getTotalDuration(program: Program): number {
  const cycle = program.phases.reduce((sum, phase) => sum + phase.duration, 0)
  const lastRest =
    program.phases.find((phase) => phase.type === 'rest')?.duration ?? 0
  return Math.max(0, cycle * program.rounds - lastRest)
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  if (mins === 0) return `${secs}s`
  if (secs === 0) return `${mins}m`
  return `${mins}m ${secs}s`
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32)
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return Math.round(((fahrenheit - 32) * 5) / 9)
}

export function formatTemperature(
  temperature: { value: number; unit: 'C' | 'F' },
  preferred: 'C' | 'F',
): string {
  const value =
    temperature.unit === preferred
      ? temperature.value
      : preferred === 'F'
        ? celsiusToFahrenheit(temperature.value)
        : fahrenheitToCelsius(temperature.value)
  return `${value}°${preferred}`
}

export function phaseLabel(type: PhaseType, coldType: ColdType): string {
  if (type === 'sauna') return 'Sauna'
  if (type === 'rest') return 'Rest'
  return coldType === 'plunge' ? 'Cold plunge' : 'Cold shower'
}

export function getPhase(program: Program, index: number): Phase | undefined {
  return program.phases[index]
}
