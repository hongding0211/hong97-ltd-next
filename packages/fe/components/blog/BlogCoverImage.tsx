import { policy } from '@utils/image-core.cjs'
import { SiteImage } from '../common/SiteImage'

export function BlogCoverImage({ src, alt }: { src: string; alt: string }) {
  return (
    <SiteImage
      src={src}
      alt={alt}
      fill
      fadeIn
      sizes={policy.sizes.cover}
      loading="eager"
      fetchPriority="high"
      className="rounded-sm object-cover sm:rounded-none"
    />
  )
}
