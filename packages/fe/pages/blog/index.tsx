import dayjs from 'dayjs'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import AppLayout from '../../components/app-layout/AppLayout'
import { BlogConfig, IBlogConfig } from '../../config/blog'

type BlogProps = {
  blogs: IBlogConfig[]
}

export default function Blog(props: BlogProps) {
  const { blogs } = props

  const router = useRouter()

  const { t } = useTranslation('common')

  const handleClickLink = (blog: IBlogConfig) => {
    router.push(`/blog/markdowns/${blog.path}?key=${blog.key}`)
  }

  return (
    <AppLayout>
      <article className="prose prose-sm prose-neutral dark:prose-invert sm:prose-base lg:prose-lg mb-6 sm:mx-auto sm:mb-12 sm:mt-0 md:mt-4">
        <h1>{t('nav.blog')}</h1>
        {blogs.length === 0 && <figure>{t('noBlog')}</figure>}
        {blogs.map((blog) => (
          <div key={blog.key} className="mb-4">
            <a className="cursor-pointer" onClick={() => handleClickLink(blog)}>
              <h3 className="!m-0">{blog.title}</h3>
            </a>
            <figcaption className="m-0 !mt-1">
              {dayjs(blog.time).format('MMM DD, YYYY')}
              {blog.keywords?.map((k, _i) => (
                <span key={k}>{` #${k}`}</span>
              ))}
            </figcaption>
          </div>
        ))}
      </article>
    </AppLayout>
  )
}

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
      blogs: BlogConfig,
    },
  }
}
