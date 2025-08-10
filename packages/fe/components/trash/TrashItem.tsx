import { TrashResponseDto } from '@services/trash/types'
import { time } from '@utils/time'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'

interface TrashItemProps {
  item: TrashResponseDto
}

// 图片骨架屏组件
const ImageSkeleton = () => (
  <div className="w-full h-full bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded-md" />
)

// 带骨架屏的图片组件
const ImageWithSkeleton: React.FC<{
  src: string
  alt: string
  className?: string
}> = ({ src, alt, className }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  return (
    <div className="aspect-square relative">
      {loading && <ImageSkeleton />}
      <img
        src={src}
        alt={alt}
        className={`${className} ${
          loading ? 'opacity-0' : 'opacity-100'
        } transition-opacity duration-200`}
        loading="lazy"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false)
          setError(true)
        }}
      />
      {error && !loading && (
        <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700 rounded-md flex items-center justify-center">
          <span className="text-neutral-500 text-xs">Failed to load</span>
        </div>
      )}
    </div>
  )
}

export function TrashItem({ item }: TrashItemProps) {
  const { i18n } = useTranslation()

  // 设置时间工具的语言
  useEffect(() => {
    time.setLocale(i18n.language)
  }, [i18n.language])

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-700 py-4 last:border-b-0">
      <div className="space-y-3">
        {/* 内容 */}
        {item.content && (
          <div className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">
            {item.content}
          </div>
        )}

        {/* 图片 */}
        {item.media && item.media.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 gap-x-1.5">
            {item.media.map((media, index) => (
              <ImageWithSkeleton
                key={index}
                src={media.imageUrl}
                alt={`Media ${index + 1}`}
                className="w-full h-full object-cover rounded-md bg-neutral-100 dark:bg-neutral-800"
              />
            ))}
          </div>
        )}

        {/* 标签 */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 时间 */}
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          {time.formatDynamic(item.timestamp)}
        </div>
      </div>
    </div>
  )
}
