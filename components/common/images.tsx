import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'

export const Images: React.FC<{
  imgs: Array<{
    src: string
    alt: string
  }>
  caption?: string
}> = ({ imgs, caption }) => {
  if (!imgs.length) {
    return null
  }
  return (
    <figure>
      <Carousel
        opts={{
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 3000,
          }),
        ]}
      >
        <CarouselContent>
          {imgs.map((img) => (
            <CarouselItem key={img.src}>
              <img src={img.src} alt={img.alt} className="!my-0 rounded" />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {caption && <figcaption className="text-center">{caption}</figcaption>}
    </figure>
  )
}
