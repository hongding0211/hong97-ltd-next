import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import AppLayout from '@components/app-layout/AppLayout'
import { ListResponseDto } from '@server/modules/ucp/dto/list.dto'
import { http } from '@services/http'
import { toast } from '@utils/toast'
import { ChevronRight, CircleSlash, Loader2, Plus } from 'lucide-react'
import { GetServerSidePropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import router from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const PAGE_SIZE = 10

const Item: React.FC<{
  item: ListResponseDto['data'][number]
}> = ({ item }) => {
  const handleClick = () => {
    router.push(`/tools/ucp/detail?id=${item.id}`)
  }

  return (
    <div
      className="flex h-[32px] sm:h-[48px] items-center justify-between cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex flex-col gap-y-0.5">
        <span className="hover:underline active:underline">{item.desc}</span>
      </div>
      <ChevronRight className="w-4 h-4" />
    </div>
  )
}

const AddNewData: React.FC<{
  open: boolean
  onOpenChange?: (open: boolean) => void
  onSubmit?: () => void
}> = (props) => {
  const { open, onOpenChange, onSubmit } = props

  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [publicRead, setPublicRead] = useState(true)

  const { t } = useTranslation('tools')
  const { t: tCommon } = useTranslation('common')

  const handleSubmit = () => {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      toast('inputEmpty', {
        type: 'error',
      })
      return
    }
    // validate english only, allow space, numbers, -, _
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedValue)) {
      toast('inputInvalid', {
        type: 'error',
      })
      return
    }
    // validate length
    if (trimmedValue.length > 30) {
      toast('inputInvalid', {
        type: 'error',
      })
      return
    }

    setLoading(true)
    http
      .post('PostUcpCreate', {
        desc: trimmedValue,
        publicRead,
      })
      .then((res) => {
        if (!res.isSuccess) {
          toast(res.msg, {
            type: 'error',
          })
          return
        }
        onSubmit?.()
        onOpenChange?.(false)
        setValue('')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('items.ucp.newConfig')}</DialogTitle>
            <DialogDescription>{t('items.ucp.desc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Input
                id="desc"
                name="desc"
                placeholder={t('items.ucp.inputLabel')}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="publicRead"
              checked={publicRead}
              onCheckedChange={setPublicRead}
            />
            <Label htmlFor="publicRead">{t('items.ucp.publicRead')}</Label>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={loading} variant="outline">
                {tCommon('cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {tCommon('apply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}

function UCP({ locale }: { locale: string }) {
  const [items, setItems] = useState<ListResponseDto['data']>([])

  const [showAddNewData, setShowAddNewData] = useState(false)
  const [total, setTotal] = useState(0)

  const [loading, setLoading] = useState(true)

  const { t } = useTranslation('tools')
  const { t: tCommon } = useTranslation('common')

  const page = useRef(1)
  const size = useRef(PAGE_SIZE)

  const fetch = useCallback((refetch = false) => {
    if (refetch) {
      page.current = 1
      size.current = PAGE_SIZE
    }
    setLoading(true)
    return http
      .get('GetUcpList', {
        page: page.current,
        pageSize: size.current,
      })
      .then((res) => {
        if (refetch) {
          setItems(res.data.data)
        } else {
          setItems((prev) => [...prev, ...res.data.data])
        }
        setTotal(res.data.total)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleAdd = () => {
    setShowAddNewData(true)
  }

  const handleLoadMore = () => {
    page.current += 1
    fetch()
  }

  const content = useMemo(() => {
    return (
      <div>
        {!items.length && !loading ? (
          <div className="flex justify-center">
            <div className="w-[80%] max-w-[400px] mt-24 md:mt-48">
              <Alert>
                <CircleSlash className="w-4 h-4" />
                <AlertTitle>{t('items.ucp.nodata')}</AlertTitle>
                <AlertDescription>
                  <div className="flex items-center mt-1">
                    <Button className="p-0" variant="link" onClick={handleAdd}>
                      {t('items.ucp.add')}
                    </Button>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        ) : (
          <div className=" mt-6 md:mt-12 flex-col">
            <div className="flex w-full mb-6">
              <Button size="sm" onClick={handleAdd}>
                <Plus className="w-4 h-4" />
                {t('items.ucp.new')}
              </Button>
            </div>
            {items.map((item, index) => (
              <div key={item.id}>
                <Item item={item} />
                {index !== items.length - 1 && (
                  <div className="w-full h-[0.5px] my-3 bg-neutral-300 dark:bg-neutral-700" />
                )}
              </div>
            ))}
            <div className="flex justify-center">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span
                  className={cn(
                    'mt-4 cursor-pointer text-sm text-neutral-500',
                    total > items.length ? 'cursor-pointer' : 'cursor-default',
                    total > items.length
                      ? 'hover:underline active:underline'
                      : undefined,
                  )}
                  onClick={total > items.length ? handleLoadMore : undefined}
                >
                  {total > items.length
                    ? tCommon('loadMore')
                    : tCommon('noMore')}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }, [items, handleAdd, t, handleLoadMore, total, tCommon, loading])

  useEffect(() => {
    fetch()
    return () => {
      setItems([])
      page.current = 1
      size.current = 10
    }
  }, [fetch])

  return (
    <>
      <Head>
        <title>{t('items.ucp.title')}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#fff"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#000"
        />
      </Head>
      <AppLayout authRequired simplifiedFooter>
        <div className="max-w-[800px] mx-auto md:mt-2 flex-col">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${locale}/tools`}>
                  {tCommon('nav.tools')}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{t('items.ucp.title')}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {content}
        </div>
      </AppLayout>
      <AddNewData
        open={showAddNewData}
        onOpenChange={setShowAddNewData}
        onSubmit={() => {
          fetch(true)
        }}
      />
    </>
  )
}

export default UCP

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { locale = 'cn' } = context
  http.setLocale(locale)
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'tools', 'toast'])),
      locale,
    },
  }
}
