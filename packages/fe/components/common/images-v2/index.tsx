import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'
import { Circle } from 'lucide-react'
import React, { useEffect, useId, useState } from 'react'
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
}> = (props) => {
  const { img } = props

  const id = useId()

  if (isLivePhoto(img)) {
    return (
      <LivePhoto
        imgSrc={img.img}
        videoSrc={img.video}
        autoPlay={img.autoPlay}
      />
    )
  }

  return <img src={img.img} className="rounded-sm" alt={id} />
}

interface ImagesV2Props {
  images: Image[]
  caption?: string
  autoLoop?: boolean
  loopSpan?: number
}

export const ImagesV2: React.FC<ImagesV2Props> = (props) => {
  const { images, caption, autoLoop, loopSpan = 3000 } = props

  const [idx, setIdx] = useState(0)
  const [api, setApi] = useState<CarouselApi | null>(null)

  const _caption = images[idx].caption ?? caption

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

  if (!images.length) {
    return null
  }

  if (images.length === 1) {
    return (
      <div className="flex flex-col items-center gap-2">
        <MonoImage img={images[0]} />
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {_caption}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-y-3">
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
                <MonoImage img={image} />
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
      <div className="text-sm text-neutral-600 dark:text-neutral-400">
        {_caption}
      </div>
    </div>
  )
}
