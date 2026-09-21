import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function FlameIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 3c1.5 3 2 5 1 8 2-1 4 .5 4 3.5A5 5 0 0 1 7 14c0-3.5 3-6 5-11z" />
    </svg>
  )
}

export function SnowflakeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 3v18M5 7l14 10M5 17 19 7M4 12h16" />
    </svg>
  )
}

export function ShowerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M7 4h7a4 4 0 0 1 4 4v2H9" />
      <path d="M8 14v.01M12 14v.01M16 14v.01M8 18v.01M12 18v.01M16 18v.01" />
    </svg>
  )
}

export function LeafIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M5 19c8-1 13-8 14-14-6 1-13 6-14 14z" />
      <path d="M8 16c2-3 5-6 9-8" />
    </svg>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M8 6v12l10-6-10-6z" />
    </svg>
  )
}

export function PauseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M8 6h3v12H8zM13 6h3v12h-3z" />
    </svg>
  )
}

export function SkipIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M6 6v12l8-6-8-6zM18 6v12" />
    </svg>
  )
}

export function StopIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  )
}

export function AppleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M16 7c1.2.2 2.4 1.4 2.7 3-.9.5-1.7 1.6-1.6 3 .1 1.6 1.3 2.5 2.2 2.8-.8 2.2-2.2 5.4-4.3 5.4-1.1 0-1.4-.7-2.7-.7s-1.6.7-2.7.7c-2 0-4.4-4.2-4.4-7.6C5.2 10 7 8 9.2 8c1.2 0 2 .7 2.7.7S13.5 8 14.6 8c.5 0 1 0 1.4-.2C15.4 6.4 14 5 12.7 5 11 5 10 6.2 9.7 6.4" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}
