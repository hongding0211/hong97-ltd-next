import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ImagesV2 } from '@components/common/images-v2'
import { BlogAPIS } from '@services/blog/types'
import { http } from '@services/http'
import { addHeadingAnchors } from '@utils/blog-toc'
import { convertImageToWebP, uploadFile2Oss } from '@utils/oss'
import { remarkUnderline } from '@utils/remark-underline'
import { time } from '@utils/time'
import { toast } from '@utils/toast'
import cx from 'classnames'
import { debounce } from 'lodash'
import { useTranslation } from 'next-i18next'
import { MDXRemote } from 'next-mdx-remote'
import { serialize } from 'next-mdx-remote/serialize'
import { useRouter } from 'next/router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import rehypeHighlight from 'rehype-highlight'
import { customComponents } from '../../../mdx-components'
import MdxLayout from '../mdx-layout'
import Actions from './actions'
import Content from './content'
import Cover from './cover'
import Keywords from './keywords'
import EditToc from './toc'

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
  | 'pinned'
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
    content?: string
  }) => Promise<void>
}

interface DraftSnapshot {
  title: string
  coverImg: string
  keywords: string[]
  content: string
}

interface SaveDraftOptions {
  quiet?: boolean
  manageLoading?: boolean
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

  const draftRef = useRef<DraftSnapshot>({
    title,
    coverImg,
    keywords,
    content,
  })
  draftRef.current = { title, coverImg, keywords, content }

  const { content: anchoredContent, tocItems } = useMemo(
    () => addHeadingAnchors(content),
    [content],
  )

  const blogIdRef = useRef(meta?.blogId || '')
  blogIdRef.current = meta?.blogId || ''

  const hydratedBlogIdRef = useRef(meta?.blogId)

