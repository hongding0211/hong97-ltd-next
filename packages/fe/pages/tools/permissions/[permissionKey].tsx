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
import { Input } from '@/components/ui/input'
import AppLayout from '@components/app-layout/AppLayout'
import { PermissionUsersResponseDto } from '@server/modules/permissions/dto/permission.dto'
import { http } from '@services/http'
import { toast } from '@utils/toast'
import { CircleSlash, Loader2, Search } from 'lucide-react'
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
  const [changingUserId, setChangingUserId] = useState<string>()
  const [noPermission, setNoPermission] = useState(initialNoPermission)
  const isFirstSearchRender = useRef(true)

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(data.total / data.pageSize)),
    [data.pageSize, data.total],
  )

  const loadUsers = useCallback(
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

  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false
      return
    }
    const timer = window.setTimeout(() => loadUsers(1, search), 300)
    return () => window.clearTimeout(timer)
  }, [loadUsers, search])

  const changeGrant = async (userId: string, granted: boolean) => {
    setChangingUserId(userId)
    try {
      if (granted) {
        await http.delete('DeletePermissionGrant', {
          permissionKey,
          userId,
        })
        toast(t('items.permissions.revokeSuccess'), { type: 'success' })
      } else {
        await http.post('PostPermissionGrant', { userId }, { permissionKey })
        toast(t('items.permissions.grantSuccess'), { type: 'success' })
      }
      await loadUsers(data.page, search)
    } finally {
      setChangingUserId(undefined)
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
              <div className="relative mt-8">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('items.permissions.searchPlaceholder')}
                  className="pl-9 pr-9"
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />
                )}
              </div>

              <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                {t('items.permissions.resultCount', { count: data.total })}
              </div>

              {data.data.length === 0 ? (
                <p className="mt-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  {t('items.permissions.searchEmpty')}
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
                        variant={user.granted ? 'outline' : 'default'}
                        disabled={changingUserId === user.userId}
                        onClick={() => changeGrant(user.userId, user.granted)}
                      >
                        {changingUserId === user.userId && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {t(
                          user.granted
                            ? 'items.permissions.revoke'
                            : 'items.permissions.grant',
                        )}
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
                    onClick={() => loadUsers(data.page - 1, search)}
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
                    onClick={() => loadUsers(data.page + 1, search)}
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
