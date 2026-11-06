import { SiteImage } from '../SiteImage'

/** Compatibility wrapper for existing MDX/image blocks. */
export function ThumbHashImage({
  src,
  alt,
  shouldLoad,
  showThumbHash,
  className,
}: {
  src: string
  alt: string
  shouldLoad: boolean
  showThumbHash: boolean
  className?: string
}) {
  return (
    <SiteImage
      src={src}
      alt={alt}
      shouldLoad={shouldLoad}
      showPlaceholder={showThumbHash}
      className={className}
    />
  )
}
