import { EmptyState } from '@components/common/EmptyState'
import { useUser } from '@hooks/useUser'
import { Trash } from 'lucide-react'
import { GetServerSideProps } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import { useCallback, useState } from 'react'
import AppLayout from '../../components/app-layout/AppLayout'
import { CreateTrashForm } from '../../components/trash/CreateTrashForm'
import { VirtualTrashList } from '../../components/trash/VirtualTrashList'
import { http } from '../../services/http'
import {
  PaginationResponseDto,
  TrashResponseDto,
} from '../../services/trash/types'
import { toast } from '../../utils/toast'

interface TrashPageProps {
  initialData: PaginationResponseDto<TrashResponseDto>
}

export default function TrashPage({ initialData }: TrashPageProps) {
  const { t } = useTranslation('trash')

  const [items, setItems] = useState<TrashResponseDto[]>(initialData.data)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(
    initialData.total > initialData.data.length,
  )
  const [page, setPage] = useState(1)

  const user = useUser()

  const isAdmin = user?.isAdmin ?? false
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
        <div className="container mx-auto mt-[-0.5rem] sm:mt-4 pb-12 max-w-2xl p-0">
          {isAdmin && <CreateTrashForm onSuccess={handleCreateSuccess} />}

          {items.length === 0 ? (
            <EmptyState
              icon={Trash}
              title={t('empty.title')}
              description={
                isAdmin
                  ? t('empty.adminDescription')
                  : t('empty.userDescription')
              }
            />
          ) : (
            <VirtualTrashList
              items={items}
              hasMore={hasMore}
              loading={loading}
              isAdmin={isAdmin}
              loadMore={loadMore}
              onDelete={handleDelete}
              onLikeUpdate={handleLikeUpdate}
              onCommentUpdate={handleCommentUpdate}
            />
          )}
        </div>
      </AppLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<TrashPageProps> = async (
  ctx,
) => {
  const { locale } = ctx
  try {
    // 获取第一页数据
    const [response] = await Promise.all([
      http.get(
        'GetTrashList',
        {
          page: 1,
          pageSize: 10,
        },
        { serverSideCtx: ctx },
      ),
    ])

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
