import { GridPattern } from '@/components/ui/grid-pattern'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useGeneralContext } from '@components/hoc/general-context/GeneralContext'
import { useLogin } from '@hooks/useLogin'
import { CommentsResponseDto } from '@server/modules/blog/dto/comment.dto'
import { BlogAPIS } from '@services/blog/types'
import { http } from '@services/http'
import { time } from '@utils/time'
import { toast } from '@utils/toast'
import { Eye, EyeClosed, Heart, Pencil, Share2 } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import Head from 'next/head'
import Link from 'next/link'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import AppLayout from '../app-layout/AppLayout'
import { CommentAction, Comments } from './common/comment/comments'
import { CommentEdit } from './common/comment/edit'
import MdxLayout from './mdx-layout'

interface IBlogContainer {
  children: React.ReactNode
  meta: BlogAPIS['GetBlogMeta']['responseData']
  locale: string
  isAdmin?: boolean
}

export const BlogContainer: React.FC<IBlogContainer> = (props) => {
  const { children, meta: initMeta, isAdmin: initIsAdmin } = props

  const [meta, setMeta] = useState(initMeta)

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
        <div className="relative w-dvw mx-[-1.25rem] aspect-[2/1] md:aspect-[3/1] lg:aspect-[4/1] mb-8 md:mb-12 lg:mb-16">
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
        <div className="m-auto max-w-[1000px] mt-[-1.5rem] flex justify-center">
          <MdxLayout>
            <h2 className="mb-2">{meta.blogTitle}</h2>
            <figcaption className="m-0 !mt-1 text-sm flex items-center gap-x-1">
              {time.format(meta.time, 'datetimeShort')}
              {!!meta.keywords?.length && <span> | </span>}
              {meta.keywords?.map((k, _i) => (
                <span key={k}>{` #${k}`}</span>
              ))}
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
                      target="_blank"
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
            </figcaption>
            {children}
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
            <div className="flex flex-col mt-12">
              <CommentEdit blogId={meta.blogId} onSubmit={fetchComments} />
              <Comments comments={comments} onAction={handleCommentAction} />
            </div>
          </MdxLayout>
        </div>
      </AppLayout>
    </>
  )
}
