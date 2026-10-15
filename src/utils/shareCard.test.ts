import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionStats } from '../types/timer'
import {
  formatPracticeTime,
  renderShareStatsCard,
  shareOrDownloadPng,
} from './shareCard'

describe('formatPracticeTime', () => {
  it('formats seconds, minutes, and hours', () => {
    expect(formatPracticeTime(45)).toBe('45s')
    expect(formatPracticeTime(120)).toBe('2m')
    expect(formatPracticeTime(3900)).toBe('1h 5m')
    expect(formatPracticeTime(7200)).toBe('2h')
  })
})

describe('shareOrDownloadPng', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shares when the Web Share API accepts files', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      share,
      canShare: () => true,
    })

    const result = await shareOrDownloadPng(
      new Blob(['x'], { type: 'image/png' }),
      'ember-ice-stats.png',
      'My progress',
    )

    expect(result).toBe('shared')
    expect(share).toHaveBeenCalledOnce()
  })

  it('falls back when canShare rejects files', async () => {
    const share = vi.fn()
    vi.stubGlobal('navigator', {
      share,
      canShare: () => false,
    })

    // Avoid touching real DOM download — stub download path via createElement.
    const click = vi.fn()
    const anchor = { click, href: '', download: '' }
    const doc = {
      createElement: vi.fn(() => anchor),
    }
    vi.stubGlobal('document', doc)
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:mock',
      revokeObjectURL: vi.fn(),
    })

    const result = await shareOrDownloadPng(
      new Blob(['x'], { type: 'image/png' }),
      'ember-ice-stats.png',
      'My progress',
    )

    expect(result).toBe('downloaded')
    expect(share).not.toHaveBeenCalled()
    expect(click).toHaveBeenCalledOnce()
  })
})

describe('renderShareStatsCard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('composites grain over the dark plate instead of replacing it', async () => {
    const log: string[] = []
    let canvasIndex = 0

    const createCanvas = () => {
      const kind = canvasIndex++ === 0 ? 'card' : 'grain'
      const gradient = { addColorStop() {} }
      const ctx = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: 'left' as CanvasTextAlign,
        globalCompositeOperation: 'source-over',
        createLinearGradient: () => gradient,
        createRadialGradient: () => gradient,
        fillRect() {
          log.push(`${kind}:fillRect`)
        },
        beginPath() {},
        arc() {},
        fill() {},
        save() {},
        restore() {},
        createImageData(w: number, h: number) {
          return { data: new Uint8ClampedArray(w * h * 4) }
        },
        putImageData() {
          log.push(`${kind}:putImageData`)
        },
        drawImage() {
          log.push(`${kind}:drawImage:${ctx.globalCompositeOperation}`)
        },
        moveTo() {},
        arcTo() {},
        closePath() {},
        stroke() {},
        fillText() {},
        measureText(text: string) {
          return { width: text.length * 8 }
        },
      }
      return {
        width: 0,
        height: 0,
        getContext: () => ctx,
      }
    }

    vi.stubGlobal('document', {
      createElement: () => createCanvas(),
      fonts: { ready: Promise.resolve() },
    })

    const stats: SessionStats = {
      totalSessions: 4,
      totalDuration: 3600,
      currentStreak: 2,
      longestStreak: 5,
      sessionsThisWeek: 1,
      sessionsThisMonth: 3,
    }

    await renderShareStatsCard(stats, { size: 16 })

    expect(log).toContain('card:fillRect')
    expect(log).toContain('grain:putImageData')
    expect(log).toContain('card:drawImage:soft-light')
    expect(log).not.toContain('card:putImageData')
    expect(log.indexOf('card:fillRect')).toBeLessThan(
      log.indexOf('card:drawImage:soft-light'),
    )
  })
})
