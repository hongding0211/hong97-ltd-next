import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel'
import { cn } from '@/lib/utils'
import Autoplay from 'embla-carousel-autoplay'
import { Circle } from 'lucide-react'
import photoswipe from 'photoswipe'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import React, { useEffect, useId, useRef, useState } from 'react'
import { LivePhoto } from '../live-photo'

type Image = {
  img: string
  video?: string
  autoPlay?: boolean
  caption?: string
}

const isLivePhoto = (image: Image) => {
  return image.video !== undefined
}

const MonoImage: React.FC<{
  img: Image
  galleryId?: string
  idx?: number
}> = (props) => {
  const { img, galleryId, idx } = props

  const [imgMeta, setImgMeta] = useState<{
    width: number
    height: number
  } | null>(null)

  const id = useId()

  useEffect(() => {
    const i = new Image()
    i.src = img.img
    i.onload = () => {
      setImgMeta({
        width: i.width,
        height: i.height,
      })
    }
  }, [img, galleryId])

  if (isLivePhoto(img)) {
    return (
      <LivePhoto
        imgSrc={img.img}
        videoSrc={img.video}
        autoPlay={img.autoPlay}
      />
    )
  }

  return (
    <a
      data-pswp-src={img.img}
      data-pswp-width={imgMeta?.width}
      data-pswp-height={imgMeta?.height}
      key={galleryId + '-' + idx}
      target="_blank"
      rel="noreferrer"
      className="cursor-pointer"
    >
      <img src={img.img} className="rounded-sm !my-0 z-2 relative" alt={id} />
    </a>
  )
}

interface ImagesV2Props {
  images: Image[]
  caption?: string
  autoLoop?: boolean
  loopSpan?: number
  markdown?: boolean
  onIndexChange?: (idx: number) => void
}

export const ImagesV2: React.FC<ImagesV2Props> = (props) => {
  const {
    images,
    caption,
    autoLoop,
    loopSpan = 3000,
    markdown,
    onIndexChange,
  } = props

  const [idx, setIdx] = useState(0)
  const [api, setApi] = useState<CarouselApi | null>(null)

  const galleryId = useRef(
    (() => {
      const urls = images.map((img) => img.img).join('')
      let hash = 0
      for (let i = 0; i < urls.length; i++) {
        hash = (hash << 5) - hash + urls.charCodeAt(i)
        hash = hash & hash
      }
      return `gallery-${Math.abs(hash).toString(36).replace(/[0-9]/g, '')}`
    })(),
  ).current

  const _caption = images?.[idx]?.caption ?? caption

  useEffect(() => {
    if (!api) {
      return
    }
    const fn = () => {
      setIdx(api.selectedScrollSnap())
    }
    api.on('select', fn)
    return () => {
      api.off('select', fn)
    }
  }, [api])

  useEffect(() => {
    onIndexChange?.(idx)
  }, [idx, onIndexChange])

  useEffect(() => {
    let lightbox = new PhotoSwipeLightbox({
      gallery: '#' + galleryId,
      children: 'a',
      pswpModule: photoswipe,
      zoom: false,
      close: false,
      arrowPrev: false,
      arrowNext: false,
      bgOpacity: 0.95,
    })
    lightbox.init()
    const handlerFn = (e: any) => {
      if (typeof e?.content?.index === 'number') {
        api?.scrollTo?.(e.content.index, true)
      }
    }
    lightbox.on('contentActivate', handlerFn)

    return () => {
      lightbox.destroy()
      lightbox.off('contentActivate', handlerFn)
      lightbox = null
    }
  }, [galleryId, api, images])

  if (!images.length) {
    return null
  }

  if (images.length === 1) {
    return (
      <div className="pswp-gallery" id={galleryId}>
        <div
          className={cn(
            'flex flex-col items-center gap-2',
            markdown && 'w-full sm:w-[75%] mx-auto my-5',
          )}
        >
          <MonoImage img={images[0]} galleryId={galleryId} idx={0} />
          {_caption && (
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {_caption}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="pswp-gallery" id={galleryId}>
      <div
        className={cn(
          'flex flex-col items-center gap-y-2',
          markdown && 'w-full sm:w-[75%] mx-auto my-5',
        )}
      >
        <div className="relative">
          <Carousel
            opts={{
              loop: true,
            }}
            plugins={
              autoLoop
                ? [
                    Autoplay({
                      delay: loopSpan,
                    }),
                  ]
                : []
            }
            setApi={setApi}
          >
            <CarouselContent>
              {images.map((image, index) => (
                <CarouselItem key={index}>
                  <MonoImage img={image} galleryId={galleryId} idx={index} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          <div className="text-neutral-200 absolute flex items-center justify-center gap-x-1.5 w-full bottom-4">
            {Array.from({ length: images.length }).map((_, index) => (
              <Circle
                key={index}
                className={
                  index === idx ? 'w-1.5 h-1.5' : 'w-1.5 h-1.5 opacity-50'
                }
                fill="currentColor"
              />
            ))}
          </div>
        </div>
        {_caption && (
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            {_caption}
          </div>
        )}
      </div>
    </div>
  )
}
