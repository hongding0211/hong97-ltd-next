import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ImagesV2 } from '@components/common/images-v2'
import { BlogAPIS } from '@services/blog/types'
import { http } from '@services/http'
import { convertImageToWebP, uploadFile2Oss } from '@utils/oss'
import { time } from '@utils/time'
import { toast } from '@utils/toast'
import cx from 'classnames'
import { debounce } from 'lodash'
import { useTranslation } from 'next-i18next'
import { MDXRemote } from 'next-mdx-remote'
import { serialize } from 'next-mdx-remote/serialize'
import { useRouter } from 'next/router'
import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import rehypeHighlight from 'rehype-highlight'
import { customComponents } from '../../../mdx-components'
import MdxLayout from '../mdx-layout'
import Actions from './actions'
import Content from './content'
import Cover from './cover'
import Keywords from './keywords'

const components = {
  ImagesV2,
  ...customComponents,
}

export type ActionLoading =
  | 'save'
  | 'publish'
  | 'coverChange'
  | 'coverRemove'
  | 'hidden'
  | 'delete'
  | null

export type BlogMeta = BlogAPIS['GetBlogMeta']['responseData']

interface IBlogCommon {
  meta?: BlogMeta
  content?: string
  onRefreshMeta?: () => Promise<void>
  onCreateNew?: (meta: {
    title?: string
    coverImg?: string
    keywords?: string[]
  }) => Promise<void>
}

