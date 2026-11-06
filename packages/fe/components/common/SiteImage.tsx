import { cn } from '@/lib/utils'
import {
  canTransformImage,
  getImageUrlMeta,
  ossImageLoader,
  policy,
} from '@utils/image-core.cjs'
import { getImagePlaceholder } from '@utils/image-placeholder'
import Image, { type ImageProps } from 'next/image'
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'

export interface SiteImageProps
  extends Omit<ImageProps, 'src' | 'loader' | 'placeholder' | 'blurDataURL'> {
  src: string
  shouldLoad?: boolean
  showPlaceholder?: boolean
  preserveOriginal?: boolean
  /** Preserve an explicitly authored HTML/Markdown srcset without rewriting it. */
  srcSet?: string
  /** Fade the decoded image over its placeholder. Off unless explicitly enabled. */
  fadeIn?: boolean
}
/** Shared delivery/loading policy; callers retain layout and interaction. */
export const SiteImage = forwardRef<HTMLImageElement, SiteImageProps>(
  function SiteImage(
    {
      src,
      alt,
      shouldLoad = true,
      showPlaceholder = true,
      preserveOriginal = false,
      srcSet,
      fadeIn = false,
      fill,
      width,
      height,
      sizes = policy.sizes.body,
      className,
      style,
      onError,
      onLoad,
      onTransitionEnd,
      unoptimized,
      ...props
    },
    ref,
  ) {
    const meta = getImageUrlMeta(src)
    const placeholder = useMemo(
      () => (showPlaceholder ? getImagePlaceholder(src) : undefined),
      [src, showPlaceholder],
    )
    const [failedSrc, setFailedSrc] = useState<string | null>(null)
    const [decodedKey, setDecodedKey] = useState<string | null>(null)
    const [settledKey, setSettledKey] = useState<string | null>(null)
    const decodedImage = useRef<HTMLImageElement | null>(null)
    const imageKey = `${src}:${failedSrc === src}`
    const imageWidth = width ?? meta?.width
    const imageHeight = height ?? meta?.height
    const canFade = Boolean(
      fadeIn && !srcSet && placeholder && (fill || (imageWidth && imageHeight)),
    )
    const useNative =
      !shouldLoad || Boolean(srcSet) || (!fill && (!imageWidth || !imageHeight))
    const decoded = decodedKey === imageKey
    useEffect(() => {
      if (!canFade || !decoded) return
      // Covers a cancelled transition or an overriding transition style too.
      const timer = setTimeout(() => {
        const image = decodedImage.current
        if (image?.isConnected && Number(getComputedStyle(image).opacity) === 1)
          setSettledKey(imageKey)
      }, 240)
      return () => clearTimeout(timer)
    }, [canFade, decoded, imageKey])
    const handleLoad: ImageProps['onLoad'] = (event) => {
      if (canFade || useNative) {
        decodedImage.current = event.currentTarget
        setDecodedKey(imageKey)
        if (
          canFade &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        )
          setSettledKey(imageKey)
      }
      onLoad?.(event)
    }
    const optimized =
      !preserveOriginal &&
      !srcSet &&
      !unoptimized &&
      canTransformImage(src) &&
      failedSrc !== src &&
      shouldLoad &&
      Boolean(fill || (imageWidth && imageHeight))
    const handleError: ImageProps['onError'] = (event) => {
      if (optimized) {
        setFailedSrc(src)
        return
      }
      onError?.(event)
    }
    // Preserve natural sizing for legacy URLs without dimensions. Dormant images
    // render an inline placeholder without starting a network request.
    if (useNative) {
      return (
        <img
          {...props}
          ref={ref}
          src={shouldLoad ? src : undefined}
          srcSet={shouldLoad ? srcSet : undefined}
          sizes={srcSet ? sizes : undefined}
          alt={alt}
          width={imageWidth}
          height={imageHeight}
          decoding="async"
          className={className}
          onError={handleError}
          onLoad={handleLoad}
          onTransitionEnd={onTransitionEnd}
          style={{
            ...(fill
              ? ({
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                } as const)
              : {}),
            ...style,
            ...(placeholder && (!shouldLoad || !decoded)
              ? {
                  backgroundImage: `url("${placeholder}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : {}),
          }}
        />
      )
    }
    const image = (
      <Image
        {...props}
        ref={ref}
        key={imageKey}
        src={src}
        alt={alt}
        loader={ossImageLoader}
        unoptimized={!optimized}
        fill={fill}
        width={fill ? undefined : imageWidth}
        height={fill ? undefined : imageHeight}
        sizes={sizes}
        placeholder={placeholder && !canFade ? 'blur' : 'empty'}
        blurDataURL={placeholder}
        onError={handleError}
        onLoad={handleLoad}
        onTransitionEnd={(event) => {
          if (
            canFade &&
            event.target === event.currentTarget &&
            event.propertyName === 'opacity' &&
            Number(getComputedStyle(event.currentTarget).opacity) === 1
          )
            setSettledKey(imageKey)
          onTransitionEnd?.(event)
        }}
        className={cn(
          className,
          canFade &&
            'transition-opacity duration-200 ease-out motion-reduce:transition-none',
        )}
        style={{ ...style, ...(canFade ? { opacity: decoded ? 1 : 0 } : {}) }}
      />
    )
    if (!canFade) return image
    return (
      <span
        data-image-fade=""
        style={
          fill
            ? { position: 'absolute', inset: 0 }
            : {
                position: 'relative',
                display: 'inline-block',
                width: style?.width ?? imageWidth,
                maxWidth: '100%',
                verticalAlign: 'top',
              }
        }
      >
        <img
          data-image-placeholder=""
          src={placeholder}
          alt=""
          aria-hidden="true"
          width={imageWidth}
          height={imageHeight}
          className={className}
          style={{
            ...style,
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            visibility: settledKey === imageKey ? 'hidden' : 'visible',
          }}
        />
        {image}
        <noscript>
          <style>
            {'[data-image-fade] img[data-nimg] { opacity: 1 !important; }'}
          </style>
        </noscript>
      </span>
    )
  },
)
