import { TrashResponseDto } from '@services/trash/types'
import { time } from '@utils/time'
import { useTranslation } from 'next-i18next'
import { useEffect } from 'react'

interface TrashItemProps {
  item: TrashResponseDto
}

export function TrashItem({ item }: TrashItemProps) {
  const { i18n } = useTranslation()

  // 设置时间工具的语言
  useEffect(() => {
    time.setLocale(i18n.language)
  }, [i18n.language])

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 py-4 last:border-b-0">
      <div className="space-y-3">
        {/* 内容 */}
        <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
          {item.content}
        </div>

        {/* 图片 */}
        {item.media && item.media.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {item.media.map((media, index) => (
              <div key={index} className="aspect-square">
                <img
                  src={media.imageUrl}
                  alt={`Media ${index + 1}`}
                  className="w-full h-full object-cover rounded"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* 标签 */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 时间 */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {time.formatDynamic(item.timestamp)}
        </div>
      </div>
    </div>
  )
}
