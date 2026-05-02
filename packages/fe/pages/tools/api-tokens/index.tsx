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
import { ApiTokenResponseDto } from '@server/modules/auth/dto/api-token.dto'
import { http } from '@services/http'
import { toast } from '@utils/toast'
import { Copy, KeyRound, Loader2, Plus, Trash2 } from 'lucide-react'
import { GetStaticPropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import { useCallback, useEffect, useState } from 'react'

const formatDate = (date?: Date | string | null) => {
  if (!date) {
    return '-'
  }
  return new Date(date).toLocaleString()
}

function ApiTokens({ locale }: { locale: string }) {
  const { t } = useTranslation('tools')
  const { t: tCommon } = useTranslation('common')
  const [tokens, setTokens] = useState<ApiTokenResponseDto[]>([])
  const [name, setName] = useState('')
  const [newToken, setNewToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  const loadTokens = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.get('GetApiTokens')
      setTokens(res.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTokens()
  }, [loadTokens])

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value)
    toast('copySuccess', { type: 'success' })
  }

  const handleCreate = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast(t('items.api-tokens.nameRequired'), { type: 'error' })
      return
    }

    setCreating(true)
    try {
      const res = await http.post('PostApiToken', { name: trimmedName })
      setNewToken(res.data.apiToken)
      setName('')
      await loadTokens()
      toast(t('items.api-tokens.createSuccess'), { type: 'success' })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (token: ApiTokenResponseDto) => {
    if (
      !window.confirm(t('items.api-tokens.deleteConfirm', { name: token.name }))
    ) {
      return
    }

    await http.delete('DeleteApiToken', { tokenId: token.tokenId })
    await loadTokens()
    toast(t('items.api-tokens.deleteSuccess'), { type: 'success' })
  }

  return (
    <>
      <Head>
        <title>{t('items.api-tokens.title')}</title>
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
      <AppLayout simplifiedFooter authRequired>
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
                <BreadcrumbPage>{t('items.api-tokens.title')}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mt-10 flex flex-col gap-y-3">
            <div className="flex items-center gap-x-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('items.api-tokens.namePlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreate()
                  }
                }}
              />
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {t('items.api-tokens.create')}
              </Button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('items.api-tokens.description')}
            </p>
          </div>

          {newToken && (
            <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-center justify-between gap-x-3">
                <div className="flex flex-col gap-y-1 min-w-0">
                  <span className="font-semibold text-amber-800 dark:text-amber-200">
                    {t('items.api-tokens.createdTitle')}
                  </span>
                  <code className="break-all text-sm text-amber-900 dark:text-amber-100">
                    {newToken}
                  </code>
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    {t('items.api-tokens.createdHint')}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(newToken)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-y-1">
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
            {!loading && tokens.length === 0 && (
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {t('items.api-tokens.empty')}
              </span>
            )}
            {!loading &&
              tokens.map((token, index) => (
                <div key={token.tokenId}>
                  <div className="flex items-center justify-between gap-x-4 py-3">
                    <div className="flex items-center gap-x-3 min-w-0">
                      <KeyRound className="w-4 h-4 shrink-0 text-neutral-500" />
                      <div className="flex flex-col gap-y-1 min-w-0">
                        <span className="font-medium truncate">
                          {token.name}
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {token.tokenPrefix}… ·{' '}
                          {t('items.api-tokens.createdAt')}:{' '}
                          {formatDate(token.createdAt)} ·{' '}
                          {t('items.api-tokens.lastUsedAt')}:{' '}
                          {formatDate(token.lastUsedAt)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(token)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {index !== tokens.length - 1 && (
                    <div className="w-full h-[0.5px] bg-neutral-300 dark:bg-neutral-700" />
                  )}
                </div>
              ))}
          </div>
        </div>
      </AppLayout>
    </>
  )
}

export default ApiTokens

export async function getServerSideProps(context: GetStaticPropsContext) {
  const { locale = 'cn' } = context
  return {
    props: {
      locale,
      ...(await serverSideTranslations(locale, ['common', 'tools', 'toast'])),
    },
  }
}
