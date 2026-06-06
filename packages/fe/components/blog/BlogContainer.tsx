import { GridPattern } from '@/components/ui/grid-pattern'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useGeneralContext } from '@components/hoc/general-context/GeneralContext'
import { useLogin } from '@hooks/useLogin'
import { CommentsResponseDto } from '@server/modules/blog/dto/comment.dto'
import { BlogAPIS } from '@services/blog/types'
import { http } from '@services/http'
import {
  type BlogTocItem,
  normalizeBlogTocItems,
  slugifyBlogHeading,
} from '@utils/blog-toc'
import { time } from '@utils/time'
import { toast } from '@utils/toast'
import {
  Eye,
  EyeClosed,
  Heart,
  Pencil,
  Share2,
  TableOfContents,
  X,
} from 'lucide-react'
import { useTranslation } from 'next-i18next'
import Head from 'next/head'
import Link from 'next/link'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import AppLayout from '../app-layout/AppLayout'
import { BlogToc } from './BlogToc'
import { CommentAction, Comments } from './common/comment/comments'
import { CommentEdit } from './common/comment/edit'
import MdxLayout from './mdx-layout'

interface IBlogContainer {
  children: React.ReactNode
  meta: BlogAPIS['GetBlogMeta']['responseData']
  locale: string
  isAdmin?: boolean
  tocItems?: BlogTocItem[]
}

