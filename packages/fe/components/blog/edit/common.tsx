import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ImagesV2 } from '@components/common/images-v2'
import type { BlogDraftDto } from '@server/modules/blog/dto/draft.dto'
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
  | 'exit'
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
  draft?: BlogDraftDto | null
  onRefreshMeta?: () => Promise<void>
  onCreateNew?: (meta: {
    title?: string
    coverImg?: string
    keywords?: string[]
    content?: string
  }) => Promise<boolean>
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
  const {
    meta,
    content: initialContent,
    draft,
    onRefreshMeta,
    onCreateNew,
  } = props

  const [actionLoading, setActionLoading] = useState<ActionLoading>(null)

  const [mode] = useState<'edit' | 'preview'>('edit')
  const [mobileToolbarContainer, setMobileToolbarContainer] =
    useState<HTMLDivElement | null>(null)

  const [content, setContent] = useState(draft?.content ?? initialContent ?? '')

  const [previewContent, setPreviewContent] = useState<any>()

  const [title, setTitle] = useState(draft?.title ?? meta?.blogTitle ?? '')
  const [coverImg, setCoverImg] = useState(
    draft?.coverImg ?? meta?.coverImg ?? '',
  )
  const [keywords, setKeywords] = useState<string[]>(
    draft?.keywords ?? meta?.keywords ?? [],
  )

  const draftRef = useRef<DraftSnapshot>({
    title,
    coverImg,
    keywords,
    content,
  })
  draftRef.current = { title, coverImg, keywords, content }

  const [draftSyncedAt, setDraftSyncedAt] = useState<number | null>(
    draft?.savedAt ?? null,
  )
  const [draftSyncError, setDraftSyncError] = useState(false)
  const bodyFlushRef = useRef<(() => boolean) | null>(null)
  const lastSyncedSnapshotRef = useRef(JSON.stringify(draftRef.current))
  const registerBodyFlush = useCallback((flush: (() => boolean) | null) => {
    bodyFlushRef.current = flush
  }, [])
  const flushSnapshot = useCallback(() => {
    if (bodyFlushRef.current?.() === false) return null
    return { ...draftRef.current, keywords: [...draftRef.current.keywords] }
  }, [])

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

  const persistSnapshot = useCallback(
    (
      snapshot: DraftSnapshot,
      target: 'draft' | 'official',
      { quiet = true, manageLoading = false }: SaveDraftOptions = {},
    ): Promise<boolean> => {
      const blogId = blogIdRef.current
      const captured = { ...snapshot, keywords: [...snapshot.keywords] }
      const key = JSON.stringify(captured)
      const save = async () => {
        if (target === 'draft' && key === lastSyncedSnapshotRef.current)
          return true
        if (manageLoading) setActionLoading('save')
        try {
          if (!blogId) {
            if (target === 'draft') return false
            if (!captured.title) {
              toast(t('blog.failToCreateBlogDue2EmptyTitle'), { type: 'error' })
              return false
            }
            return (await onCreateNew?.(captured)) ?? false
          }
          const response = await http.put(
            target === 'draft' ? 'PutBlogDraft' : 'PutBlogSave',
            { blogId, ...captured },
          )
          if (!response?.isSuccess) {
            if (target === 'draft') setDraftSyncError(true)
            return false
          }
          lastSyncedSnapshotRef.current = key
          setDraftSyncError(false)
          setDraftSyncedAt(target === 'draft' ? response.data.savedAt : null)
          if (target === 'official') {
            if (!quiet) toast(t('blog.saveSuccess'), { type: 'success' })
            await onRefreshMeta?.()
          }
          return true
        } catch {
          if (target === 'draft') setDraftSyncError(true)
          return false
        } finally {
          if (manageLoading)
            setActionLoading((loading) => (loading === 'save' ? null : loading))
        }
      }
      const queuedSave = saveQueueRef.current.then(save, save)
      saveQueueRef.current = queuedSave
      return queuedSave
    },
    [onCreateNew, onRefreshMeta, t],
  )
  const saveDraft = useCallback(
    (snapshot: DraftSnapshot, options?: SaveDraftOptions) =>
      persistSnapshot(snapshot, 'draft', options),
    [persistSnapshot],
  )
  const saveOfficial = useCallback(
    (snapshot: DraftSnapshot, options?: SaveDraftOptions) =>
      persistSnapshot(snapshot, 'official', options),
    [persistSnapshot],
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
    const snapshot = flushSnapshot()
    debouncedSaveDraft.current.cancel()
    if (snapshot)
      await saveOfficial(snapshot, { quiet: false, manageLoading: true })
  }, [flushSnapshot, saveOfficial])

  const handleReturn = useCallback(async () => {
    const snapshot = flushSnapshot()
    debouncedSaveDraft.current.cancel()
    if (!snapshot || !meta?.blogId) return
    setActionLoading('exit')
    try {
      const saved = await saveDraft(snapshot)
      if (!saved) {
        toast(t('edit.draftSyncFailed'), { type: 'error' })
        return
      }
      await router.push(`/blog/id/${meta.blogId}`)
    } finally {
      setActionLoading(null)
    }
  }, [flushSnapshot, meta?.blogId, router, saveDraft, t])

  const handlePublish = useCallback(async () => {
    if (!meta?.blogId) {
      return
    }
    const snapshot = flushSnapshot()
    debouncedSaveDraft.current.cancel()
    if (!snapshot) return
    setActionLoading('publish')
    try {
      const saved = await saveOfficial(snapshot, {
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
  }, [onRefreshMeta, meta?.blogId, saveOfficial, flushSnapshot])

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
    debouncedSaveDraft.current.cancel()
    try {
      await saveQueueRef.current
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
        mobileToolbarRef={setMobileToolbarContainer}
        meta={meta}
        onReturn={handleReturn}
        draftSyncedAt={draftSyncedAt}
        draftSyncError={draftSyncError}
        onPublish={handlePublish}
        onSave={handleSave}
        onHiddenChange={handleHiddenChange}
        onPinnedChange={handlePinnedChange}
        onDelete={handleDelete}
        loading={actionLoading}
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
            <div className="blog-article-content overflow-x-hidden pt-2">
              <Content
                value={content}
                onFlushReady={registerBodyFlush}
                onValueChange={handleValueChange}
                mobileToolbarContainer={mobileToolbarContainer}
              />
            </div>
          </MdxLayout>
        ) : (
          <MdxLayout>
            <h1 className="!mt-0 !mb-2 !text-4xl">{title}</h1>
            <figcaption className="m-0 !mt-1 text-sm flex items-center gap-x-1">
              {time.format(meta.time, 'datetimeShort')}
              {!!keywords.length && <span> | </span>}
              {keywords.map((k) => (
                <span key={k}>{` #${k}`}</span>
              ))}
            </figcaption>
            <div className="blog-article-content overflow-x-hidden pt-2">
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
