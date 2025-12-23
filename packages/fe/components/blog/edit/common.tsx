import { Input } from '@/components/ui/input'
import { BlogAPIS } from '@services/blog/types'
import { http } from '@services/http'
import { convertImageToWebP, uploadFile2Oss } from '@utils/oss'
import { time } from '@utils/time'
import { toast } from '@utils/toast'
import cx from 'classnames'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import React, { useCallback, useEffect, useId, useState } from 'react'
import MdxLayout from '../mdx-layout'
import Actions from './actions'
import Content from './content'
import Cover from './cover'
import Keywords from './keywords'

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
  onContentChange?: (c: string) => void
  onRefreshMeta?: () => Promise<void>
  onCreateNew?: (meta: {
    title?: string
    coverImg?: string
    keywords?: string[]
  }) => Promise<void>
}

const BlogCommon: React.FC<IBlogCommon> = (props) => {
  const { meta, content, onContentChange, onRefreshMeta, onCreateNew } = props

  const [actionLoading, setActionLoading] = useState<ActionLoading>(null)

  const [title, setTitle] = useState(meta?.blogTitle || '')
  const [coverImg, setCoverImg] = useState(meta?.coverImg || '')
  const [keywords, setKeywords] = useState<string[]>(meta?.keywords || [])

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
          const res = await http.put('PutBlogMeta', {
            blogId: meta.blogId,
            blogTitle: title,
            keywords,
          })
          if (res?.isSuccess && !quiet) {
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
      const file = await convertImageToWebP(_file, 0.75, 2000)
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

  useEffect(() => {
    setTitle(meta?.blogTitle || '')
    setCoverImg(meta?.coverImg || '')
    setKeywords(meta?.keywords || [])
  }, [meta])

  return (
    <>
      <Actions
        meta={meta}
        onPublish={handlePublish}
        onSave={() => handleSave(false)}
        onHiddenChange={handleHiddenChange}
        onDelete={handleDelete}
        loading={actionLoading}
      />
      <Cover
        meta={meta}
        coverImg={coverImg}
        onAddCover={handleAddCover}
        onRemoveCover={handleRemoveCover}
        loading={actionLoading}
      />
      <div className="m-auto max-w-[1000px] mt-[-1.5rem] flex justify-center">
        <MdxLayout>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('edit.titlePlaceholder')}
            spellCheck="false"
            className="mb-0 text-[2rem] font-semibold border-0 !bg-transparent shadow-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <figcaption className={cx('m-0 text-sm mb-2 sm:mb-3')}>
            <span className="whitespace-nowrap">
              {time.format(meta.time, 'datetimeShort')}
            </span>
          </figcaption>
          <Keywords keywords={keywords} onKeywordsChange={setKeywords} />
          <div className="mt-4 w-full">
            <Content value={content} onValueChange={onContentChange} />
          </div>
        </MdxLayout>
      </div>
    </>
  )
}

export default BlogCommon
