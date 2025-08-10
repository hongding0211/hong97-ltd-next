import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Trash } from 'lucide-react'
import { GetServerSideProps } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import { useCallback, useEffect, useMemo, useState } from 'react'
import AppLayout from '../../components/app-layout/AppLayout'
import { CreateTrashForm } from '../../components/trash/CreateTrashForm'
import { TrashItem } from '../../components/trash/TrashItem'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { useLogin } from '../../hooks/useLogin'
import { http } from '../../services/http'
import {
  PaginationResponseDto,
  TrashResponseDto,
} from '../../services/trash/types'
import { time } from '../../utils/time'
import { toast } from '../../utils/toast'

interface TrashPageProps {
  initialData: PaginationResponseDto<TrashResponseDto>
}

interface GroupedTrashItems {
  [key: string]: {
    items: TrashResponseDto[]
    displayTitle: string
    sortOrder: number
  }
}

// 日期分组函数
function getDateGroup(
  timestamp: number,
  _locale: string,
  t: any,
): { key: string; displayTitle: string; sortOrder: number } {
  const now = new Date()
  const date = new Date(timestamp)

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

  if (date >= today) {
    return { key: 'today', displayTitle: t('dateGroups.today'), sortOrder: 0 }
  }
  if (date >= yesterday) {
    return {
      key: 'yesterday',
      displayTitle: t('dateGroups.yesterday'),
      sortOrder: 1,
    }
  }

  // 对于除今天昨天之外的所有日期，都显示具体日期
  const dateKey = `date_${Math.floor(date.getTime() / 86400000)}` // 使用天数作为key，同一天的数据会在同一组
  return {
    key: dateKey,
    displayTitle: time.formatDateGroupTitle(timestamp),
    sortOrder: Math.floor((now.getTime() - date.getTime()) / 86400000) + 2, // 从昨天之后开始排序，越老的数据sortOrder越大
  }
}

