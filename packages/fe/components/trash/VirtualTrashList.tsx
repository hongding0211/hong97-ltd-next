import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TrashResponseDto } from '../../services/trash/types'
import { TrashItem } from './TrashItem'

interface VirtualTrashListProps {
  items: TrashResponseDto[]
  hasMore: boolean
  loading: boolean
  isAdmin: boolean
  loadMore: () => void
  onDelete: (itemId: string) => void
  onLikeUpdate: (itemId: string, newItem: TrashResponseDto) => void
  onCommentUpdate: (itemId: string, newItem: TrashResponseDto) => void
}

const TRASH_TIME_ZONE = 'Asia/Shanghai'
const ESTIMATED_ITEM_HEIGHT = 360
const LOADER_HEIGHT = 52

function getTrashYear(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TRASH_TIME_ZONE,
    year: 'numeric',
  }).format(new Date(timestamp))
}

function formatTrashYear(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(
    locale.startsWith('cn') || locale.startsWith('zh') ? 'zh-CN' : 'en-US',
    {
      timeZone: TRASH_TIME_ZONE,
      year: 'numeric',
    },
  ).format(new Date(timestamp))
}

export function VirtualTrashList({
  items,
  hasMore,
  loading,
  isAdmin,
  loadMore,
  onDelete,
  onLikeUpdate,
  onCommentUpdate,
}: VirtualTrashListProps) {
  const { t, i18n } = useTranslation('trash')
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  const currentYear = getTrashYear(Date.now())
  const rowCount = items.length + (hasMore ? 1 : 0)

  const getItemKey = useCallback(
    (index: number) => items.at(index)?._id ?? 'trash-loader',
    [items],
  )
  const estimateSize = useCallback(
    (index: number) =>
      index === items.length ? LOADER_HEIGHT : ESTIMATED_ITEM_HEIGHT,
    [items.length],
  )

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize,
    getItemKey,
    overscan: 4,
    scrollMargin,
    initialRect: { width: 672, height: 900 },
  })
  const virtualRows = virtualizer.getVirtualItems()

  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const updateScrollMargin = () => {
      setScrollMargin(list.getBoundingClientRect().top + window.scrollY)
    }
    updateScrollMargin()

    const resizeObserver = new ResizeObserver(updateScrollMargin)
    resizeObserver.observe(list.parentElement ?? list)
    window.addEventListener('resize', updateScrollMargin)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateScrollMargin)
    }
  }, [])

  useEffect(() => {
    const lastRow = virtualRows.at(-1)
    if (!lastRow || !hasMore || loading || lastRow.index < items.length) {
      return
    }
    loadMore()
  }, [hasMore, items.length, loadMore, loading, virtualRows])

  return (
    <div
      ref={listRef}
      className="relative w-full"
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualRows.map((virtualRow) => {
        const item = items[virtualRow.index]

        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className="absolute left-0 top-0 w-full"
            style={{
              transform: `translateY(${virtualRow.start - scrollMargin}px)`,
            }}
          >
            {item ? (
              <>
                {getTrashYear(item.timestamp) !==
                  (virtualRow.index > 0
                    ? getTrashYear(items[virtualRow.index - 1].timestamp)
                    : undefined) && (
                  <h2 className="pt-6 pb-1 text-2xl font-semibold text-neutral-800 dark:text-neutral-200">
                    {getTrashYear(item.timestamp) === currentYear
                      ? t('dateGroups.thisYear')
                      : formatTrashYear(item.timestamp, i18n.language)}
                  </h2>
                )}
                <TrashItem
                  item={item}
                  onDelete={onDelete}
                  onLikeUpdate={onLikeUpdate}
                  onCommentUpdate={onCommentUpdate}
                  isAdmin={isAdmin}
                  isLast={virtualRow.index === items.length - 1}
                />
              </>
            ) : (
              <div className="flex h-[52px] items-center justify-center">
                {loading && (
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
