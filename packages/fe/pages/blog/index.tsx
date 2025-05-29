import { Badge } from '@/components/ui/badge'
import { http } from '@services/http'
import dayjs from 'dayjs'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import AppLayout from '../../components/app-layout/AppLayout'
import { IBlogConfig } from '../../types/blog'

type BlogProps = {
  blogs: IBlogConfig[]
}

export default function Blog(props: BlogProps) {
  const { blogs } = props

  const router = useRouter()

  const { t } = useTranslation('common')

  const handleClickLink = (blog: IBlogConfig) => {
    router.push(`/blog/markdowns/${blog.key}?key=${blog.key}`)
  }

  const groupedBlogs = blogs
    .reduce<[string, IBlogConfig[]][]>(
      (acc, blog) => {
        const year = dayjs(blog.time).format('YYYY')
        const existingYearIndex = acc.findIndex(([y]) => y === year)

        if (existingYearIndex === -1) {
          acc.push([year, [blog]])
        } else {
          acc[existingYearIndex][1].push(blog)
        }
        return acc
      },
      [] as [string, IBlogConfig[]][],
    )
    .sort(([yearA], [yearB]) => yearB.localeCompare(yearA))

  return (
    <>
      <Head>
        <title>{t('nav.blog')}</title>
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
      <AppLayout>
        <article className="prose prose-sm prose-neutral dark:prose-invert sm:prose-base lg:prose-lg mb-6 sm:mx-auto sm:mb-12 mt-4 sm:mt-4 md:mt-8">
          {blogs.length === 0 && <figure>{t('noBlog')}</figure>}
          {groupedBlogs.map(([year, blogs], idx) => (
            <div key={year}>
              <div
                className="mb-2"
                style={{ marginTop: idx === 0 ? '0' : '3rem' }}
              >
                <h2 className="!m-0"># {year}</h2>
              </div>
              {blogs.map((blog) => (
                <div key={blog.key} className="mb-5">
                  <a
                    className="flex items-center gap-x-1 cursor-pointer no-underline"
                    onClick={() => handleClickLink(blog)}
                  >
                    <h4 className="!m-0">{blog.title}</h4>
                    {blog.authRequired && (
                      <Badge className="!bg-neutral-200 !text-neutral-600 dark:!bg-neutral-700 dark:!text-white text-[10px] p-0 px-1 w-fit h-fit">
                        Non-Public
                      </Badge>
                    )}
                  </a>
                  <figcaption className="m-0 !mt-0.5 !text-sm">
                    {dayjs(blog.time).format('MMM DD, YYYY')}
                    {blog.keywords?.map((k, _i) => (
                      <span key={k}>{` #${k}`}</span>
                    ))}
                  </figcaption>
                </div>
              ))}
            </div>
          ))}
        </article>
      </AppLayout>
    </>
  )
}

export async function getServerSideProps({ locale }: any) {
  const blogs = (
    await http.get('GetBlogList', {
      page: 1,
      pageSize: 1000,
    })
  ).data.data
  // TODO - HongD 05/27 01:26 加一个错误处理页面
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'toast'])),
      blogs,
    },
  }
}
