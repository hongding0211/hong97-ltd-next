import { thumbHashToDataURL } from 'thumbhash'

/** Tiny inline PNG generated during SSR; never fetches or decodes the source image. */
export function getImagePlaceholder(src: string): string | undefined {
  try {
    const hash = new URLSearchParams(src.split('#', 2)[1] ?? '').get('th')
    if (!hash || hash.length > 128 || !/^[A-Za-z0-9_-]+$/.test(hash)) return
    const base64 = hash.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    if (binary.length < 5) return
    return thumbHashToDataURL(
      Uint8Array.from(binary, (character) => character.charCodeAt(0)),
    )
  } catch {
    return
  }
}
