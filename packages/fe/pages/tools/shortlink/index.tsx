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
import { ShortLinkListResponseDto } from '@server/modules/shortlink/dto/shortlink-response.dto'
import { http } from '@services/http'
import { toast } from '@utils/toast'
import { debounce } from 'lodash'
import {
  Calendar,
  ChevronRight,
  CircleSlash,
  Copy,
  Edit,
  ExternalLink,
  Eye,
  Loader2,
  Plus,
  Search,
  Tag,
  Trash2,
} from 'lucide-react'
import { GetServerSidePropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const PAGE_SIZE = 10

const Item: React.FC<{
  item: ShortLinkListResponseDto['data'][number]
  onEdit: (item: ShortLinkListResponseDto['data'][number]) => void
  onDelete: (item: ShortLinkListResponseDto['data'][number]) => void
}> = ({ item, onEdit, onDelete }) => {
  const { t } = useTranslation('tools')

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    const shortUrl = `${window.location.origin}/s/${item.shortCode}`
    navigator.clipboard.writeText(shortUrl)
    toast('shortlink.copied', { type: 'success' })
  }

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    const shortUrl = `${window.location.origin}/s/${item.shortCode}`
    window.open(shortUrl, '_blank')
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString()
  }

  const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date()

  const shortUrl = `${window.location.origin}/s/${item.shortCode}`

  const handleItemClick = () => {
    onEdit(item)
  }

  return (
    <div
      className="flex h-[56px] sm:h-[72px] items-center justify-between cursor-pointer group"
      onClick={handleItemClick}
    >
      <div className="flex flex-col gap-y-2 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{shortUrl}</span>
          {!item.isActive && (
            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              {t('items.shortlink.inactive')}
            </span>
          )}
          {isExpired && (
            <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded">
              {t('items.shortlink.expired')}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Eye className="w-3 h-3" />
              {item.clickCount}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[50%]">
              {item.title || item.originalUrl}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {item.tags.length > 0 && (
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {item.tags.slice(0, 2).join(', ')}
                {item.tags.length > 2 && ` +${item.tags.length - 2}`}
              </span>
            )}
            {item.expiresAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(item.expiresAt)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            handleCopy(e)
          }}
          className="h-8 w-8 p-0"
        >
          <Copy className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            handleOpen(e)
          }}
          className="h-8 w-8 p-0"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(item)
          }}
          className="h-8 w-8 p-0"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(item)
          }}
          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

