import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { SessionStats } from '../../types/timer'
import { DownloadIcon, ShareIcon } from '../Icons'
import {
  canvasToPngBlob,
  downloadBlob,
  renderShareStatsCard,
  shareOrDownloadPng,
} from '../../utils/shareCard'

interface ShareStatsCardProps {
  stats: SessionStats
}

type Status = 'idle' | 'working' | 'shared' | 'saved' | 'error'

export function ShareStatsCard({ stats }: ShareStatsCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    let revoked = false
    let objectUrl: string | null = null

    const render = async () => {
      try {
        const canvas = await renderShareStatsCard(stats)
        const blob = await canvasToPngBlob(canvas)
        objectUrl = URL.createObjectURL(blob)
        if (!revoked) setPreviewUrl(objectUrl)
      } catch {
        if (!revoked) setStatus('error')
      }
    }

    void render()

    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [stats])

  const withFreshBlob = async () => {
    const canvas = await renderShareStatsCard(stats)
    return canvasToPngBlob(canvas)
  }

  const handleSave = async () => {
    setStatus('working')
    try {
      const blob = await withFreshBlob()
      downloadBlob(blob, 'ember-ice-stats.png')
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  const handleShare = async () => {
    setStatus('working')
    try {
      const blob = await withFreshBlob()
      const result = await shareOrDownloadPng(
        blob,
        'ember-ice-stats.png',
        'My Ember & Ice contrast therapy progress',
      )
      setStatus(result === 'shared' ? 'shared' : 'saved')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatus('idle')
        return
      }
      setStatus('error')
    }
  }

  const statusLabel =
    status === 'working'
      ? 'Preparing…'
      : status === 'shared'
        ? 'Opened share sheet'
        : status === 'saved'
          ? 'Saved to your photos/files'
          : status === 'error'
            ? 'Could not create the card'
            : 'Square · 1080×1080 · ready for Instagram'

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-2 overflow-hidden rounded-[2rem] border border-orange-500/15 bg-gradient-to-br from-[#1a100c] via-[#12100e] to-[#071318] p-5 text-stone-100 shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.28em] text-orange-400 uppercase">
            Share card
          </p>
          <h3 className="font-display mt-1 text-3xl">Your practice, postcarded</h3>
          <p className="mt-1 max-w-md text-sm text-stone-400">
            A square graphic of your current stats — save the photo or share it
            straight to socials.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={status === 'working'}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-medium backdrop-blur transition hover:bg-white/15 disabled:opacity-60"
          >
            <DownloadIcon className="h-4 w-4" />
            Save photo
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={status === 'working'}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
          >
            <ShareIcon className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <div className="relative aspect-square w-full max-w-[22rem] overflow-hidden rounded-[1.6rem] bg-black/40 shadow-[0_18px_50px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Ember & Ice stats share card preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[16rem] items-center justify-center text-sm text-stone-400">
              Rendering card…
            </div>
          )}
        </div>
        <p className="text-sm text-stone-400 sm:pt-2">{statusLabel}</p>
      </div>
    </motion.section>
  )
}
