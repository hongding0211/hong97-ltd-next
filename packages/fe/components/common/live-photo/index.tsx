import { cn } from '@/lib/utils'
import { runOnClient } from '@utils/run-on-client'
// @ts-ignore
import type * as LivePhotosKit from 'LivePhotosKit'
import React, { useEffect, useId, useRef } from 'react'

let livePhotosKit: typeof LivePhotosKit

runOnClient(() => {
  import('LivePhotosKit').then((mod) => {
    livePhotosKit = mod
  })
})

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
    if (!livePhotosKit) {
      return
    }
    const container = document.getElementById(id)
    const img = document.getElementById(id + 'img')

    if (!container || !img) {
      return
    }

    // measure the size of the img
    const { width, height } = img.getBoundingClientRect()
    ratio.current = width / height
    // hide img
    img.style.opacity = '0'
    // set the width and height of the container
    container.style.width = `${width}px`
    container.style.height = `${height}px`

    player.current = livePhotosKit.augmentElementAsPlayer(
      document.getElementById(id),
      {
        photoSrc: imgSrc,
        videoSrc,
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
  }, [id, imgSrc, videoSrc])

  return (
    <div className="relative">
      <div
        id={id}
        className={cn(
          'rounded-sm overflow-hidden absolute top-0 left-0',
          className,
        )}
      />
      <img
        src={imgSrc}
        alt="live"
        className={cn('rounded-sm !m-0', className)}
        id={id + 'img'}
      />
    </div>
  )
}