  const saveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true))
  const coverFileInputRef = useRef<HTMLInputElement>(null)

  const { t } = useTranslation('blog')

  const router = useRouter()

  const saveDraft = useCallback(
    (
      snapshot: DraftSnapshot,
      { quiet = false, manageLoading = true }: SaveDraftOptions = {},
    ): Promise<boolean> => {
      const save = async () => {
        if (manageLoading) {
          setActionLoading('save')
        }
        try {
          if (!blogIdRef.current) {
            if (!snapshot.title) {
              toast(t('blog.failToCreateBlogDue2EmptyTitle'), {
                type: 'error',
              })
              return false
            }
            await onCreateNew?.({
              title: snapshot.title,
              coverImg: snapshot.coverImg,
              keywords: snapshot.keywords,
              content: snapshot.content,
            })
            return true
          }

          const blogId = blogIdRef.current
          const [metaResponse, contentResponse] = await Promise.all([
            http.put('PutBlogMeta', {
              blogId,
              blogTitle: snapshot.title,
              coverImg: snapshot.coverImg,
              keywords: snapshot.keywords,
            }),
            http.post('PostBlogContent', {
              blogId,
              content: snapshot.content,
            }),
          ])
          const saved = metaResponse?.isSuccess && contentResponse?.isSuccess

          if (!saved) {
            return false
          }
          if (!quiet) {
            toast(t('blog.saveSuccess'), { type: 'success' })
          }
          await onRefreshMeta?.()
          return true
        } catch {
          return false
        } finally {
          if (manageLoading) {
            setActionLoading((loading) => (loading === 'save' ? null : loading))
          }
        }
      }

      const queuedSave = saveQueueRef.current.then(save, save)
      saveQueueRef.current = queuedSave
      return queuedSave
    },
    [onCreateNew, onRefreshMeta, t],
  )

  const saveDraftRef = useRef(saveDraft)
  saveDraftRef.current = saveDraft

  const debouncedSaveDraft = useRef(
    debounce(() => {
      if (!blogIdRef.current) {
        return
      }
      void saveDraftRef.current(draftRef.current, { quiet: true })
    }, 10000),
  )

  const handleSave = useCallback(async () => {
    debouncedSaveDraft.current.cancel()
    await saveDraft(draftRef.current)
  }, [saveDraft])

  const handlePublish = useCallback(async () => {
    if (!meta?.blogId) {
      return
    }
    debouncedSaveDraft.current.cancel()
    setActionLoading('publish')
    try {
      const saved = await saveDraft(draftRef.current, {
        quiet: true,
        manageLoading: false,
      })
      if (!saved) {
        return
      }
      const response = await http.put('PutBlogMeta', {
        blogId: meta.blogId,
        hasPublished: true,
        time: Date.now(),
      })
      if (response?.isSuccess) {
        await onRefreshMeta?.()
      }
    } finally {
      setActionLoading(null)
    }
  }, [onRefreshMeta, meta?.blogId, saveDraft])

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

  const handlePinnedChange = useCallback(async () => {
    setActionLoading('pinned')
    try {
      await http.put('PutBlogMeta', {
        blogId: meta?.blogId,
        pinned: !meta?.pinned,
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

  const handleCoverFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget
      const selectedFile = input.files?.[0]
      input.value = ''

      if (!selectedFile) {
        return
      }

      setActionLoading('coverChange')
      try {
        const file = await convertImageToWebP(selectedFile, 0.9, 2500)
        const p = await uploadFile2Oss(file, 'blog')
        if (!p) {
          return
        }
        setCoverImg(p)
        draftRef.current = { ...draftRef.current, coverImg: p }

        if (meta) {
          const saved = await saveDraft(draftRef.current, {
            quiet: true,
            manageLoading: false,
          })

          if (!saved) {
            toast(t('blog.failToUpdateCover'), { type: 'error' })
          }
        }
      } finally {
        setActionLoading(null)
      }
    },
    [meta, saveDraft, t],
  )

  const handleAddCover = useCallback(() => {
    if (actionLoading || !coverFileInputRef.current) {
      return
    }

    coverFileInputRef.current.click()
  }, [actionLoading])

  const handleRemoveCover = useCallback(async () => {
    try {
      setActionLoading('coverRemove')
      setCoverImg('')
      draftRef.current = { ...draftRef.current, coverImg: '' }
      if (!meta) {
        return
      }
      await saveDraft(draftRef.current, {
        quiet: true,
        manageLoading: false,
      })
    } finally {
      setActionLoading(null)
    }
  }, [meta, saveDraft])

  const handleValueChange = useCallback((val: string) => {
    setContent(val)
    draftRef.current = { ...draftRef.current, content: val }
    debouncedSaveDraft.current()
  }, [])

  const handleTitleChange = useCallback((val: string) => {
    setTitle(val)
    draftRef.current = { ...draftRef.current, title: val }
    debouncedSaveDraft.current()
  }, [])

  const handleKeywordsChange = useCallback((val: string[]) => {
    setKeywords(val)
    draftRef.current = { ...draftRef.current, keywords: val }
    debouncedSaveDraft.current()
  }, [])

  useEffect(() => {
    if (!meta?.blogId || hydratedBlogIdRef.current === meta.blogId) {
      return
    }
    hydratedBlogIdRef.current = meta.blogId
    setTitle(meta?.blogTitle || '')
    setCoverImg(meta?.coverImg || '')
    setKeywords(meta?.keywords || [])
  }, [meta])

  useEffect(() => {
    return () => {
      debouncedSaveDraft.current.cancel()
    }
  }, [])

  useEffect(() => {
    if (mode === 'preview') {
      serialize(anchoredContent, {
        mdxOptions: {
          development: process.env.NODE_ENV === 'development',
          remarkPlugins: [remarkUnderline],
          rehypePlugins: [rehypeHighlight],
        },
      }).then(setPreviewContent)
    }
    return () => {
      setPreviewContent(undefined)
    }
  }, [mode, anchoredContent])

  return (
    <>
      <input
        ref={coverFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverFileChange}
        className="hidden"
      />
      <Actions
        meta={meta}
        mode={mode}
        onPublish={handlePublish}
        onSave={handleSave}
        onHiddenChange={handleHiddenChange}
        onPinnedChange={handlePinnedChange}
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
      <div
        className={cx(
          'm-auto mt-[-1.5rem]',
          tocItems.length
            ? 'blog-reading-shell--with-toc'
            : 'flex max-w-[1000px] justify-center',
        )}
      >
        {!!tocItems.length && <EditToc items={tocItems} blogTitle={title} />}
        {mode === 'edit' ? (
          <MdxLayout>
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
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
            <Keywords
              keywords={keywords}
              onKeywordsChange={handleKeywordsChange}
            />
            <div className="overflow-x-hidden pt-2">
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
            <div className="overflow-x-hidden pt-2">
              {previewContent ? (
                <MDXRemote {...previewContent} components={components} />
              ) : (
                <Skeleton className="w-full h-12" />
              )}
            </div>
          </MdxLayout>
        )}
        {!!tocItems.length && (
          <div className="blog-reading-balance hidden min-[800px]:block" />
        )}
      </div>
    </>
  )
}

export default BlogCommon
