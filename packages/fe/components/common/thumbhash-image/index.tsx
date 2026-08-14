import { cn } from '@/lib/utils'
import { getImageUrlMeta } from '@utils/oss'
import { useEffect, useRef, useState } from 'react'
import { thumbHashToRGBA } from 'thumbhash'

interface ThumbHashImageProps {
  src: string
  alt: string
  shouldLoad: boolean
  showThumbHash: boolean
  className?: string
}

const base64UrlToBytes = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export function ThumbHashImage({
  src,
  alt,
  shouldLoad,
  showThumbHash,
  className,
}: ThumbHashImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const imageMeta = getImageUrlMeta(src)!
  const loaded = loadedSrc === src

  useEffect(() => {
    if (!showThumbHash) return

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const { w, h, rgba } = thumbHashToRGBA(
      base64UrlToBytes(imageMeta.thumbHash),
    )
    canvas.width = w
    canvas.height = h
    context.putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0)
  }, [imageMeta.thumbHash, showThumbHash])

  return (
    <>
      {showThumbHash && (
        <canvas
          ref={canvasRef}
          className={cn(
            'pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-lg transition-opacity duration-200',
            loaded ? 'opacity-0' : 'opacity-100',
          )}
        />
      )}
      <img
        src={shouldLoad ? src : undefined}
        width={imageMeta.width}
        height={imageMeta.height}
        alt={alt}
        decoding="async"
        onLoad={() => setLoadedSrc(src)}
        className={cn(
          className,
          showThumbHash && 'transition-opacity duration-200',
          showThumbHash && !loaded && 'opacity-0',
          !showThumbHash && !shouldLoad && 'invisible',
        )}
      />
    </>
  )
}