const CreateShortLink: React.FC<{
  open: boolean
  onOpenChange?: (open: boolean) => void
  onSubmit?: () => void
  editItem?: ShortLinkListResponseDto['data'][number] | null
}> = (props) => {
  const { open, onOpenChange, onSubmit, editItem } = props

  const [originalUrl, setOriginalUrl] = useState('')
  const [_title, setTitle] = useState('')
  const [_description, setDescription] = useState('')
  const [_shortCode, setShortCode] = useState('')
  const [_tags, setTags] = useState('')
  const [_expiresAt, setExpiresAt] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)

  const { t } = useTranslation('tools')
  const { t: tCommon } = useTranslation('common')

  useEffect(() => {
    if (editItem) {
      setOriginalUrl(editItem.originalUrl)
      // 高级配置暂时隐藏，只保留基本字段
      setTitle('')
      setDescription('')
      setShortCode('')
      setTags('')
      setExpiresAt('')
      setIsActive(editItem.isActive)
    } else {
      setOriginalUrl('')
      setTitle('')
      setDescription('')
      setShortCode('')
      setTags('')
      setExpiresAt('')
      setIsActive(true)
    }
  }, [editItem, open])

  const handleSubmit = () => {
    const trimmedUrl = originalUrl.trim()
    if (!trimmedUrl) {
      toast('shortlink.urlRequired', { type: 'error' })
      return
    }

    // 验证URL格式
    try {
      new URL(trimmedUrl)
    } catch {
      toast('shortlink.invalidUrl', { type: 'error' })
      return
    }

    // 自定义短码验证已隐藏
    // if (shortCode && !/^[a-z]{6}$/.test(shortCode)) {
    //   toast('shortlink.invalidShortCode', { type: 'error' })
    //   return
    // }

    setLoading(true)

    const data = {
      originalUrl: trimmedUrl,
      // 高级配置暂时隐藏，使用默认值
      title: undefined,
      description: undefined,
      shortCode: undefined,
      tags: [],
      expiresAt: undefined,
      isActive,
    }

    const apiCall = editItem
      ? http.put('PutShortLinkUpdate', data, { id: editItem.id })
      : http.post('PostShortLinkCreate', data)

    apiCall
      .then((res) => {
        if (!res.isSuccess) {
          toast(res.msg, { type: 'error' })
          return
        }
        toast(
          editItem ? 'shortlink.updateSuccess' : 'shortlink.createSuccess',
          { type: 'success' },
        )
        onSubmit?.()
        onOpenChange?.(false)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editItem
                ? t('items.shortlink.edit')
                : t('items.shortlink.create')}
            </DialogTitle>
            <DialogDescription>
              {t('items.shortlink.createDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="originalUrl">
                {t('items.shortlink.originalUrl')} *
              </Label>
              <Input
                id="originalUrl"
                placeholder="https://example.com"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                disabled={loading}
              />
            </div>
            {/* 高级配置暂时隐藏 */}
            {/* <div className="grid gap-2">
              <Label htmlFor="title">{t('items.shortlink.linkTitle')}</Label>
              <Input
                id="title"
                placeholder={t('items.shortlink.titlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t('items.shortlink.description')}</Label>
              <Textarea
                id="description"
                placeholder={t('items.shortlink.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shortCode">{t('items.shortlink.shortCode')}</Label>
              <Input
                id="shortCode"
                placeholder="abc123 (6位小写字母，可选)"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toLowerCase())}
                disabled={loading}
                maxLength={6}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">{t('items.shortlink.tags')}</Label>
              <Input
                id="tags"
                placeholder="tag1, tag2, tag3"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expiresAt">{t('items.shortlink.expiresAt')}</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={loading}
              />
            </div> */}
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={loading}
              />
              <Label htmlFor="isActive">{t('items.shortlink.isActive')}</Label>
            </div>
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

const DeleteConfirm: React.FC<{
  open: boolean
  onOpenChange?: (open: boolean) => void
  onConfirm?: () => void
  item?: ShortLinkListResponseDto['data'][number] | null
}> = (props) => {
  const { open, onOpenChange, onConfirm, item } = props
  const [loading, setLoading] = useState(false)

  const { t } = useTranslation('tools')
  const { t: tCommon } = useTranslation('common')

  const handleConfirm = () => {
    if (!item) return

    setLoading(true)
    http
      .delete('DeleteShortLink', { id: item.id })
      .then((res) => {
        if (!res.isSuccess) {
          toast(res.msg, { type: 'error' })
          return
        }
        toast('shortlink.deleteSuccess', { type: 'success' })
        onConfirm?.()
        onOpenChange?.(false)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('items.shortlink.deleteTitle')}</DialogTitle>
          <DialogDescription>
            {t('items.shortlink.deleteDesc', {
              title: item?.title || item?.originalUrl,
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={loading} variant="outline">
              {tCommon('cancel')}
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {tCommon('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ShortLink({ locale }: { locale: string }) {
  const [items, setItems] = useState<ShortLinkListResponseDto['data']>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editItem, setEditItem] = useState<
    ShortLinkListResponseDto['data'][number] | null
  >(null)
  const [deleteItem, setDeleteItem] = useState<
    ShortLinkListResponseDto['data'][number] | null
  >(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [noPermission, setNoPermission] = useState(false)

  const { t } = useTranslation('tools')
  const { t: tCommon } = useTranslation('common')

  const page = useRef(1)
  const size = useRef(PAGE_SIZE)

  const fetch = useCallback(
    (refetch = false) => {
      if (refetch) {
        page.current = 1
        size.current = PAGE_SIZE
      }
      setLoading(true)
      return http
        .get('GetShortLinkList', {
          page: page.current,
          pageSize: size.current,
          search: searchQuery || undefined,
        })
        .then((res) => {
          if (refetch) {
            setItems(res.data.data)
          } else {
            setItems((prev) => [...prev, ...res.data.data])
          }
          setTotal(res.data.total)
        })
        .catch((err) => {
          if (err?.status === 403) {
            setNoPermission(true)
          }
        })
        .finally(() => {
          setLoading(false)
        })
    },
    [searchQuery],
  )

  const handleCreate = () => {
    setEditItem(null)
    setShowCreateDialog(true)
  }

  const handleEdit = (item: ShortLinkListResponseDto['data'][number]) => {
    setEditItem(item)
    setShowCreateDialog(true)
  }

  const handleDelete = (item: ShortLinkListResponseDto['data'][number]) => {
    setDeleteItem(item)
    setShowDeleteDialog(true)
  }

  const handleLoadMore = () => {
    page.current += 1
    fetch()
  }

  // 防抖搜索
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        setSearchQuery(query)
        page.current = 1
        size.current = PAGE_SIZE
      }, 300),
    [],
  )

  const handleSearch = (query: string) => {
    debouncedSearch(query)
  }

  const content = useMemo(() => {
    if (noPermission) {
      return (
        <div className="flex justify-center">
          <div className="w-[80%] max-w-[400px] mt-24 md:mt-48">
            <Alert>
              <CircleSlash className="w-4 h-4" />
              <AlertTitle>{t('items.shortlink.title')}</AlertTitle>
              <AlertDescription className="mt-5">
                {t('items.shortlink.noPermission')}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )
    }

    return (
      <div>
        <div className="mt-6 md:mt-12 flex-col">
          <div className="flex w-full mb-6 gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={t('items.shortlink.searchPlaceholder')}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="w-4 h-4" />
              {t('items.shortlink.new')}
            </Button>
          </div>

          {!items.length && !loading && !searchQuery ? (
            <div className="flex justify-center">
              <div className="w-[80%] max-w-[400px] mt-24 md:mt-48">
                <Alert>
                  <CircleSlash className="w-4 h-4" />
                  <AlertTitle>{t('items.shortlink.nodata')}</AlertTitle>
                  <AlertDescription>
                    <div className="flex items-center mt-1">
                      <Button
                        className="p-0"
                        variant="link"
                        onClick={handleCreate}
                      >
                        {t('items.shortlink.add')}
                      </Button>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          ) : (
            <>
              {items.map((item, index) => (
                <div key={item.id}>
                  <Item
                    item={item}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
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
                      total > items.length
                        ? 'cursor-pointer'
                        : 'cursor-default',
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
            </>
          )}
        </div>
      </div>
    )
  }, [
    items,
    handleCreate,
    t,
    handleLoadMore,
    total,
    tCommon,
    loading,
    searchQuery,
  ])

  useEffect(() => {
    fetch(true)
  }, [searchQuery])

  // 清理防抖函数
  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  return (
    <>
      <Head>
        <title>{t('items.shortlink.title')}</title>
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
                <BreadcrumbPage>{t('items.shortlink.title')}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {content}
        </div>
      </AppLayout>
      <CreateShortLink
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={() => {
          fetch(true)
        }}
        editItem={editItem}
      />
      <DeleteConfirm
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          fetch(true)
        }}
        item={deleteItem}
      />
    </>
  )
}

export default ShortLink

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { locale = 'cn' } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'tools', 'toast'])),
      locale,
    },
  }
}
