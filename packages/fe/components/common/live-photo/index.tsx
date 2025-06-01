import React, { useCallback, useEffect, useRef, useState } from 'react'

interface LivePhotoProps {
  imgSrc: string
  videoSrc: string
  autoPlay?: boolean
}

const LIVE_SVG = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    <path d="M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0" />
    <path d="M15.9 20.11l0 .01" />
    <path d="M19.04 17.61l0 .01" />
    <path d="M20.77 14l0 .01" />
    <path d="M20.77 10l0 .01" />
    <path d="M19.04 6.39l0 .01" />
    <path d="M15.9 3.89l0 .01" />
    <path d="M12 3l0 .01" />
    <path d="M8.1 3.89l0 .01" />
    <path d="M4.96 6.39l0 .01" />
    <path d="M3.23 10l0 .01" />
    <path d="M3.23 14l0 .01" />
    <path d="M4.96 17.61l0 .01" />
    <path d="M8.1 20.11l0 .01" />
    <path d="M12 21l0 .01" />
  </svg>
)

export const LivePhoto: React.FC<LivePhotoProps> = (props) => {
  const { imgSrc, videoSrc, autoPlay = false } = props

  const [videoShow, setVideoShow] = useState(false)

  const imgRef = useRef<HTMLImageElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const tagRef = useRef<HTMLDivElement>(null)

  const exposed = useRef(false)

  const play = useCallback(() => {
    if (videoRef.current?.currentTime > 0) {
      videoRef.current.currentTime = 0
    }
    videoRef.current?.play()
    const fn = setVideoShow.bind(null, true)
    videoRef.current?.addEventListener('canplay', () => {
      fn()
      videoRef.current?.removeEventListener('canplay', fn)
    })
    videoRef.current!.muted = false
  }, [])

  const pause = useCallback(() => {
    setVideoShow(false)
    videoRef.current?.pause()
  }, [])

  useEffect(() => {
    tagRef.current?.addEventListener('mouseover', play)
    tagRef.current?.addEventListener('mouseout', pause)
    tagRef.current?.addEventListener('click', play)
    videoRef.current?.addEventListener('ended', pause)
    return () => {
      tagRef.current?.removeEventListener('mouseover', play)
      tagRef.current?.removeEventListener('mouseout', pause)
      tagRef.current?.removeEventListener('click', play)
    }
  }, [play, pause])

  useEffect(() => {
    if (!autoPlay) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !exposed.current) {
            exposed.current = true
            play()
          }
        })
      },
      {
        threshold: 0.8,
      },
    )

    if (videoRef.current) {
      observer.observe(videoRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [autoPlay, play])

  return (
    <div className="relative">
      <img alt="live" src={imgSrc} ref={imgRef} />
      <video
        autoPlay={false}
        src={videoSrc}
        ref={videoRef}
        className="absolute top-0 left-0 transition-opacity duration-300"
        style={{
          opacity: videoShow ? 1 : 0,
        }}
      />
      <div
        ref={tagRef}
        className="cursor-pointer flex items-center gap-0.5 absolute top-2 left-2 px-1 py-0.5 text-xs font-medium rounded bg-white/70 text-black backdrop-blur-md"
      >
        {LIVE_SVG}
        LIVE
      </div>
    </div>
  )
}
