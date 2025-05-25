import { Skeleton } from '@/components/ui/skeleton'
import { useLogin } from '@hooks/useLogin'
import { CommentsResponseDto } from '@server/modules/blog/dto/comment'
import { http } from '@services/http'
import dayjs from 'dayjs'
import { Eye, Heart } from 'lucide-react'
import Head from 'next/head'
import React, { useCallback, useEffect, useRef, useState } from 'react'
// import { useTranslation } from 'react-i18next'
import { IBlogConfig } from '../../types/blog'
import AppLayout from '../app-layout/AppLayout'
import MdxLayout from '../mdx-layout'
import { Comments } from './common/comment/comments'
import { CommentEdit } from './common/comment/edit'

interface IBlogContainer {
  children: React.ReactNode
  meta: IBlogConfig
}

export const BlogContainer: React.FC<IBlogContainer> = (props) => {
  const { children, meta } = props

  const [viewCnt, setViewCnt] = useState(0)
  const [likeCnt, setLikeCnt] = useState(0)
  const [isLiked, setIsLiked] = useState(false)

  const [comments, setComments] = useState<CommentsResponseDto['comments']>([])

  useEffect(() => {
    http
      .get('GetBlogComments', {
        blogId: meta.key,
      })
      .then((res) => {
        if (res.isSuccess && res?.data?.comments?.length) {
          setComments(res.data.comments)
        }
      })
  }, [meta])

  const loading = useRef(false)

  const { isLogin } = useLogin()

  // const { t, i18n } = useTranslation('common')
  // const currentLang = i18n.language

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
        blogId: meta.key,
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
        blogId: meta.key,
      })
      .then((res) => {
        if (res.isSuccess && res?.data?.comments?.length) {
          setComments(res.data.comments)
        }
      })
  }, [meta])

  useEffect(() => {
    http
      .post('PostBlogView', {
        blogId: meta.key,
        blogTitle: meta.title,
      })
      .then(() => {
        return http.get('GetBlogMeta', {
          blogId: meta.key,
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
        <title>{meta.title}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </Head>
      <AppLayout authRequired={meta.authRequired} simplifiedFooter>
        {meta.coverImg && (
          <div className="relative w-dvw mx-[-1.25rem] aspect-[2/1] md:aspect-[3/1] lg:aspect-[4/1] mb-8 md:mb-12 lg:mb-16">
            <Skeleton className="w-full h-full absolute rounded-sm sm:rounded-none" />
            {/* biome-ignore lint/a11y/useAltText: <explanation> */}
            <img
              src={meta.coverImg}
              className="w-full h-full object-cover rounded-sm sm:rounded-none absolute top-0 left-0"
            />
          </div>
        )}
        <div className="m-auto max-w-[1000px] mt-[-1.5rem] flex justify-center">
          <MdxLayout>
            <h2 className="mb-2">{meta.title}</h2>
            <figcaption className="m-0 !mt-1 text-sm">
              {dayjs(meta.time).format('MMM DD, YYYY')}
              {meta.keywords?.length && <span> | </span>}
              {meta.keywords?.map((k, _i) => (
                <span key={k}>{` #${k}`}</span>
              ))}
            </figcaption>
            {children}
            <div className="flex items-center gap-3 mt-12">
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
              <CommentEdit blogId={meta.key} onSubmit={fetchComments} />
              <Comments comments={comments} />
            </div>
          </MdxLayout>
        </div>
      </AppLayout>
    </>
  )
}
