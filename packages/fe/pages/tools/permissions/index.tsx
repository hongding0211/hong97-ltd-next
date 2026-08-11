import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import AppLayout from '@components/app-layout/AppLayout'
import { PermissionManagementResponseDto } from '@server/modules/permissions/dto/permission.dto'
import { http } from '@services/http'
import { ChevronRight, CircleSlash, ShieldCheck } from 'lucide-react'
import { GetServerSidePropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import { useRouter } from 'next/router'

interface PermissionsProps {
  locale: string
  initialData: PermissionManagementResponseDto
  initialNoPermission: boolean
}

const EMPTY_DATA: PermissionManagementResponseDto = {
  points: [],
}

function Permissions({
  locale,
  initialData,
  initialNoPermission,
}: PermissionsProps) {
  const { t } = useTranslation('tools')
  const { t: tCommon } = useTranslation('common')
  const router = useRouter()

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

          {initialNoPermission ? (
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
          ) : initialData.points.length === 0 ? (
            <p className="mt-12 text-sm text-neutral-500 dark:text-neutral-400">
              {t('items.permissions.empty')}
            </p>
          ) : (
            <div className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {initialData.points.map((point) => (
                <button
                  key={point.key}
                  type="button"
                  className="flex w-full items-center justify-between gap-x-4 py-4 text-left"
                  onClick={() =>
                    router.push(
                      `/tools/permissions/${encodeURIComponent(point.key)}`,
                    )
                  }
                >
                  <div className="flex min-w-0 items-center gap-x-3">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-neutral-500" />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{point.key}</div>
                      <div className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                        {t('items.permissions.grantCount', {
                          count: point.grantCount,
                        })}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </button>
              ))}
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
