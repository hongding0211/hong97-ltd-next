import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import AppLayout from '@components/app-layout/AppLayout'
import { TableAction, UCPTable } from '@components/ucp/table'
import { Edit, EditType } from '@components/ucp/table/edit'
import { ConfigListResponseDto } from '@server/modules/ucp/dto/config-list'
import { http } from '@services/http'
import { toast } from '@utils/toast'
import { Copy, Plus } from 'lucide-react'
import { GetServerSidePropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import React, { useCallback, useEffect, useRef, useState } from 'react'

const PAGE_SIZE = 20

export const UCPDetail: React.FC<{ locale: string; id: string }> = ({
  locale,
  id,
}) => {
  const { t: tCommon } = useTranslation('common')
  const { t } = useTranslation('tools')

  const [title, setTitle] = useState(tCommon('loading'))
  const [_showItemDrawer, _setShowItemDrawer] = useState(false)

  const [editData, setEditData] = useState<
    ConfigListResponseDto['data'][number] | undefined
  >()
  const [showEdit, setShowEdit] = useState(false)
  const [editTitle, setEditTitle] = useState('')

  const [items, setItems] = useState<ConfigListResponseDto['data']>([])

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const editType = useRef<EditType>('new')
  const firstFetched = useRef(false)

  const fetch = useCallback(() => {
    http
      .get('GetUcpConfigList', {
        id,
        page,
        pageSize: PAGE_SIZE,
      })
      .then((res) => {
        if (!res.isSuccess) {
          toast(res.msg, {
            type: 'error',
          })
          return
        }
        setItems(res.data.data)
        setTotal(res.data.total)
      })
  }, [id, page])

  const handleNew = () => {
    editType.current = 'new'
    setEditData(undefined)
    setShowEdit(true)
    setEditTitle(t('items.ucp.new'))
  }

  const handleSave = (
    data: ConfigListResponseDto['data'][number],
    type: EditType,
  ) => {
    if (type === 'new') {
      http
        .post('PostUcpAppend', {
          id,
          data: data.raw,
        })
        .then((res) => {
          if (!res.isSuccess) {
            toast(res.msg, {
              type: 'error',
            })
            return
          }
          setPage(1)
          setTimeout(fetch, 0)
          toast(t('items.ucp.detail.addSuccess'), {
            type: 'success',
          })
        })
    }

    if (type === 'edit') {
      http
        .put('PutUcpConfigUpdate', {
          ucpId: id,
          itemId: data.id,
          data: data.raw,
        })
        .then((res) => {
          if (!res.isSuccess) {
            toast(res.msg, {
              type: 'error',
            })
            return
          }
          fetch()
          toast(t('items.ucp.detail.editSuccess'), {
            type: 'success',
          })
        })
    }
  }

  const handleTableAction = (
    action: TableAction,
    item: ConfigListResponseDto['data'][number],
  ) => {
    if (action === 'edit') {
      editType.current = 'edit'
      setEditData(item)
      setShowEdit(true)
      setEditTitle(t('items.ucp.detail.edit'))
    }
    if (action === 'duplicate') {
      editType.current = 'new'
      setEditData({
        raw: item.raw,
      })
      setShowEdit(true)
      setEditTitle(t('items.ucp.new'))
    }
    if (action === 'delete') {
      http
        .delete('DeleteUcpConfig', {
          ucpId: id,
          itemId: item.id,
        })
        .then((res) => {
          if (!res.isSuccess) {
            toast(res.msg, {
              type: 'error',
            })
            return
          }
          toast(t('items.ucp.detail.deleteSuccess'), {
            type: 'success',
          })
          setPage(1)
          setTimeout(fetch, 0)
        })
    }
  }

  const handlePageChange = (page: number) => {
    setPage(page)
    setTimeout(fetch, 0)
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(id)
    toast(t('items.ucp.detail.copyIdSuccess'), {
      type: 'success',
    })
  }

  useEffect(() => {
    if (!id) {
      return
    }
    http
      .get('GetUcpDetail', {
        id,
      })
      .then((res) => {
        if (!res.isSuccess) {
          toast(res.msg, {
            type: 'error',
          })
          return
        }
        setTitle(res.data.desc)
      })
  }, [id])

  useEffect(() => {
    if (!id || firstFetched.current) {
      return
    }
    firstFetched.current = true
    fetch()
  }, [id, fetch])

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <AppLayout authRequired simplifiedFooter>
        <div className="max-w-[768px] mx-auto md:mt-2 flex-col">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${locale}/tools`}>
                  {tCommon('nav.tools')}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${locale}/tools/ucp`}>
                  {t('items.ucp.title')}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mt-8 w-full">
            <div className="flex w-full items-center mb-4 gap-x-2">
              <Button size="sm" onClick={handleNew}>
                <Plus className="w-4 h-4" />
                {t('items.ucp.new')}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCopyId}>
                <Copy className="w-4 h-4" />
                {t('items.ucp.detail.copyId')}
              </Button>
            </div>
            <UCPTable
              items={items}
              onAction={handleTableAction}
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </AppLayout>
      <Edit
        title={editTitle}
        visible={showEdit}
        onVisibleChange={setShowEdit}
        data={editData}
        onSave={handleSave}
        type={editType.current}
      />
    </>
  )
}

export default UCPDetail

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { locale = 'cn', query } = context
  const { id } = query
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'tools', 'toast'])),
      locale,
      id,
    },
  }
}
