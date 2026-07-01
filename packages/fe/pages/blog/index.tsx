import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useUser } from '@hooks/useUser'
import { http } from '@services/http'
import { time } from '@utils/time'
import cx from 'classnames'
import { debounce } from 'lodash'
import { Pencil, Search } from 'lucide-react'
import { GetServerSidePropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import AppLayout from '../../components/app-layout/AppLayout'
import { IBlogConfig } from '../../types/blog'

type BlogProps = {
  blogs: IBlogConfig[]
  pinnedBlogs: IBlogConfig[]
  locale: string
}

export default function Blog(props: BlogProps) {
  const { blogs: initialBlogs, pinnedBlogs: initialPinnedBlogs } = props
  const router = useRouter()
  const locale = props.locale ?? router.locale

  const { t } = useTranslation('common')
  const { t: tBlog } = useTranslation('blog')

  const [blogs, setBlogs] = useState<IBlogConfig[]>(initialBlogs)
  const [pinnedBlogs, setPinnedBlogs] =
    useState<IBlogConfig[]>(initialPinnedBlogs)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const hasSearchTyped = useRef(false)

  const debouncedSearch = useRef(
    debounce(async (search: string) => {
      setIsSearching(true)
      try {
        const response = await http.get('GetBlogList', {
          page: 1,
          pageSize: 1000,
          search: search || undefined,
          includePinned: true,
        })
        setBlogs(response.data.data as IBlogConfig[])
        setPinnedBlogs((response.data.pinnedData || []) as IBlogConfig[])
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsSearching(false)
      }
    }, 300),
  ).current

  const user = useUser()

  const groupedBlogsByYear = blogs.reduce(
    (acc, blog) => {
      const year = new Date(blog.time).getFullYear()
      if (!acc[year]) {
        acc[year] = []
      }
      acc[year].push(blog)
      return acc
    },
    {} as Record<number, IBlogConfig[]>,
  )

  const sortedYear = (() => {
    if (!blogs?.length) {
      return []
    }
    const arr = [...Object.keys(groupedBlogsByYear)].map(Number)
    arr.sort((x, y) => y - x)
    return arr
  })()

  // 清理 debounce 函数
  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  // 当搜索词改变时触发搜索
  useEffect(() => {
    if (!hasSearchTyped.current && !searchTerm) {
      return
    }
    debouncedSearch(searchTerm)
  }, [searchTerm, debouncedSearch])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    hasSearchTyped.current = true
    setSearchTerm(e.target.value)
  }

  const getLocalizedHref = (href: string) => {
    if (locale === 'cn') {
      return `/cn${href}`
    }
    return href
  }

  const getBlogHref = (blog: IBlogConfig) => {
    const blogKey = encodeURIComponent(blog.key)

    if (blog.hasPublished === false) {
      return getLocalizedHref(`/blog/edit?id=${blogKey}`)
    }

    if (blog.hasPublished === true) {
      return getLocalizedHref(`/blog/id/${blogKey}`)
    }

    return getLocalizedHref(`/blog/markdowns/${blogKey}?key=${blogKey}`)
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
        <article className="prose prose-sm prose-neutral dark:prose-invert sm:prose-base lg:prose-lg mb-6 mx-[-0.5rem] mt-[-0.5rem] sm:mx-auto sm:mb-12 sm:mt-2 max-w-[600px]">
          <div className="flex w-full mb-6 gap-x-2">
            <div className="flex-1 relative">
              <Input
                placeholder={tBlog('search')}
                className="flex-1 rounded-full !pl-8 h-9 text-[0.85rem]"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <Search
                className={cx(
                  'absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400',
                  {
                    'animate-pulse': isSearching,
                  },
                )}
              />
            </div>
            {user?.isAdmin && (
              <Link
                href={getLocalizedHref('/blog/edit')}
                locale={false}
                className="rounded-full flex items-center gap-x-1.5 bg-neutral-100 dark:bg-neutral-800 p-2 px-3 cursor-pointer"
              >
                <Pencil className="w-2.5 h-2.5" />
                <span className="text-xs">{tBlog('newBlog')}</span>
              </Link>
            )}
          </div>
          <div className="mx-2 mt-2 sm:mt-8">
            {!isSearching && blogs.length === 0 && pinnedBlogs.length === 0 && (
              <span className="opacity-60 text-sm">{t('noBlog')}</span>
            )}
            {pinnedBlogs.length > 0 && (
              <div className="flex mb-8 sm:mb-12">
                <span className="w-[8.5rem] sm:w-[12.5rem] shrink-0 relative top-0 text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Pined
                </span>
                <div className="flex flex-col gap-y-3 sm:gap-y-4">
                  {pinnedBlogs.map((blog) => (
                    <div key={blog.key} className="flex flex-col">
                      <Link
                        href={getBlogHref(blog)}
                        locale={false}
                        className="flex items-center gap-x-1 cursor-pointer no-underline"
                      >
                        <span className="!m-0 text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100 hover:underline">
                          {blog.title}
                        </span>
                        {blog.hasPublished === false && (
                          <Badge className="!bg-neutral-100 !text-neutral-500 dark:!bg-neutral-800 dark:!text-white text-[10px] p-0 px-1 w-fit h-fit">
                            Draft
                          </Badge>
                        )}
                        {blog.hidden2Public && (
                          <Badge className="!bg-neutral-100 !text-neutral-500 dark:!bg-neutral-800 dark:!text-white text-[10px] p-0 px-1 w-fit h-fit">
                            Non-Public
                          </Badge>
                        )}
                      </Link>
                      <span className="text-xs mt-[0.05rem] sm:mt-0 font-medium opacity-60">
                        {time.format(blog.time, 'dateWithoutYear')}
                        {blog.keywords?.length ? ', ' : ''}
                        {blog.keywords?.map((k, _i) => (
                          <span key={k}>{` #${k}`}</span>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sortedYear.map((year) => (
              <div key={year} className="flex mb-8 sm:mb-12">
                <span
                  className={cx(
                    'w-[8.5rem] sm:w-[12.5rem] shrink-0 relative text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100',
                    groupedBlogsByYear?.[year]?.length > 1 ? 'top-0' : 'top-1',
                  )}
                >
                  {year}
                </span>
                <div className="flex flex-col gap-y-3 sm:gap-y-4">
                  {groupedBlogsByYear?.[year].map?.((blog, _idx) => (
                    <div key={blog.key} className="flex flex-col">
                      <Link
                        href={getBlogHref(blog)}
                        locale={false}
                        className="flex items-center gap-x-1 cursor-pointer no-underline"
                      >
                        <span className="!m-0 text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100 hover:underline">
                          {blog.title}
                        </span>
                        {blog.hasPublished === false && (
                          <Badge className="!bg-neutral-100 !text-neutral-500 dark:!bg-neutral-800 dark:!text-white text-[10px] p-0 px-1 w-fit h-fit">
                            Draft
                          </Badge>
                        )}
                        {blog.hidden2Public && (
                          <Badge className="!bg-neutral-100 !text-neutral-500 dark:!bg-neutral-800 dark:!text-white text-[10px] p-0 px-1 w-fit h-fit">
                            Non-Public
                          </Badge>
                        )}
                      </Link>
                      <span className="text-xs mt-[0.05rem] sm:mt-0 font-medium opacity-60">
                        {time.format(blog.time, 'dateWithoutYear')}
                        {blog.keywords?.length ? ', ' : ''}
                        {blog.keywords?.map((k, _i) => (
                          <span key={k}>{` #${k}`}</span>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
      </AppLayout>
    </>
  )
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const { locale } = ctx

  const [blogData] = await Promise.all([
    http.get(
      'GetBlogList',
      {
        page: 1,
        pageSize: 200,
        includePinned: true,
      },
      {
        serverSideCtx: ctx,
      },
    ),
  ])
  const blogs = blogData?.data?.data || []
  const pinnedBlogs = blogData?.data?.pinnedData || []

  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'toast', 'blog'])),
      blogs,
      pinnedBlogs,
      locale,
    },
  }
}
