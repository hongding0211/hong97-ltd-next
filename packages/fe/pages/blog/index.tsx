import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useIsAdmin } from '@hooks/useIsAdmin'
import { http } from '@services/http'
import { time } from '@utils/time'
import { debounce } from 'lodash'
import { Loader2, Pencil, Search } from 'lucide-react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AppLayout from '../../components/app-layout/AppLayout'
import { IBlogConfig } from '../../types/blog'

type BlogProps = {
  blogs: IBlogConfig[]
  locale: string
}

export default function Blog(props: BlogProps) {
  const { blogs: initialBlogs, locale } = props

  time.setLocale(locale)

  const { t } = useTranslation('common')
  const { t: tBlog } = useTranslation('blog')

  const { isAdmin } = useIsAdmin()

  const [blogs, setBlogs] = useState<IBlogConfig[]>(initialBlogs)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const debouncedSearch = useRef(
    debounce(async (search: string) => {
      setIsSearching(true)
      try {
        const response = await http.get('GetBlogList', {
          page: 1,
          pageSize: 1000,
          search: search || undefined,
        })
        setBlogs(response.data.data as IBlogConfig[])
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsSearching(false)
      }
    }, 300),
  ).current

  // 清理 debounce 函数
  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  // 当搜索词改变时触发搜索
  useEffect(() => {
    if (!searchTerm) {
      return
    }
    debouncedSearch(searchTerm)
  }, [searchTerm, debouncedSearch])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleClickLink = (blog: IBlogConfig) => {
    window.open(
      `${window.location.href}/markdowns/${blog.key}?key=${blog.key}`,
      '_blank',
    )
  }

  const handleAdd = () => {
    window.open(`${window.location.href}/edit`, '_blank')
  }

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
        <article className="prose prose-sm prose-neutral dark:prose-invert sm:prose-base lg:prose-lg mb-6 sm:mx-auto sm:mb-12 mt-2 md:mt-6">
          <div className="flex w-full mb-6 gap-x-2">
            <div className="flex-1 relative">
              <Input
                placeholder={tBlog('search')}
                className="flex-1 rounded-full !pl-9"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              {isSearching ? (
                <Loader2 className="absolute left-3 top-3  w-4 h-4 text-gray-400 animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              )}
            </div>
            {isAdmin && (
              <div
                className="rounded-full flex items-center gap-x-1.5 bg-neutral-100 dark:bg-neutral-800 p-2 px-3 cursor-pointer"
                onClick={handleAdd}
              >
                <Pencil className="w-2.5 h-2.5" />
                <span className="text-xs">{tBlog('newBlog')}</span>
              </div>
            )}
          </div>
          <div className="px-2 mt-7 sm:mt-10 flex flex-col">
            {!isSearching && blogs.length === 0 && (
              <span className="opacity-60">{t('noBlog')}</span>
            )}
            {blogs.map((blog, idx) => (
              <div key={blog.key} className="flex flex-col">
                <a
                  className="flex items-center gap-x-1 cursor-pointer no-underline"
                  onClick={() => handleClickLink(blog)}
                >
                  <span className="!m-0 text-base sm:text-lg">
                    {blog.title}
                  </span>
                  {blog.authRequired && (
                    <Badge className="!bg-neutral-200 !text-neutral-600 dark:!bg-neutral-700 dark:!text-white text-[10px] p-0 px-1 w-fit h-fit">
                      Non-Public
                    </Badge>
                  )}
                </a>
                <span className="text-sm opacity-70">
                  {time.format(blog.time, 'date')}
                  {blog.keywords?.map((k, _i) => (
                    <span key={k}>{` #${k}`}</span>
                  ))}
                </span>
                {idx !== blogs.length - 1 && (
                  <div className="w-full h-[1px] bg-neutral-200 dark:bg-neutral-800 my-3" />
                )}
              </div>
            ))}
          </div>
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
      ...(await serverSideTranslations(locale, ['common', 'toast', 'blog'])),
      blogs,
      locale,
    },
  }
}
