import { cn } from '@/lib/utils'
import type * as LivePhotosKit from 'livephotoskit'
import React, { useEffect, useId, useRef } from 'react'
import { SiteImage } from '../SiteImage'

let livePhotosKit: typeof LivePhotosKit

interface LivePhotoProps {
  imgSrc: string
  videoSrc: string
  autoPlay?: boolean
  className?: string
}

export const LivePhoto: React.FC<LivePhotoProps> = (props) => {
  const { imgSrc, videoSrc, autoPlay = true, className } = props

  const id = useId()

  const player = useRef<LivePhotosKit.Player | null>(null)

  useEffect(() => {
    let disposed = false
    let resizeObserver: ResizeObserver | undefined
    let visibilityObserver: IntersectionObserver | undefined
    let instance: LivePhotosKit.Player | undefined
    const controller = new AbortController()

    const initialize = async () => {
      livePhotosKit ??= await import('livephotoskit')
      if (disposed) return
      const container = document.getElementById(id)
      const img = document.getElementById(id + 'img') as HTMLImageElement | null
      if (!container || !img) return

      const [video] = await Promise.all([
        fetch(videoSrc, { signal: controller.signal }).then((response) => {
          if (!response.ok) throw new Error('Live Photo video unavailable')
          return response.arrayBuffer()
        }),
        img.complete ? Promise.resolve() : img.decode(),
      ])
      if (disposed || !img.naturalWidth) return
      const { width, height } = img.getBoundingClientRect()
      if (!width || !height) return
      const ratio = width / height
      container.style.width = `${width}px`
      container.style.height = `${height}px`
      instance = livePhotosKit.augmentElementAsPlayer(container, {
        photoSrc: imgSrc,
        videoMimeType: 'video/mp4',
        videoSrc: video,
      })
      player.current = instance
      resizeObserver = new ResizeObserver(([entry]) => {
        const width = entry.contentRect.width
        if (disposed || !width) return
        container.style.width = `${width}px`
        container.style.height = `${width / ratio}px`
        instance?.updateSize(width, width / ratio)
      })
      resizeObserver.observe(img)
      if (autoPlay) {
        visibilityObserver = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return
            instance?.play()
            visibilityObserver?.disconnect()
          },
          { threshold: 0.8 },
        )
        visibilityObserver.observe(container)
      }
    }
    // Keep the original still image usable if the video cannot be loaded.
    void initialize().catch(() => {})
    return () => {
      disposed = true
      controller.abort()
      resizeObserver?.disconnect()
      visibilityObserver?.disconnect()
      instance?.stop()
      if (player.current === instance) player.current = null
    }
  }, [id, imgSrc, videoSrc, autoPlay])

  return (
    <div className="relative">
      <div
        id={id}
        className={cn(
          'rounded-sm overflow-hidden absolute top-0 left-0 z-2',
          className,
        )}
      />
      <SiteImage
        preserveOriginal
        loading="eager"
        src={imgSrc}
        alt="live"
        className={cn('rounded-sm !m-0 relative z-1', className)}
        id={id + 'img'}
      />
    </div>
  )
}
