import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatPracticeTime, shareOrDownloadPng } from './shareCard'

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
