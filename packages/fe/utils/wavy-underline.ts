export const WAVE_COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  purple: '#a855f7',
} as const

export type WaveColor = keyof typeof WAVE_COLORS

export const normalizeWaveColor = (color: unknown): WaveColor =>
  typeof color === 'string' && Object.hasOwn(WAVE_COLORS, color)
    ? (color as WaveColor)
    : 'blue'

export const wrapWavyUnderline = (content: string, color: unknown) =>
  `<span data-wave="${normalizeWaveColor(color)}">${content}</span>`
