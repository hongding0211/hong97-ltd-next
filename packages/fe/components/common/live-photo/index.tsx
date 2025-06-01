import { cn } from '@/lib/utils'
import type * as LivePhotosKit from 'livephotoskit'
import React, { useEffect, useId, useRef } from 'react'

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
  const exposed = useRef(false)

  const ratio = useRef(1)

  useEffect(() => {
    if (!autoPlay) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !exposed.current) {
            player.current?.play()
            exposed.current = true
          }
        })
      },
      {
        threshold: 0.8,
      },
    )
    observer.observe(document.getElementById(id))

    return () => {
      observer.disconnect()
    }
  }, [autoPlay, id])

  useEffect(() => {
    const fn = async () => {
      if (!livePhotosKit) {
        livePhotosKit = await import('livephotoskit')
      }
      const container = document.getElementById(id)
      const img = document.getElementById(id + 'img')

      if (!container || !img) {
        return
      }

      const waitImgLoad = new Promise((r) => {
        img.addEventListener('load', r)
      })

      const videoArrayBuff = await fetch(videoSrc).then((res) =>
        res.arrayBuffer(),
      )

      // measure the size of the img
      let { width, height } = img.getBoundingClientRect()
      if (width === 0 || height === 0) {
        await waitImgLoad
        ;({ width, height } = img.getBoundingClientRect())
      }
      ratio.current = width / height
      // hide img
      // img.style.opacity = '0'
      // set the width and height of the container
      container.style.width = `${width}px`
      container.style.height = `${height}px`

      player.current = livePhotosKit.augmentElementAsPlayer(
        document.getElementById(id),
        {
          photoSrc: imgSrc,
          videoMimeType: 'video/mp4',
          videoSrc: videoArrayBuff,
        },
      )

      // measure the width of measure elem when it's size changes, set the size of player
      const observer = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const { width } = entry.contentRect
          player.current.updateSize(width, width / ratio.current)
        })
      })
      observer.observe(img)

      return () => {
        observer.disconnect()
      }
    }
    fn()
  }, [id, imgSrc, videoSrc])

  return (
    <div className="relative">
      <div
        id={id}
        className={cn(
          'rounded-sm overflow-hidden absolute top-0 left-0 z-2',
          className,
        )}
      />
      <img
        src={imgSrc}
        alt="live"
        className={cn('rounded-sm !m-0 relative z-1', className)}
        id={id + 'img'}
      />
    </div>
  )
}
