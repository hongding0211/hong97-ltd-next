import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { PopoverClose } from '@radix-ui/react-popover'
import { time } from '@utils/time'
import cx from 'classnames'
import {
  ArrowLeft,
  CloudUpload,
  Eye,
  EyeOff,
  ListPlus,
  Loader2,
  Pin,
  PinOff,
  Save,
  Trash,
} from 'lucide-react'
import { useTranslation } from 'next-i18next'
import React, { useEffect, useRef, useState } from 'react'
import { ActionLoading, BlogMeta } from './common'

interface IActions {
  meta?: BlogMeta
  onReturn?: () => void
  draftSyncedAt?: number | null
  draftSyncError?: boolean
  onSave?: () => void
  onPublish?: () => void
  onHiddenChange?: () => void
  onPinnedChange?: () => void
  onDelete?: () => void
  loading?: ActionLoading
  mobileToolbarRef?: React.Ref<HTMLDivElement>
}

const Actions: React.FC<IActions> = (props) => {
  const {
    meta,
    onReturn,
    draftSyncedAt,
    draftSyncError,
    onSave,
    onPublish,
    onHiddenChange,
    onPinnedChange,
    onDelete,
    loading,
    mobileToolbarRef,
  } = props

  const timeRef = useRef<any>(null)

  const [, setForceUpdate] = useState(0)

  const [showDelDialog, setShowDelDialog] = useState(false)

  const { t } = useTranslation('blog')

  const lastUpdateTime = (() => {
    if (draftSyncError)
      return <span role="status">{t('edit.draftSyncFailed')}</span>
    const timestamp = draftSyncedAt ?? meta?.lastUpdateAt
    if (!timestamp) {
      return ''
    }
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-x-1">
        <span>{t(draftSyncedAt ? 'edit.draftSync' : 'edit.savedAt')}</span>
        <span>{`${time.formatDynamic(timestamp)}`}</span>
      </div>
    )
  })()

  useEffect(() => {
    timeRef.current = setInterval(() => {
      setForceUpdate((v) => v + 1)
    }, 60 * 1000)
    return () => clearInterval(timeRef.current)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (!loading && onSave) {
          onSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [loading, onSave])

  return (
    <>
      <div
        data-blog-editor-actions
        className="z-50 bg-white/[0.8] dark:bg-black/[0.8] backdrop-blur-xl backdrop-saturate-150 sticky top-[calc(64px+var(--app-viewport-offset-top,0px))] mx-[-1.25rem] mt-[-1.25rem] py-2 px-3 sm:px-5"
      >
        <div className="flex items-center justify-between sm:justify-end">
          <div className="text-xs flex items-center mr-1 opacity-50">
            {lastUpdateTime}
          </div>
          <div className="flex items-center gap-x-1 sm:gap-x-2 ml-0 sm:ml-2">
            {meta && (
              <Button
                size="xs"
                variant="outline"
                disabled={Boolean(loading)}
                aria-label={t('edit.returnToPost')}
                title={t('edit.returnToPost')}
                onClick={onReturn}
              >
                {loading === 'exit' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowLeft className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {t('edit.returnToPost')}
                </span>
              </Button>
            )}
            {meta && (
              <Popover open={showDelDialog} onOpenChange={setShowDelDialog}>
                <PopoverTrigger asChild>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={Boolean(loading)}
                    aria-label={t('edit.delete')}
                    title={t('edit.delete')}
                  >
                    {loading === 'delete' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">{t('edit.delete')}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="flex flex-col">
                    <div className="font-medium">{t('edit.confirmDel')}</div>
                    <div className="opacity-60 text-sm mt-2">
                      {t('edit.confirmDelDesc')}
                    </div>
                    <div className="flex items-center gap-x-2 mt-4">
                      <Button
                        size="xxs"
                        variant="destructive"
                        onClick={() => {
                          onDelete?.()
                          setShowDelDialog(false)
                        }}
                      >
                        {t('edit.confirm')}
                      </Button>
                      <PopoverClose asChild>
                        <Button size="xxs" variant="ghost">
                          {t('edit.cancel')}
                        </Button>
                      </PopoverClose>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {meta?.hasPublished === false && (
              <Button
                disabled={Boolean(loading)}
                aria-label={t('edit.publish')}
                title={t('edit.publish')}
                size="xs"
                variant="outline"
                onClick={onPublish}
              >
                {loading === 'publish' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudUpload className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{t('edit.publish')}</span>
              </Button>
            )}
            {meta && meta.hasPublished !== false && (
              <Button
                disabled={Boolean(loading)}
                aria-label={t(
                  meta.hidden2Public ? 'edit.hidden' : 'edit.unHidden',
                )}
                title={t(meta.hidden2Public ? 'edit.hidden' : 'edit.unHidden')}
                size="xs"
                variant="outline"
                onClick={onHiddenChange}
              >
                {loading === 'hidden' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : meta.hidden2Public ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {t(meta.hidden2Public ? 'edit.hidden' : 'edit.unHidden')}
                </span>
              </Button>
            )}
            {meta && (
              <Button
                disabled={Boolean(loading)}
                aria-label={t(meta.pinned ? 'edit.pinned' : 'edit.unpinned')}
                title={t(meta.pinned ? 'edit.pinned' : 'edit.unpinned')}
                size="xs"
                variant="outline"
                onClick={onPinnedChange}
              >
                {loading === 'pinned' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : meta.pinned ? (
                  <Pin className="w-4 h-4" />
                ) : (
                  <PinOff className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {t(meta.pinned ? 'edit.pinned' : 'edit.unpinned')}
                </span>
              </Button>
            )}
            <Button
              disabled={Boolean(loading)}
              size="xs"
              onClick={onSave}
              aria-label={t(meta ? 'edit.save' : 'edit.create')}
              title={t(meta ? 'edit.save' : 'edit.create')}
            >
              {loading === 'save' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : meta ? (
                <Save className="w-4 h-4" />
              ) : (
                <ListPlus className="w-4 h-4" />
              )}
              <span
                className={cx('sm:inline', {
                  hidden: meta,
                })}
              >
                {t(meta ? 'edit.save' : 'edit.create')}
              </span>
            </Button>
          </div>
        </div>
        <div
          ref={mobileToolbarRef}
          className="empty:hidden mt-2 border-t border-neutral-100/50 pt-1 dark:border-neutral-800/50"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-3 bottom-0 border-b border-neutral-100 sm:inset-x-5 dark:border-neutral-800"
        />
      </div>
    </>
  )
}

export default Actions
