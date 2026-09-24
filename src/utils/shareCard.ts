import type { SessionStats } from '../types/timer'
import { formatAvgTempC } from './sessionMetrics'

export const SHARE_CARD_SIZE = 1080

export function formatPracticeTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const mins = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  if (mins > 0) return secs > 0 && mins < 10 ? `${mins}m ${secs}s` : `${mins}m`
  return `${secs}s`
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

function fillRadial(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  inner: string,
  outer: string,
): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
  gradient.addColorStop(0, inner)
  gradient.addColorStop(1, outer)
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.min(radius, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x + w, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function fillTrackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
): void {
  let cursor = x
  for (const char of text) {
    ctx.fillText(char, cursor, y)
    cursor += ctx.measureText(char).width + tracking
  }
}

function measureTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  tracking: number,
): number {
  let width = 0
  for (const char of text) {
    width += ctx.measureText(char).width + tracking
  }
  return Math.max(0, width - tracking)
}

function drawGrain(ctx: CanvasRenderingContext2D, size: number): void {
  const image = ctx.createImageData(size, size)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    const n = Math.random() * 255
    data[i] = n
    data[i + 1] = n
    data[i + 2] = n
    data[i + 3] = 18
  }
  ctx.putImageData(image, 0, 0)
}

export async function renderShareStatsCard(
  stats: SessionStats,
  options: { size?: number; temperatureUnit?: 'C' | 'F' } = {},
): Promise<HTMLCanvasElement> {
  const size = options.size ?? SHARE_CARD_SIZE
  const temperatureUnit = options.temperatureUnit ?? 'C'
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unsupported')

  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const s = size / SHARE_CARD_SIZE

  // Atmosphere
  const bg = ctx.createLinearGradient(0, 0, size, size)
  bg.addColorStop(0, '#1a0f0a')
  bg.addColorStop(0.45, '#120e0c')
  bg.addColorStop(1, '#071318')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)

  fillRadial(
    ctx,
    size * 0.18,
    size * 0.16,
    size * 0.55,
    'rgba(249,115,22,0.38)',
    'rgba(249,115,22,0)',
  )
  fillRadial(
    ctx,
    size * 0.82,
    size * 0.78,
    size * 0.58,
    'rgba(6,182,212,0.32)',
    'rgba(6,182,212,0)',
  )
  fillRadial(
    ctx,
    size * 0.55,
    size * 0.42,
    size * 0.35,
    'rgba(255,237,213,0.08)',
    'rgba(255,237,213,0)',
  )

  ctx.save()
  ctx.globalCompositeOperation = 'soft-light'
  drawGrain(ctx, size)
  ctx.restore()

  // Soft frame
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 2 * s
  roundRect(ctx, 36 * s, 36 * s, size - 72 * s, size - 72 * s, 48 * s)
  ctx.stroke()

  // Brand
  ctx.fillStyle = '#fb923c'
  ctx.font = `500 ${22 * s}px Outfit, sans-serif`
  ctx.textAlign = 'left'
  fillTrackedText(ctx, 'EMBER & ICE', 88 * s, 120 * s, 5 * s)

  ctx.fillStyle = '#f8f1ea'
  ctx.font = `650 ${68 * s}px Fraunces, Georgia, serif`
  ctx.fillText('Contrast', 88 * s, 200 * s)
  ctx.fillText('practice', 88 * s, 270 * s)

  ctx.fillStyle = 'rgba(244,236,227,0.62)'
  ctx.font = `400 ${24 * s}px Outfit, sans-serif`
  ctx.fillText('Heat first. Cold second. Keep going.', 88 * s, 320 * s)

  // Hero panel — sessions + streak
  const heroY = 360 * s
  roundRect(ctx, 72 * s, heroY, size - 144 * s, 230 * s, 36 * s)
  const heroFill = ctx.createLinearGradient(
    72 * s,
    heroY,
    size - 72 * s,
    heroY + 230 * s,
  )
  heroFill.addColorStop(0, 'rgba(255,255,255,0.08)')
  heroFill.addColorStop(1, 'rgba(255,255,255,0.03)')
  ctx.fillStyle = heroFill
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1.5 * s
  ctx.stroke()

  ctx.fillStyle = 'rgba(251,146,60,0.9)'
  ctx.font = `500 ${18 * s}px Outfit, sans-serif`
  fillTrackedText(ctx, 'SESSIONS', 110 * s, heroY + 52 * s, 4 * s)

  ctx.fillStyle = '#fff7ed'
  ctx.font = `650 ${112 * s}px Fraunces, Georgia, serif`
  ctx.fillText(String(stats.totalSessions), 110 * s, heroY + 155 * s)

  ctx.fillStyle = 'rgba(244,236,227,0.72)'
  ctx.font = `400 ${22 * s}px Outfit, sans-serif`
  const streakLine =
    stats.currentStreak > 0
      ? `${plural(stats.currentStreak, 'day')} in a row · best ${stats.longestStreak}`
      : `Best streak ${plural(stats.longestStreak, 'day')}`
  ctx.fillText(streakLine, 110 * s, heroY + 195 * s)

  // Right-side hero: cumulative time
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(103,232,249,0.9)'
  ctx.font = `500 ${18 * s}px Outfit, sans-serif`
  fillTrackedText(
    ctx,
    'TIME IN',
    size - 110 * s - measureTracked(ctx, 'TIME IN', 4 * s),
    heroY + 52 * s,
    4 * s,
  )
  ctx.fillStyle = '#ecfeff'
  ctx.font = `650 ${56 * s}px Fraunces, Georgia, serif`
  ctx.fillText(
    formatPracticeTime(stats.totalDuration),
    size - 110 * s,
    heroY + 130 * s,
  )
  ctx.fillStyle = 'rgba(244,236,227,0.55)'
  ctx.font = `400 ${20 * s}px Outfit, sans-serif`
  const avgLine =
    stats.averageDuration > 0
      ? `Avg ${formatPracticeTime(stats.averageDuration)} / session`
      : 'Start a session'
  ctx.fillText(avgLine, size - 110 * s, heroY + 175 * s)
  ctx.textAlign = 'left'

  // Stat chips — heat, cold, week (social hooks)
  const chips = [
    {
      label: 'AVG HEAT',
      value: formatAvgTempC(stats.averageHeatC, temperatureUnit),
      tone: 'ember' as const,
    },
    {
      label: 'COLD TIME',
      value:
        stats.totalColdSeconds > 0
          ? formatPracticeTime(stats.totalColdSeconds)
          : '—',
      tone: 'ice' as const,
    },
    {
      label: 'THIS WEEK',
      value: String(stats.sessionsThisWeek),
      tone: 'ember' as const,
    },
  ]

  const chipW = 280 * s
  const chipH = 150 * s
  const gap = 28 * s
  const chipsX = 72 * s
  const chipsY = 630 * s

  chips.forEach((chip, index) => {
    const x = chipsX + index * (chipW + gap)
    roundRect(ctx, x, chipsY, chipW, chipH, 28 * s)
    const chipBg = ctx.createLinearGradient(x, chipsY, x + chipW, chipsY + chipH)
    if (chip.tone === 'ember') {
      chipBg.addColorStop(0, 'rgba(234,88,12,0.28)')
      chipBg.addColorStop(1, 'rgba(28,16,10,0.35)')
    } else {
      chipBg.addColorStop(0, 'rgba(8,145,178,0.28)')
      chipBg.addColorStop(1, 'rgba(7,19,24,0.35)')
    }
    ctx.fillStyle = chipBg
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.stroke()

    ctx.fillStyle = chip.tone === 'ember' ? '#fdba74' : '#67e8f9'
    ctx.font = `500 ${16 * s}px Outfit, sans-serif`
    fillTrackedText(ctx, chip.label, x + 28 * s, chipsY + 48 * s, 3 * s)

    ctx.fillStyle = '#f8f1ea'
    ctx.font = `650 ${44 * s}px Fraunces, Georgia, serif`
    ctx.fillText(chip.value, x + 28 * s, chipsY + 108 * s)
  })

  // Invite line
  ctx.fillStyle = 'rgba(244,236,227,0.5)'
  ctx.font = `400 ${20 * s}px Outfit, sans-serif`
  const invite = stats.favoriteProtocol
    ? `Mostly ${stats.favoriteProtocol} · kyleplathe.com/dev/sauna`
    : 'Try it free · kyleplathe.com/dev/sauna'
  ctx.fillText(invite, 88 * s, 830 * s)

  // Footer
  const stamped = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  ctx.fillStyle = 'rgba(244,236,227,0.45)'
  ctx.font = `400 ${20 * s}px Outfit, sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText(stamped, 88 * s, size - 78 * s)
  ctx.textAlign = 'right'
  ctx.fillText('ember & ice', size - 88 * s, size - 78 * s)
  ctx.textAlign = 'left'

  return canvas
}

export async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((value) => resolve(value), 'image/png'),
  )
  if (!blob) throw new Error('Could not encode share card')
  return blob
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function shareOrDownloadPng(
  blob: Blob,
  filename: string,
  shareText: string,
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' })
  const payload = { files: [file], title: 'Ember & Ice', text: shareText }

  if (typeof navigator.share === 'function' && navigator.canShare?.(payload)) {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }
      // Fall through to download when share is unavailable mid-flight.
    }
  }

  downloadBlob(blob, filename)
  return 'downloaded'
}
