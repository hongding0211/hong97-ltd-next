import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Trash } from 'lucide-react'
import { GetServerSideProps } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import { useCallback, useEffect, useState } from 'react'
import AppLayout from '../../components/app-layout/AppLayout'
import { CreateTrashForm } from '../../components/trash/CreateTrashForm'
import { TrashItem } from '../../components/trash/TrashItem'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { http } from '../../services/http'
import {
  PaginationResponseDto,
  TrashResponseDto,
} from '../../services/trash/types'

interface TrashPageProps {
  initialData: PaginationResponseDto<TrashResponseDto>
}

export default function TrashPage({ initialData }: TrashPageProps) {
  const { t } = useTranslation('trash')
  const { isAdmin, adminLoading } = useIsAdmin()

  const [items, setItems] = useState<TrashResponseDto[]>(initialData.data)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(
    initialData.total > initialData.data.length,
  )
  const [page, setPage] = useState(1)

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

  return (
    <>
      <Head>
        <title>{t('title')}</title>
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
            <div className="space-y-0">
              {items.map((item) => (
                <TrashItem key={item._id} item={item} />
              ))}

              {loading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
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