const BlogCommon: React.FC<IBlogCommon> = (props) => {
  const { meta, content: initialContent, onRefreshMeta, onCreateNew } = props

  const [actionLoading, setActionLoading] = useState<ActionLoading>(null)

  const [mode, setMode] = useState<'edit' | 'preview'>('edit')

  const [content, setContent] = useState(initialContent || '')

  const [previewContent, setPreviewContent] = useState<any>()

  const [title, setTitle] = useState(meta?.blogTitle || '')
  const [coverImg, setCoverImg] = useState(meta?.coverImg || '')
  const [keywords, setKeywords] = useState<string[]>(meta?.keywords || [])

  const blogIdRef = useRef('')

  const uid = useId()

  const { t } = useTranslation('blog')

  const router = useRouter()

  const handleSave = useCallback(
    async (quiet?: boolean) => {
      if (actionLoading) {
        return
      }
      try {
        setActionLoading('save')
        if (!meta) {
          if (!title) {
            toast(t('blog.failToCreateBlogDue2EmptyTitle'), {
              type: 'error',
            })
            return
          }
          await onCreateNew?.({
            title,
            coverImg,
            keywords,
          })
        } else {
          const [res0, res1] = await Promise.all([
            http.put('PutBlogMeta', {
              blogId: meta.blogId,
              blogTitle: title,
              keywords,
            }),
            http.post('PostBlogContent', {
              blogId: meta.blogId,
              content,
            }),
          ])
          if (res0?.isSuccess && res1?.isSuccess && !quiet) {
            toast(t('blog.saveSuccess'), { type: 'success' })
          }
          await onRefreshMeta?.()
        }
      } finally {
        setActionLoading(null)
      }
    },
    [
      actionLoading,
      onRefreshMeta,
      onCreateNew,
      meta,
      title,
      coverImg,
      keywords,
      t,
      content,
    ],
  )

  const handlePublish = useCallback(async () => {
    setActionLoading('publish')
    try {
      await handleSave(true)
      await http.put('PutBlogMeta', {
        blogId: meta?.blogId,
        hasPublished: true,
        time: Date.now(),
      })
      await onRefreshMeta?.()
    } finally {
      setActionLoading(null)
    }
  }, [onRefreshMeta, meta, handleSave])

  const handleHiddenChange = useCallback(async () => {
    setActionLoading('hidden')
    try {
      await http.put('PutBlogMeta', {
        blogId: meta?.blogId,
        hidden2Public: !meta?.hidden2Public,
      })
      await onRefreshMeta?.()
    } finally {
      setActionLoading(null)
    }
  }, [meta, onRefreshMeta])

  const handleDelete = useCallback(async () => {
    setActionLoading('delete')
    try {
      const res = await http.delete('DeleteBlog', {
        blogId: meta?.blogId,
      })
      if (res?.isSuccess) {
        toast(t('edit.deleteOk'), { type: 'success' })
        router.replace('/blog')
      }
    } finally {
      setActionLoading(null)
    }
  }, [meta, router, t])

  const handleAddCover = useCallback(() => {
    if (actionLoading) {
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.id = uid
    input.onchange = async () => {
      const _file = input.files?.[0]
      if (!_file) {
        return
      }
      setActionLoading('coverChange')
      const file = await convertImageToWebP(_file, 0.9, 2500)
      try {
        const p = await uploadFile2Oss(file, 'blog')
        if (!p) {
          return
        }
        setCoverImg(p)

        if (meta) {
          const res = await http.put('PutBlogMeta', {
            blogId: meta.blogId,
            coverImg: p,
          })

          if (!res.isSuccess) {
            toast(t('blog.failToUpdateCover'), { type: 'error' })
          }
          await onRefreshMeta?.()
        }
      } finally {
        setActionLoading(null)
      }
    }
    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }, [uid, actionLoading, onRefreshMeta, t, meta])

  const handleRemoveCover = useCallback(async () => {
    try {
      setActionLoading('coverRemove')
      if (!meta) {
        setCoverImg('')
      } else {
        await http.put('PutBlogMeta', {
          blogId: meta.blogId,
          coverImg: '',
        })
        await onRefreshMeta?.()
      }
    } finally {
      setActionLoading(null)
    }
  }, [meta, onRefreshMeta])

  const debouncedSaveContent = useRef(
    debounce(async (val: string) => {
      if (!blogIdRef.current) {
        return
      }
      try {
        setActionLoading('save')
        await http.post('PostBlogContent', {
          blogId: blogIdRef.current,
          content: val,
        })
        await onRefreshMeta?.()
      } finally {
        setActionLoading(null)
      }
    }, 10000),
  )

  const handleValueChange = useCallback((val: string) => {
    setContent(val)
    debouncedSaveContent.current(val)
  }, [])

  useEffect(() => {
    setTitle(meta?.blogTitle || '')
    setCoverImg(meta?.coverImg || '')
    setKeywords(meta?.keywords || [])
  }, [meta])

  useEffect(() => {
    if (mode === 'preview') {
      serialize(content, {
        mdxOptions: {
          development: process.env.NODE_ENV === 'development',
          rehypePlugins: [rehypeHighlight],
        },
      }).then(setPreviewContent)
    }
    return () => {
      setPreviewContent(undefined)
    }
  }, [mode, content])

  useEffect(() => {
    blogIdRef.current = meta.blogId
  }, [meta.blogId])

  return (
    <>
      <Actions
        meta={meta}
        mode={mode}
        onPublish={handlePublish}
        onSave={() => handleSave(false)}
        onHiddenChange={handleHiddenChange}
        onDelete={handleDelete}
        loading={actionLoading}
        onTogglePreview={() => {
          if (mode === 'edit') {
            setMode('preview')
          } else {
            setMode('edit')
          }
        }}
      />
      <Cover
        meta={meta}
        mode={mode}
        coverImg={coverImg}
        onAddCover={handleAddCover}
        onRemoveCover={handleRemoveCover}
        loading={actionLoading}
      />
      <div className="m-auto max-w-[1000px] mt-[-1.5rem] flex justify-center overflow-x-hidden">
        {mode === 'edit' ? (
          <MdxLayout>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('edit.titlePlaceholder')}
              spellCheck="false"
              className="mb-2 text-black dark:text-white text-4xl font-semibold border-0 !bg-transparent shadow-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {meta && (
              <figcaption className={cx('m-0 text-sm mb-2 sm:mb-3')}>
                <span className="whitespace-nowrap">
                  {time.format(meta.time, 'datetimeShort')}
                </span>
              </figcaption>
            )}
            <div className="relative z-50">
              <Keywords keywords={keywords} onKeywordsChange={setKeywords} />
            </div>
            <div className="pt-2">
              <Content value={content} onValueChange={handleValueChange} />
            </div>
          </MdxLayout>
        ) : (
          <MdxLayout>
            <h1 className="!mt-0 !mb-2 !text-4xl">{meta.blogTitle}</h1>
            <figcaption className="m-0 !mt-1 text-sm flex items-center gap-x-1">
              {time.format(meta.time, 'datetimeShort')}
              {!!meta.keywords?.length && <span> | </span>}
              {meta.keywords?.map((k) => (
                <span key={k}>{` #${k}`}</span>
              ))}
            </figcaption>
            <div className="pt-2">
              {previewContent ? (
                <MDXRemote {...previewContent} components={components} />
              ) : (
                <Skeleton className="w-full h-12" />
              )}
            </div>
          </MdxLayout>
        )}
      </div>
    </>
  )
}

export default BlogCommon