export default function TrashPage({ initialData }: TrashPageProps) {
  const { t, i18n } = useTranslation('trash')
  const { isAdmin, adminLoading } = useIsAdmin()
  const { isLogin } = useLogin()

  const [items, setItems] = useState<TrashResponseDto[]>(initialData.data)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(
    initialData.total > initialData.data.length,
  )
  const [page, setPage] = useState(1)

  // 设置时间工具的语言
  useEffect(() => {
    time.setLocale(i18n.language)
  }, [i18n.language])

  // 客户端水合：当用户登录后，重新获取包含正确 isLiked 状态的数据
  useEffect(() => {
    if (isLogin) {
      const hydrateItems = async () => {
        try {
          const response = await http.get('GetTrashList', {
            page: 1,
            pageSize: items.length || 10,
          })

          if (response.isSuccess) {
            setItems(response.data.data)
          }
        } catch (error) {
          console.warn('Failed to hydrate items:', error)
        }
      }

      hydrateItems()
    }
  }, [isLogin])

  // 按日期分组推文
  const groupedItems = useMemo(() => {
    const groups: {
      [key: string]: {
        items: TrashResponseDto[]
        displayTitle: string
        sortOrder: number
      }
    } = {}

    items.forEach((item) => {
      const groupInfo = getDateGroup(item.timestamp, i18n.language, t)
      if (!groups[groupInfo.key]) {
        groups[groupInfo.key] = {
          items: [],
          displayTitle: groupInfo.displayTitle,
          sortOrder: groupInfo.sortOrder,
        }
      }
      groups[groupInfo.key].items.push(item)
    })

    // 确保每个分组内的数据也按时间倒序排列
    Object.values(groups).forEach((group) => {
      group.items.sort((a, b) => b.timestamp - a.timestamp)
    })

    // 按排序顺序返回分组
    const sortedGroups = Object.entries(groups).sort(
      ([, a], [, b]) => a.sortOrder - b.sortOrder,
    )
    const result: GroupedTrashItems = {}
    sortedGroups.forEach(([key, value]) => {
      result[key] = value
    })

    return result
  }, [items, i18n.language, t])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    try {
      const response = await http.get('GetTrashList', {
        page: page + 1,
        pageSize: 10,
      })

      if (response.isSuccess) {
        const newItems = response.data.data
        setItems((prev) => [...prev, ...newItems])
        setPage((prev) => prev + 1)
        setHasMore(response.data.total > items.length + newItems.length)
      }
    } catch (error) {
      console.error('Load more error:', error)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, page, items.length])

  // 监听滚动事件，触底加载
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMore])

  const handleCreateSuccess = async () => {
    // 重新加载第一页数据，不刷新页面
    try {
      const response = await http.get('GetTrashList', {
        page: 1,
        pageSize: 10,
      })

      if (response.isSuccess) {
        setItems(response.data.data)
        setPage(1)
        setHasMore(response.data.total > response.data.data.length)
      }
    } catch (error) {
      console.error('Reload after create error:', error)
      // 如果刷新失败，fallback 到页面刷新
      window.location.reload()
    }
  }

  const handleDelete = async (itemId: string) => {
    try {
      const response = await http.delete('DeleteTrash', { id: itemId })

      if (response.isSuccess) {
        // 从列表中移除该项
        setItems((prev) => prev.filter((item) => item._id !== itemId))
        toast(t('delete.success'), { type: 'success' })
      } else {
        toast(response.msg || t('delete.failed'), { type: 'error' })
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast(t('delete.failed'), { type: 'error' })
    }
  }

  const handleLikeUpdate = (itemId: string, newItem: TrashResponseDto) => {
    setItems((prev) =>
      prev.map((item) =>
        item._id === itemId
          ? { ...item, likeCount: newItem.likeCount, isLiked: newItem.isLiked }
          : item,
      ),
    )
  }

  const handleCommentUpdate = (itemId: string, newItem: TrashResponseDto) => {
    setItems((prev) =>
      prev.map((item) =>
        item._id === itemId ? { ...item, comments: newItem.comments } : item,
      ),
    )
  }

  return (
    <>
      <Head>
        <title>{t('title')}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </Head>
      <AppLayout>
        <div className="container mx-auto py-8 pt-4 max-w-2xl p-0">
          <div className="flex items-center justify-end mb-4">
            {isAdmin && !adminLoading && (
              <CreateTrashForm onSuccess={handleCreateSuccess} />
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex justify-center">
              <div className="w-[80%] max-w-[400px] mt-24 md:mt-48">
                <Alert>
                  <Trash className="w-4 h-4" />
                  <AlertTitle>{t('empty.title')}</AlertTitle>
                  <AlertDescription className="mt-6 mb-1">
                    {isAdmin
                      ? t('empty.adminDescription')
                      : t('empty.userDescription')}
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([groupKey, groupData]) => (
                <div key={groupKey} className="space-y-0">
                  {/* 日期组标题 */}
                  <div className="mt-6 mb-1">
                    <h2 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200">
                      {groupData.displayTitle}
                    </h2>
                  </div>

                  {/* 该日期组的推文 */}
                  <div className="space-y-0">
                    {groupData.items.map((item) => (
                      <TrashItem
                        key={item._id}
                        item={item}
                        onDelete={handleDelete}
                        onLikeUpdate={handleLikeUpdate}
                        onCommentUpdate={handleCommentUpdate}
                        isAdmin={isAdmin && !adminLoading}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                </div>
              )}
            </div>
          )}
        </div>
      </AppLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<TrashPageProps> = async ({
  locale,
}) => {
  try {
    // 设置 HTTP 客户端的语言
    http.setLocale(locale || 'cn')

    // 获取第一页数据
    const response = await http.get('GetTrashList', {
      page: 1,
      pageSize: 10,
    })

    const initialData: PaginationResponseDto<TrashResponseDto> =
      response.isSuccess
        ? response.data
        : { data: [], total: 0, page: 1, pageSize: 10 }

    return {
      props: {
        initialData,
        ...(await serverSideTranslations(locale!, ['common', 'trash'])),
      },
    }
  } catch (error) {
    console.error('SSR fetch error:', error)

    // 如果获取失败，返回空数据
    return {
      props: {
        initialData: { data: [], total: 0, page: 1, pageSize: 10 },
        ...(await serverSideTranslations(locale!, ['common', 'trash'])),
      },
    }
  }
}
