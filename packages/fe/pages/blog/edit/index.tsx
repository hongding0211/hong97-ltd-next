import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import AppLayout from '@components/app-layout/AppLayout'
import BlogCommon, { BlogMeta } from '@components/blog/edit/common'
import { http } from '@services/http'
import { toast } from '@utils/toast'
import { CircleSlash } from 'lucide-react'
import { GetServerSidePropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import { useState } from 'react'

interface EditPageProps {
  isAdmin: boolean
  id?: string
  meta: BlogMeta | null
  content: string
}

export default function Page(props: EditPageProps) {
  const { isAdmin, id, meta: initialMeta, content: initialContent } = props

  const [meta, setMeta] = useState<BlogMeta | null>(initialMeta)
  const [content, setContent] = useState(initialContent || '')

  const { t } = useTranslation('blog')

  const handleRefreshMeta = async () => {
    if (!id) {
      return
    }
    const res = await http.get('GetBlogMeta', {
      blogId: id,
    })
    setMeta(res?.data)
  }

  const handleCreateNew = async (meta: {
    title?: string
    coverImg?: string
    keywords?: string[]
  }) => {
    const res = await http.post('PostBlogNew', meta)
    if (!res?.isSuccess || !res?.data?.key) {
      toast(t('blog.failToCreateBlog'), { type: 'error' })
      return
    }
    const id = res.data.key
    window.location.href = `/blog/edit?id=${id}`
  }

  const component = (() => {
    if (!isAdmin) {
      return (
        <div className="flex justify-center">
          <div className="w-[80%] max-w-[400px] mt-24 md:mt-48">
            <Alert>
              <CircleSlash className="w-4 h-4" />
              <AlertTitle>{t('oops')}</AlertTitle>
              <AlertDescription className="mt-5">
                {t('edit.notAuthorized.description')}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )
    }
    return (
      <BlogCommon
        meta={meta}
        content={content}
        onContentChange={setContent}
        onRefreshMeta={handleRefreshMeta}
        onCreateNew={handleCreateNew}
      />
    )
  })()

  const pageTitle = (() => {
    if (!meta) {
      return t(id ? 'edit.editTitle' : 'edit.newTitle')
    }
    return `Edit - ${meta.blogTitle}`
  })()

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </Head>
      <AppLayout authRequired>{component}</AppLayout>
    </>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { locale, query } = context

  const [isAdminData] = await Promise.all([
    http.get('GetIsAdmin', undefined, {
      serverSideCtx: context,
      enableOnlyWithAuthInServerSide: true,
    }),
  ])

  const isAdmin = isAdminData?.data?.isAdmin || false

  const { id } = query || {}

  const meta = await (async () => {
    if (!id) {
      return null
    }
    const res = await http.get(
      'GetBlogMeta',
      {
        blogId: id as string,
      },
      {
        serverSideCtx: context,
      },
    )
    return res?.data || null
  })()

  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'blog', 'toast'])),
      locale,
      isAdmin,
      id: id ?? null,
      meta,
    },
  }
}
