export type ImageUrlMeta = { width: number; height: number; thumbHash: string }
export type ImagePreset = 'cover' | 'body' | 'trash' | 'avatar'
export const policy: {
  extensions: Record<string, string>
  preserveTypes: string[]
  metadataMaxEdge: number
  deliveryQuality: number
  cacheControl: string
  ossHost: string
  metadataHeaders: Record<'width' | 'height' | 'thumbHash', string>
  presets: Record<ImagePreset, { quality: number; maxWidth: number }>
  sizes: { cover: string; body: string; thumbnail: string }
}
export function getImageUrlMeta(src: string): ImageUrlMeta | null
export function appendImageUrlMeta(src: string, meta: ImageUrlMeta): string
export function canTransformImage(src: string): boolean
export function getOssImageVariant(src: string, width: number): string
export function ossImageLoader(props: {
  src: string
  width: number
  quality?: number
}): string

export function imageMetaFromRgba(
  width: number,
  height: number,
  thumbWidth: number,
  thumbHeight: number,
  rgba: Uint8Array | Uint8ClampedArray,
  encoder: (
    width: number,
    height: number,
    rgba: Uint8Array | Uint8ClampedArray,
  ) => Uint8Array,
): ImageUrlMeta
export function imageMimeFromBytes(bytes: Uint8Array): string | null