export const BlogContainer: React.FC<IBlogContainer> = (props) => {
  const {
    children,
    meta: initMeta,
    isAdmin: initIsAdmin,
    tocItems = [],
  } = props

  const [meta, setMeta] = useState(initMeta)
  const [generatedTocItems, setGeneratedTocItems] = useState<BlogTocItem[]>([])
  const [showSidebarTitle, setShowSidebarTitle] = useState(false)
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false)
  const [isCoverVisualVisible, setIsCoverVisualVisible] = useState(true)
  const [isCommentSectionVisible, setIsCommentSectionVisible] = useState(false)
  const effectiveTocItems = tocItems.length ? tocItems : generatedTocItems
  const firstEffectiveTocId = effectiveTocItems[0]?.id
  const [activeTocId, setActiveTocId] = useState(firstEffectiveTocId)

  const [viewCnt, setViewCnt] = useState(meta.viewCount)
  const [likeCnt, setLikeCnt] = useState(meta.likeCount)
  const [isLiked, setIsLiked] = useState(meta.isLiked)

  const [comments, setComments] = useState<CommentsResponseDto['comments']>([])

  const [shortCode, setShortCode] = useState(meta.shortCode)

  const { user } = useGeneralContext()

  const isAdmin = initIsAdmin ?? user?.isAdmin ?? false

  const showShareIcon = !!(isAdmin || shortCode)

  const showEdit = isAdmin && meta?.hasPublished !== undefined

  useEffect(() => {
    http
      .get('GetBlogComments', {
        blogId: meta.blogId,
      })
      .then((res) => {
        if (res.isSuccess && res?.data?.comments?.length) {
          setComments(res.data.comments)
        }
      })
  }, [meta])

  const loading = useRef(false)
  const coverVisualRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const commentSectionRef = useRef<HTMLDivElement>(null)
  const scrollSpyLockRef = useRef<string | null>(null)
  const scrollSpyUnlockTimerRef = useRef<number | undefined>(undefined)

  const { isLogin } = useLogin()

  const { t } = useTranslation('blog')

  const handleLike = () => {
    if (loading.current) {
      return
    }
    if (isLiked && !isLogin) {
      return
    }
    loading.current = true
    setLikeCnt((c) => c + (isLiked ? -1 : 1))
    setIsLiked(!isLiked)
    http
      .post('PostBlogLike', {
        blogId: meta.blogId,
      })
      .then((res) => {
        if (!res.isSuccess) {
          return
        }
        setLikeCnt(res.data.likeCount)
        if (isLogin) {
          setIsLiked(res.data.isLiked)
        }
      })
      .finally(() => {
        loading.current = false
      })
  }

  const fetchComments = useCallback(() => {
    http
      .get('GetBlogComments', {
        blogId: meta.blogId,
      })
      .then((res) => {
        if (res.isSuccess && res?.data?.comments?.length !== undefined) {
          setComments(res.data.comments)
        }
      })
  }, [meta])

  const handleCommentAction = (commentId: string, action: CommentAction) => {
    if (action === 'delete') {
      http
        .delete('DeleteBlogComment', {
          commentId,
          blogId: meta.blogId,
        })
        .then((res) => {
          if (res.isSuccess) {
            fetchComments()
          } else {
            toast(res.msg, {
              type: 'error',
            })
          }
        })
    }
  }

  const handleShare = async () => {
    let _shortCode = shortCode
    if (!_shortCode) {
      try {
        // create a short link
        const originalUrl = (() => {
          if (meta.hasPublished !== undefined) {
            return `${window.location.origin}/blog/id/${meta.blogId}`
          }
          return `${window.location.origin}/blog/markdowns/${meta.blogId}?key=${meta.blogId}`
        })()
        const createRes = await http.post('PostShortLinkCreate', {
          originalUrl,
          title: meta.blogTitle,
        })
        if (!createRes.isSuccess || !createRes?.data?.shortCode) {
          toast('blog.shortLinkCopyFailed', { type: 'error' })
          return
        }
        await http.put('PutBlogMeta', {
          blogId: meta.blogId,
          shortCode: createRes.data.shortCode,
        })
        _shortCode = createRes.data.shortCode
        setShortCode(_shortCode)
      } catch {
        return
      }
    }
    const host = window.location.origin
    const shortUrl = `${host}/s/${_shortCode}`
    navigator.clipboard.writeText(shortUrl)
    toast('blog.shortLinkCopySuccess', { type: 'success' })
  }

  const refetchMeta = async () => {
    try {
      const res = await http.get('GetBlogMeta', {
        blogId: meta.blogId,
      })
      if (res.isSuccess && res.data) {
        setMeta(res.data)
      }
    } catch {
      // noop
    }
  }

  const handleToggleHidden = async () => {
    if (!isAdmin) {
      return
    }
    try {
      await http.put('PutBlogMeta', {
        blogId: meta.blogId,
        hidden2Public: !meta?.hidden2Public,
      })
      toast('blog.saveSuccess', { type: 'success' })
    } catch {
      // noop
    } finally {
      await refetchMeta()
    }
  }

  useEffect(() => {
    http
      .post('PostBlogView', {
        blogId: meta.blogId,
      })
      .then(() => {
        return http.get('GetBlogMeta', {
          blogId: meta.blogId,
        })
      })
      .then((res) => {
        if (!res.isSuccess) {
          return
        }
        setViewCnt(res.data.viewCount)
        setLikeCnt(res.data.likeCount)
        setIsLiked(res.data.isLiked)
      })
  }, [meta])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // biome-ignore lint/correctness/useExhaustiveDependencies: fallback TOC must regenerate when the rendered MDX content changes.
  useEffect(() => {
    if (tocItems.length || !contentRef.current) {
      setGeneratedTocItems([])
      return
    }

    const usedSlugs = new Map<string, number>()
    const headings = Array.from(
      contentRef.current.querySelectorAll('h1, h2, h3, h4'),
    ) as HTMLHeadingElement[]

    const nextTocItems = headings.map((heading, index) => {
      const title = heading.textContent?.trim() || `Section ${index + 1}`
      const baseSlug = slugifyBlogHeading(title) || `heading-${index + 1}`
      const usedCount = usedSlugs.get(baseSlug) || 0
      const id =
        heading.id || (usedCount ? `${baseSlug}-${usedCount + 1}` : baseSlug)

      usedSlugs.set(baseSlug, usedCount + 1)
      heading.id = id

      return {
        id,
        title,
        level: Number(heading.tagName.slice(1)) as 1 | 2 | 3 | 4,
      }
    })

    setGeneratedTocItems(normalizeBlogTocItems(nextTocItems))
  }, [children, meta.blogId, tocItems.length])

  useEffect(() => {
    setActiveTocId(firstEffectiveTocId)
  }, [firstEffectiveTocId])

  useEffect(() => {
    if (!firstEffectiveTocId) {
      return
    }

    const headings = effectiveTocItems
      .map((item) => document.getElementById(item.id))
      .filter((heading): heading is HTMLElement => !!heading)

    const updateActiveHeading = () => {
      const offset = 180
      const fallbackId = headings[0]?.id || firstEffectiveTocId
      const titleBottom = titleRef.current?.getBoundingClientRect().bottom ?? 0
      let nextActiveId = fallbackId

      if (scrollSpyLockRef.current) {
        const lockedHeading = document.getElementById(scrollSpyLockRef.current)
        const lockedTop = lockedHeading?.getBoundingClientRect().top

        if (lockedTop === undefined || Math.abs(lockedTop - 150) > 8) {
          return
        }

        scrollSpyLockRef.current = null
      }

      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= offset) {
          nextActiveId = heading.id
        } else {
          break
        }
      }

      setActiveTocId((currentId) =>
        currentId === nextActiveId ? currentId : nextActiveId,
      )
      setShowSidebarTitle((current) => {
        const next = titleBottom <= 130
        return current === next ? current : next
      })
    }

    updateActiveHeading()
    window.addEventListener('scroll', updateActiveHeading, { passive: true })
    window.addEventListener('resize', updateActiveHeading)

    return () => {
      window.removeEventListener('scroll', updateActiveHeading)
      window.removeEventListener('resize', updateActiveHeading)
      window.clearTimeout(scrollSpyUnlockTimerRef.current)
    }
  }, [effectiveTocItems, firstEffectiveTocId])

  const scrollToHeading = (id: string) => {
    const heading = document.getElementById(id)

    if (!heading) {
      return
    }

    const offset = 150
    const top = heading.getBoundingClientRect().top + window.scrollY - offset

    scrollSpyLockRef.current = id
    window.clearTimeout(scrollSpyUnlockTimerRef.current)
    scrollSpyUnlockTimerRef.current = window.setTimeout(() => {
      scrollSpyLockRef.current = null
    }, 900)

    window.scrollTo({
      top,
      behavior: 'smooth',
    })
  }

  const scrollToTitle = () => {
    window.clearTimeout(scrollSpyUnlockTimerRef.current)
    scrollSpyLockRef.current = null

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const hasToc = effectiveTocItems.length > 0
  const showMobileToc =
    hasToc && !isCoverVisualVisible && !isCommentSectionVisible

  useEffect(() => {
    const coverVisual = coverVisualRef.current

    if (!coverVisual) {
      setIsCoverVisualVisible(false)
      return
    }

    const updateCoverVisibility = () => {
      const rect = coverVisual.getBoundingClientRect()
      const nextVisible = rect.bottom > 0 && rect.top < window.innerHeight

      setIsCoverVisualVisible((current) =>
        current === nextVisible ? current : nextVisible,
      )

      if (nextVisible) {
        setIsMobileTocOpen(false)
      }
    }

    if (typeof IntersectionObserver === 'undefined') {
      updateCoverVisibility()
      window.addEventListener('scroll', updateCoverVisibility, {
        passive: true,
      })
      window.addEventListener('resize', updateCoverVisibility)

      return () => {
        window.removeEventListener('scroll', updateCoverVisibility)
        window.removeEventListener('resize', updateCoverVisibility)
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextVisible = entry.isIntersecting

        setIsCoverVisualVisible((current) =>
          current === nextVisible ? current : nextVisible,
        )

        if (nextVisible) {
          setIsMobileTocOpen(false)
        }
      },
      { threshold: 0 },
    )

    observer.observe(coverVisual)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const commentSection = commentSectionRef.current

    if (!commentSection) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextVisible = entry.isIntersecting

        setIsCommentSectionVisible(nextVisible)

        if (nextVisible) {
          setIsMobileTocOpen(false)
        }
      },
      { threshold: 0.01 },
    )

    observer.observe(commentSection)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!isMobileTocOpen) {
      return
    }

    const originalBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalBodyOverflow
    }
  }, [isMobileTocOpen])

  return (
    <>
      <Head>
        <title>{meta.blogTitle}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </Head>
      <AppLayout authRequired={meta.authRequired} simplifiedFooter>
        <div className="relative w-dvw mx-[-1.25rem] mt-[-1.25rem] aspect-[2/1] md:aspect-[3/1] lg:aspect-[4/1] mb-8 md:mb-12 lg:mb-16">
          <div
            ref={coverVisualRef}
            className="pointer-events-none absolute inset-0"
          />
          {meta?.coverImg ? (
            <>
              <Skeleton className="w-full h-full absolute rounded-sm sm:rounded-none" />
              {/* biome-ignore lint/a11y/useAltText: <explanation> */}
              <img
                src={meta.coverImg}
                className="w-full h-full object-cover rounded-sm sm:rounded-none absolute top-0 left-0"
              />
            </>
          ) : (
            <div
              className={cn(
                '[mask-image:linear-gradient(to_bottom,transparent,white_5%,white_80%,transparent_100%)]',
                'w-full h-full',
              )}
            >
              <GridPattern
                squares={[
                  [4, 4],
                  [5, 1],
                  [8, 2],
                  [5, 3],
                  [5, 5],
                  [10, 10],
                  [12, 15],
                  [15, 10],
                  [10, 15],
                  [15, 10],
                  [10, 15],
                  [15, 10],
                ]}
                className={cn('inset-x-0 inset-y-[-50%] h-[300%] skew-y-12')}
              />
            </div>
          )}
        </div>
        <div
          className={cn(
            'm-auto mt-[-1.5rem]',
            hasToc
              ? 'blog-reading-shell--with-toc'
              : 'flex max-w-[1000px] justify-center',
          )}
        >
          {hasToc && (
            <aside className="blog-reading-toc hidden pt-[7rem] min-[800px]:block">
              <div className="sticky top-[8.5rem]">
                <BlogToc
                  items={effectiveTocItems}
                  activeId={activeTocId}
                  blogTitle={meta.blogTitle}
                  showBlogTitle={showSidebarTitle}
                  onTitleSelect={scrollToTitle}
                  onSelect={(id) => {
                    setActiveTocId(id)
                    scrollToHeading(id)
                  }}
                />
              </div>
            </aside>
          )}
          <MdxLayout>
            <h1 ref={titleRef} className="!mb-2 !text-4xl">
              {meta.blogTitle}
            </h1>
            <figcaption className="m-0 !mt-1 text-sm flex flex-wrap items-center gap-x-1 gap-y-1">
              <span className="shrink-0 whitespace-nowrap">
                {time.format(meta.time, 'datetimeShort')}
              </span>
              {!!meta.keywords?.length && <span className="shrink-0"> | </span>}
              {meta.keywords?.map((k, _i) => (
                <span
                  className="min-w-0 max-w-full break-all"
                  key={k}
                >{` #${k}`}</span>
              ))}
              {(showShareIcon || showEdit) && (
                <div className="flex shrink-0 items-center gap-x-1">
                  {showShareIcon && (
                    <div
                      onClick={handleShare}
                      className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                    </div>
                  )}
                  {showEdit && (
                    <>
                      <div className="rounded p-1 relative hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
                        <Link
                          href={`/blog/edit?id=${meta.blogId}`}
                          className="w-full h-full absolute top-0 left-0"
                        />
                        <Pencil className="w-3 h-3" />
                      </div>
                      <div
                        onClick={handleToggleHidden}
                        className="rounded p-1 relative hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      >
                        {meta?.hidden2Public ? (
                          <EyeClosed className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </figcaption>
            <div className="pt-2" ref={contentRef}>
              {children}
            </div>
            {meta.lastUpdateAt &&
              meta.time &&
              Math.abs(meta.lastUpdateAt - meta.time) > 15000 && (
                <figcaption className="text-neutral-400 dark:text-neutral-500 text-xs">
                  {`${t('lastUpdate')} ${time.formatDynamic(
                    meta?.lastUpdateAt,
                  )}`}
                </figcaption>
              )}
            <div className="flex items-center gap-3 mt-10">
              <div
                className="cursor-pointer flex items-center gap-1 text-neutral-500 dark:text-neutral-300 rounded-lg py-1 px-2 w-min bg-neutral-100 dark:bg-neutral-800"
                onClick={handleLike}
              >
                {isLiked ? (
                  <Heart className="w-4 h-4" fill="red" stroke="none" />
                ) : (
                  <Heart className="w-4 h-4" />
                )}
                <span className="text-sm">{likeCnt}</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-300  rounded-lg py-1 px-2 w-min bg-neutral-100 dark:bg-neutral-800">
                <Eye className="w-4 h-4" />
                <span className="text-sm">{viewCnt}</span>
              </div>
            </div>
            <div ref={commentSectionRef} className="flex flex-col mt-12">
              <CommentEdit blogId={meta.blogId} onSubmit={fetchComments} />
              <Comments comments={comments} onAction={handleCommentAction} />
            </div>
          </MdxLayout>
          {hasToc && (
            <div className="blog-reading-balance hidden min-[800px]:block" />
          )}
        </div>
        {showMobileToc && (
          <div
            aria-hidden={!isMobileTocOpen}
            className={cn(
              'fixed inset-0 z-40 min-[800px]:hidden transition-opacity duration-200 ease-out',
              isMobileTocOpen
                ? 'pointer-events-auto opacity-100'
                : 'pointer-events-none opacity-0',
            )}
            onClick={() => setIsMobileTocOpen(false)}
          >
            <div
              className={cn(
                'fixed inset-x-0 bottom-0 overflow-visible',
                'transition-opacity duration-200 ease-out',
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-x-0 -top-24 bottom-0',
                  'bg-white/85 backdrop-blur-xl backdrop-saturate-50 dark:bg-neutral-950/85',
                  '[mask-image:linear-gradient(to_bottom,transparent_0,black_96px,black_100%)]',
                )}
              />
              <div
                className={cn(
                  'relative flex w-full flex-col items-start overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-5',
                  'transition-all duration-300 ease-out',
                  isMobileTocOpen
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-2 opacity-0',
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileTocOpen(false)
                    scrollToTitle()
                  }}
                  className={cn(
                    'mb-4 max-w-full truncate text-left text-xs font-medium uppercase leading-5 text-neutral-500 dark:text-neutral-400',
                    'transition-all duration-300 ease-out',
                    isMobileTocOpen
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-1 opacity-0',
                  )}
                  style={{ transitionDelay: isMobileTocOpen ? '40ms' : '0ms' }}
                >
                  {meta.blogTitle}
                </button>
                <ol className="w-full space-y-1.5">
                  {effectiveTocItems.map((item, index) => {
                    const active =
                      (activeTocId || effectiveTocItems[0]?.id) === item.id

                    return (
                      <li
                        key={item.id}
                        className={cn(
                          'transition-all duration-300 ease-out',
                          isMobileTocOpen
                            ? 'translate-y-0 opacity-100'
                            : 'translate-y-1 opacity-0',
                        )}
                        style={{
                          transitionDelay: isMobileTocOpen
                            ? `${70 + index * 18}ms`
                            : `${Math.max(
                                0,
                                (effectiveTocItems.length - index - 1) * 8,
                              )}ms`,
                        }}
                      >
                        <a
                          href={`#${item.id}`}
                          onClick={(event) => {
                            event.preventDefault()
                            setActiveTocId(item.id)
                            setIsMobileTocOpen(false)
                            scrollToHeading(item.id)
                          }}
                          className={cn(
                            'block truncate py-1 text-left text-[15px] leading-6 text-neutral-500 transition-colors dark:text-neutral-400',
                            item.level === 2 && 'pl-4',
                            active &&
                              'font-medium text-neutral-900 dark:text-neutral-50',
                          )}
                        >
                          {item.title}
                        </a>
                      </li>
                    )
                  })}
                </ol>
              </div>
            </div>
          </div>
        )}
        {showMobileToc && (
          <button
            type="button"
            aria-label={isMobileTocOpen ? '关闭文章目录' : '打开文章目录'}
            aria-expanded={isMobileTocOpen}
            onClick={() => setIsMobileTocOpen((open) => !open)}
            className={cn(
              'fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-4 z-50 min-[800px]:hidden',
              'flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300/90',
              'bg-white/70 text-neutral-800 backdrop-blur',
              'transition active:scale-95 dark:border-neutral-700/90 dark:bg-neutral-950/70 dark:text-neutral-100',
            )}
          >
            <TableOfContents
              className={cn(
                'absolute h-[18px] w-[18px] transition-all duration-200 ease-out',
                isMobileTocOpen
                  ? 'rotate-90 scale-75 opacity-0'
                  : 'rotate-0 scale-100 opacity-100',
              )}
              strokeWidth={1.8}
            />
            <X
              className={cn(
                'absolute h-[18px] w-[18px] transition-all duration-200 ease-out',
                isMobileTocOpen
                  ? 'rotate-0 scale-100 opacity-100'
                  : '-rotate-90 scale-75 opacity-0',
              )}
              strokeWidth={1.8}
            />
          </button>
        )}
      </AppLayout>
    </>
  )
}
