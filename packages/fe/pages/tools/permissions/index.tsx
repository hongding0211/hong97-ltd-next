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
import AppLayout from '@components/app-layout/AppLayout'
import { PermissionManagementResponseDto } from '@server/modules/permissions/dto/permission.dto'
import { http } from '@services/http'
import { toast } from '@utils/toast'
import { CircleSlash, Loader2, ShieldCheck, Trash2 } from 'lucide-react'
import { GetServerSidePropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import { useCallback, useMemo, useState } from 'react'

interface PermissionsProps {
  locale: string
  initialData: PermissionManagementResponseDto
  initialNoPermission: boolean
}

const EMPTY_DATA: PermissionManagementResponseDto = {
  points: [],
  users: [],
}

function Permissions({
  locale,
  initialData,
  initialNoPermission,
}: PermissionsProps) {
  const { t } = useTranslation('tools')
  const { t: tCommon } = useTranslation('common')
  const [data, setData] = useState(initialData)
  const [noPermission, setNoPermission] = useState(initialNoPermission)
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string>()

  const load = useCallback(async () => {
    const response = await http.get('GetPermissions', undefined, {
      ignoreForbidden: true,
    })
    setData(response.data)
    setNoPermission(false)
  }, [])

  const availableUsers = useMemo(() => {
    return new Map(data.users.map((user) => [user.userId, user]))
  }, [data.users])

  const grant = async (permissionKey: string) => {
    const userId = selectedUsers[permissionKey]
    if (!userId) {
      return
    }
    setSavingKey(permissionKey)
    try {
      await http.post('PostPermissionGrant', { userId }, { permissionKey })
      await load()
      setSelectedUsers((current) => ({ ...current, [permissionKey]: '' }))
      toast(t('items.permissions.grantSuccess'), { type: 'success' })
    } finally {
      setSavingKey(undefined)
    }
  }

  const revoke = async (permissionKey: string, userId: string) => {
    setSavingKey(permissionKey)
    try {
      await http.delete('DeletePermissionGrant', {
        permissionKey,
        userId,
      })
      await load()
      toast(t('items.permissions.revokeSuccess'), { type: 'success' })
    } finally {
      setSavingKey(undefined)
    }
  }

  return (
    <>
      <Head>
        <title>{t('items.permissions.title')}</title>
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
                <BreadcrumbPage>{t('items.permissions.title')}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {noPermission ? (
            <div className="flex justify-center">
              <div className="w-[80%] max-w-[400px] mt-24 md:mt-48">
                <Alert>
                  <CircleSlash className="w-4 h-4" />
                  <AlertTitle>{t('items.permissions.title')}</AlertTitle>
                  <AlertDescription className="mt-5">
                    {t('items.permissions.noPermission')}
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          ) : data.points.length === 0 ? (
            <p className="mt-12 text-sm text-neutral-500 dark:text-neutral-400">
              {t('items.permissions.empty')}
            </p>
          ) : (
            <div className="mt-8 flex flex-col gap-y-5">
              {data.points.map((point) => {
                const grantedIds = new Set(
                  point.grants.map((grant) => grant.userId),
                )
                const candidates = data.users.filter(
                  (user) => !grantedIds.has(user.userId),
                )
                return (
                  <section
                    key={point.key}
                    className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
                  >
                    <div className="flex items-center gap-x-2">
                      <ShieldCheck className="h-4 w-4 text-neutral-500" />
                      <code className="font-semibold">{point.key}</code>
                    </div>

                    <div className="mt-5 flex items-center gap-x-2">
                      <select
                        value={selectedUsers[point.key] ?? ''}
                        onChange={(event) =>
                          setSelectedUsers((current) => ({
                            ...current,
                            [point.key]: event.target.value,
                          }))
                        }
                        className="h-9 min-w-0 flex-1 rounded-md border border-neutral-200 bg-transparent px-3 text-sm dark:border-neutral-800"
                      >
                        <option value="">
                          {t('items.permissions.selectUser')}
                        </option>
                        {candidates.map((user) => (
                          <option key={user.userId} value={user.userId}>
                            {user.profile.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        disabled={
                          !selectedUsers[point.key] || savingKey === point.key
                        }
                        onClick={() => grant(point.key)}
                      >
                        {savingKey === point.key && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {t('items.permissions.grant')}
                      </Button>
                    </div>

                    <div className="mt-5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {t('items.permissions.users')}
                    </div>
                    {point.grants.length === 0 ? (
                      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                        {t('items.permissions.noUsers')}
                      </p>
                    ) : (
                      <div className="mt-1 divide-y divide-neutral-200 dark:divide-neutral-800">
                        {point.grants.map((grant) => (
                          <div
                            key={grant.userId}
                            className="flex items-center justify-between gap-x-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">
                                {grant.profile?.name ??
                                  availableUsers.get(grant.userId)?.profile
                                    .name ??
                                  grant.userId}
                              </div>
                              <div className="truncate text-xs text-neutral-400">
                                {grant.userId}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              disabled={savingKey === point.key}
                              aria-label={t('items.permissions.revoke')}
                              onClick={() => revoke(point.key, grant.userId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </AppLayout>
    </>
  )
}

export default Permissions

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { locale = 'cn' } = context
  let initialData = EMPTY_DATA
  let initialNoPermission = false

  try {
    const response = await http.get('GetPermissions', undefined, {
      enableOnlyWithAuthInServerSide: true,
      silentAuthError: true,
      ignoreForbidden: true,
      serverSideCtx: context,
    })
    initialData = response?.data ?? EMPTY_DATA
  } catch (error: any) {
    initialNoPermission =
      error?.status === 403 || error?.response?.status === 403
  }

  return {
    props: {
      locale,
      initialData,
      initialNoPermission,
      ...(await serverSideTranslations(locale, ['common', 'tools', 'toast'])),
    },
  }
}
