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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import AppLayout from '@components/app-layout/AppLayout'
import { PermissionUsersResponseDto } from '@server/modules/permissions/dto/permission.dto'
import { http } from '@services/http'
import { toast } from '@utils/toast'
import { CircleSlash, Loader2, Plus, Search } from 'lucide-react'
import { GetServerSidePropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const PAGE_SIZE = 20

interface PermissionUsersProps {
  locale: string
  permissionKey: string
  initialData: PermissionUsersResponseDto
  initialNoPermission: boolean
}

function emptyData(permissionKey: string): PermissionUsersResponseDto {
  return {
    permissionKey,
    data: [],
    total: 0,
    page: 1,
    pageSize: PAGE_SIZE,
  }
}

function PermissionUsers({
  locale,
  permissionKey,
  initialData,
  initialNoPermission,
}: PermissionUsersProps) {
  const { t } = useTranslation('tools')
  const { t: tCommon } = useTranslation('common')
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [availableData, setAvailableData] = useState(() =>
    emptyData(permissionKey),
  )
  const [availableLoading, setAvailableLoading] = useState(false)
  const [changingUserId, setChangingUserId] = useState<string>()
  const [noPermission, setNoPermission] = useState(initialNoPermission)
  const isFirstSearchRender = useRef(true)

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(data.total / data.pageSize)),
    [data.pageSize, data.total],
  )
  const availablePageCount = useMemo(
    () => Math.max(1, Math.ceil(availableData.total / availableData.pageSize)),
    [availableData.pageSize, availableData.total],
  )

  const loadGrantedUsers = useCallback(
    async (page: number, nextSearch: string) => {
      setLoading(true)
      try {
        const response = await http.get(
          'GetPermissionUsers',
          {
            permissionKey,
            page,
            pageSize: PAGE_SIZE,
            search: nextSearch.trim() || undefined,
            scope: 'granted',
          },
          { ignoreForbidden: true },
        )
        setData(response.data)
        setNoPermission(false)
      } catch (error: any) {
        if (error?.status === 403 || error?.response?.status === 403) {
          setNoPermission(true)
        }
      } finally {
        setLoading(false)
      }
    },
    [permissionKey],
  )

  const loadAvailableUsers = useCallback(
    async (page: number, nextSearch: string) => {
      const trimmedSearch = nextSearch.trim()
      if (!trimmedSearch) {
        setAvailableData(emptyData(permissionKey))
        setAvailableLoading(false)
        return
      }

      setAvailableLoading(true)
      try {
        const response = await http.get(
          'GetPermissionUsers',
          {
            permissionKey,
            page,
            pageSize: PAGE_SIZE,
            search: trimmedSearch,
            scope: 'available',
          },
          { ignoreForbidden: true },
        )
        setAvailableData(response.data)
        setNoPermission(false)
      } catch (error: any) {
        if (error?.status === 403 || error?.response?.status === 403) {
          setNoPermission(true)
          setAddOpen(false)
        }
      } finally {
        setAvailableLoading(false)
      }
    },
    [permissionKey],
  )

  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false
      return
    }
    const timer = window.setTimeout(() => loadGrantedUsers(1, search), 300)
    return () => window.clearTimeout(timer)
  }, [loadGrantedUsers, search])

  useEffect(() => {
    if (!addOpen) {
      return
    }
    const timer = window.setTimeout(() => loadAvailableUsers(1, addSearch), 300)
    return () => window.clearTimeout(timer)
  }, [addOpen, addSearch, loadAvailableUsers])

  const revokeGrant = async (userId: string) => {
    setChangingUserId(userId)
    try {
      await http.delete('DeletePermissionGrant', {
        permissionKey,
        userId,
      })
      toast(t('items.permissions.revokeSuccess'), { type: 'success' })
      const nextPage =
        data.data.length === 1 && data.page > 1 ? data.page - 1 : data.page
      await loadGrantedUsers(nextPage, search)
    } finally {
      setChangingUserId(undefined)
    }
  }

  const grantUser = async (userId: string) => {
    setChangingUserId(userId)
    try {
      await http.post('PostPermissionGrant', { userId }, { permissionKey })
      toast(t('items.permissions.grantSuccess'), { type: 'success' })
      const nextAvailablePage =
        availableData.data.length === 1 && availableData.page > 1
          ? availableData.page - 1
          : availableData.page
      await Promise.all([
        loadGrantedUsers(data.page, search),
        loadAvailableUsers(nextAvailablePage, addSearch),
      ])
    } finally {
      setChangingUserId(undefined)
    }
  }

  const handleAddOpenChange = (open: boolean) => {
    setAddOpen(open)
    if (!open) {
      setAddSearch('')
      setAvailableData(emptyData(permissionKey))
    }
  }

  return (
    <>
      <Head>
        <title>{permissionKey}</title>
      </Head>
      <AppLayout simplifiedFooter authRequired>
        <div className="max-w-[640px] mx-auto md:mt-2 flex-col">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${locale}/tools`}>
                  {tCommon('nav.tools')}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${locale}/tools/permissions`}>
                  {t('items.permissions.title')}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{permissionKey}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {noPermission ? (
            <div className="flex justify-center">
              <div className="w-[80%] max-w-[400px] mt-24 md:mt-48">
                <Alert>
                  <CircleSlash className="w-4 h-4" />
                  <AlertTitle>{permissionKey}</AlertTitle>
                  <AlertDescription className="mt-5">
                    {t('items.permissions.noPermission')}
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-8 flex w-full gap-x-2">
                <div className="relative flex-1">
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t(
                      'items.permissions.grantedSearchPlaceholder',
                    )}
                    className="h-9 rounded-full !pl-8 text-[0.85rem]"
                  />
                  <Search
                    className={`absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400 ${
                      loading ? 'animate-pulse' : ''
                    }`}
                  />
                </div>

                <Drawer open={addOpen} onOpenChange={handleAddOpenChange}>
                  <DrawerTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-full px-3"
                    >
                      <Plus className="h-3 w-3" />
                      {t('items.permissions.add')}
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="h-[72dvh] max-h-[720px]">
                    <div className="mx-auto flex h-full w-full max-w-[640px] flex-col overflow-hidden">
                      <DrawerHeader className="pb-2 text-left">
                        <DrawerTitle>
                          {t('items.permissions.addTitle')}
                        </DrawerTitle>
                      </DrawerHeader>

                      <div className="relative px-4 pt-2">
                        <Input
                          autoFocus
                          value={addSearch}
                          onChange={(event) => setAddSearch(event.target.value)}
                          placeholder={t(
                            'items.permissions.addSearchPlaceholder',
                          )}
                          className="h-9 rounded-full !pl-8 text-[0.85rem]"
                        />
                        <Search
                          className={`absolute left-7 top-[calc(50%+0.25rem)] h-3 w-3 -translate-y-1/2 text-neutral-400 ${
                            availableLoading ? 'animate-pulse' : ''
                          }`}
                        />
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                        {!addSearch.trim() ? (
                          <p className="mt-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
                            {t('items.permissions.addSearchHint')}
                          </p>
                        ) : availableData.data.length === 0 &&
                          !availableLoading ? (
                          <p className="mt-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
                            {t('items.permissions.addSearchEmpty')}
                          </p>
                        ) : (
                          <>
                            <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                              {t('items.permissions.resultCount', {
                                count: availableData.total,
                              })}
                            </div>
                            <div className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                              {availableData.data.map((user) => (
                                <div
                                  key={user.userId}
                                  className="flex items-center justify-between gap-x-4 py-3.5"
                                >
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium">
                                      {user.profile.name}
                                    </div>
                                    <div className="mt-0.5 truncate font-mono text-xs text-neutral-400">
                                      {user.userId}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    disabled={changingUserId === user.userId}
                                    onClick={() => grantUser(user.userId)}
                                  >
                                    {changingUserId === user.userId && (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                    {t('items.permissions.grant')}
                                  </Button>
                                </div>
                              ))}
                            </div>

                            {availablePageCount > 1 && (
                              <div className="mt-6 flex items-center justify-between gap-x-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={
                                    availableLoading || availableData.page <= 1
                                  }
                                  onClick={() =>
                                    loadAvailableUsers(
                                      availableData.page - 1,
                                      addSearch,
                                    )
                                  }
                                >
                                  {t('items.permissions.previous')}
                                </Button>
                                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                  {t('items.permissions.page', {
                                    page: availableData.page,
                                    total: availablePageCount,
                                  })}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={
                                    availableLoading ||
                                    availableData.page >= availablePageCount
                                  }
                                  onClick={() =>
                                    loadAvailableUsers(
                                      availableData.page + 1,
                                      addSearch,
                                    )
                                  }
                                >
                                  {t('items.permissions.next')}
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>

              <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                {t('items.permissions.resultCount', { count: data.total })}
              </div>

              {data.data.length === 0 ? (
                <p className="mt-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  {t(
                    search.trim()
                      ? 'items.permissions.searchEmpty'
                      : 'items.permissions.noUsers',
                  )}
                </p>
              ) : (
                <div className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                  {data.data.map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between gap-x-4 py-3.5"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {user.profile.name}
                        </div>
                        <div className="mt-0.5 truncate font-mono text-xs text-neutral-400">
                          {user.userId}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={changingUserId === user.userId}
                        onClick={() => revokeGrant(user.userId)}
                      >
                        {changingUserId === user.userId && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {t('items.permissions.revoke')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {pageCount > 1 && (
                <div className="mt-6 flex items-center justify-between gap-x-4">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading || data.page <= 1}
                    onClick={() => loadGrantedUsers(data.page - 1, search)}
                  >
                    {t('items.permissions.previous')}
                  </Button>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {t('items.permissions.page', {
                      page: data.page,
                      total: pageCount,
                    })}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loading || data.page >= pageCount}
                    onClick={() => loadGrantedUsers(data.page + 1, search)}
                  >
                    {t('items.permissions.next')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </AppLayout>
    </>
  )
}

export default PermissionUsers

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { locale = 'cn' } = context
  const rawPermissionKey = context.params?.permissionKey
  const permissionKey = Array.isArray(rawPermissionKey)
    ? rawPermissionKey[0]
    : rawPermissionKey
  if (!permissionKey) {
    return { notFound: true }
  }

  let initialData = emptyData(permissionKey)
  let initialNoPermission = false

  try {
    const response = await http.get(
      'GetPermissionUsers',
      { permissionKey, page: 1, pageSize: PAGE_SIZE },
      {
        enableOnlyWithAuthInServerSide: true,
        silentAuthError: true,
        ignoreForbidden: true,
        serverSideCtx: context,
      },
    )
    initialData = response?.data ?? initialData
  } catch (error: any) {
    const status = error?.status ?? error?.response?.status
    if (status === 404) {
      return { notFound: true }
    }
    initialNoPermission = status === 403
  }

  return {
    props: {
      locale,
      permissionKey,
      initialData,
      initialNoPermission,
      ...(await serverSideTranslations(locale, ['common', 'tools', 'toast'])),
    },
  }
}
