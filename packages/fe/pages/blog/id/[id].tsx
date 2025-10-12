import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import AppLayout from '@components/app-layout/AppLayout'
import { BlogContainer } from '@components/blog/BlogContainer'
import { ImagesV2 } from '@components/common/images-v2'
import { BlogAPIS } from '@services/blog/types'
import { http } from '@services/http'
import { time } from '@utils/time'
import { Meh } from 'lucide-react'
import { GetServerSidePropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { MDXRemote } from 'next-mdx-remote'
import { serialize } from 'next-mdx-remote/serialize'
import rehypeStarryNight from 'rehype-starry-night'
import { customComponents } from '../../../mdx-components'

const components = {
  ImagesV2,
  ...customComponents,
}

export default function Page(props: {
  meta: BlogAPIS['GetBlogMeta']['responseData']
  locale: string
  source: any
  fail?: boolean
}) {
  const { meta, locale, source, fail } = props

  const { t } = useTranslation('blog')

  if (fail) {
    return (
      <AppLayout simplifiedFooter>
        <div className="w-[80%] mx-auto max-w-[400px] mt-24 md:mt-48">
          <Alert>
            <Meh className="w-4 h-4" />
            <AlertTitle>{t('oops')}</AlertTitle>
            <AlertDescription className="mt-5">
              <span className="font-semibold">{t('blogNotFound')}</span>
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    )
  }

  return (
    <BlogContainer meta={meta} locale={locale}>
      <MDXRemote {...source} components={components} />
    </BlogContainer>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { locale, query } = context

  const fallRes = {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'blog', 'toast'])),
      fail: true,
    },
  }

  if (!query?.id) {
    return fallRes
  }

  time.setLocale(locale)

  const [meta, content] = await Promise.all([
    http.get('GetBlogMeta', {
      blogId: query?.id as string,
    }),
    http.get('GetBlogContent', {
      blogId: query?.id as string,
    }),
  ])

  if (
    !meta?.isSuccess ||
    !meta?.data ||
    !content?.isSuccess ||
    !content?.data
  ) {
    return fallRes
  }

  const source = await serialize(content?.data?.content, {
    mdxOptions: {
      rehypePlugins: [rehypeStarryNight],
    },
  })

  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'blog', 'toast'])),
      meta: meta?.data,
      locale,
      source,
    },
  }
}
