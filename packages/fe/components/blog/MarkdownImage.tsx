import type { ComponentPropsWithoutRef } from 'react'
import { SiteImage } from '../common/SiteImage'

const dimension = (value: string | number | undefined) => {
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : undefined
}

/** Native Markdown images share delivery policy without changing their markup. */
export function MarkdownImage({
  src,
  alt = '',
  width,
  height,
  style,
  ...props
}: ComponentPropsWithoutRef<'img'>) {
  if (typeof src !== 'string' || !src) return null
  const imageWidth = dimension(width)
  const imageHeight = dimension(height)
  return (
    <SiteImage
      {...props}
      src={src}
      alt={alt}
      width={imageWidth}
      height={imageHeight}
      style={{
        ...style,
        ...(width && !imageWidth ? { width } : {}),
        ...(height && !imageHeight ? { height } : {}),
      }}
    />
  )
}
