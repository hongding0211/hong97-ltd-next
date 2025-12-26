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
  CloudUpload,
  Eye,
  EyeClosed,
  ListPlus,
  Loader2,
  Pencil,
  Save,
  SearchCheck,
  Trash,
} from 'lucide-react'
import { useTranslation } from 'next-i18next'
import React, { useEffect, useRef, useState } from 'react'
import { ActionLoading, BlogMeta } from './common'

interface IActions {
  meta?: BlogMeta
  mode: 'edit' | 'preview'
  onSave?: () => void
  onPublish?: () => void
  onHiddenChange?: () => void
  onDelete?: () => void
  onTogglePreview?: () => void
  loading?: ActionLoading
}

const Actions: React.FC<IActions> = (props) => {
  const {
    meta,
    mode,
    onSave,
    onPublish,
    onHiddenChange,
    onDelete,
    onTogglePreview,
    loading,
  } = props

  const timeRef = useRef<any>(null)

  const [, setForceUpdate] = useState(0)

  const [showDelDialog, setShowDelDialog] = useState(false)

  const { t } = useTranslation('blog')

  const lastUpdateTime = (() => {
    if (!meta?.lastUpdateAt) {
      return ''
    }
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-x-1">
        <span>{t('edit.lastUpdate')}</span>
        <span>{`${time.formatDynamic(meta.lastUpdateAt)}`}</span>
      </div>
    )
  })()

  useEffect(() => {
    setTimeout(() => {
      timeRef.current = setInterval(() => {
        setForceUpdate((v) => v + 1)
      }, 60 * 1000)
    })
    return () => {
      clearInterval(timeRef.current)
    }
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
      <div className="flex z-50 items-center justify-between sm:justify-end bg-white/[0.8] dark:bg-black/[0.8] backdrop-blur-xl backdrop-saturate-150 sticky top-[64px] mx-[-1.25rem] mt-[-1.25rem] py-2 px-3 sm:px-5 border-b-[1px] border-b-neutral-100 dark:border-b-neutral-800">
        <div className="text-xs flex items-center mr-1 opacity-50">
          {lastUpdateTime}
        </div>
        <div className="flex items-center gap-x-1 sm:gap-x-2 ml-0 sm:ml-2">
          {meta && (
            <Popover open={showDelDialog} onOpenChange={setShowDelDialog}>
              <PopoverTrigger>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={loading === 'delete'}
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
          {meta && (
            <Button
              disabled={loading === 'publish'}
              size="xs"
              variant="outline"
              onClick={onTogglePreview}
            >
              {mode === 'preview' ? (
                <Pencil className="w-4 h-4" />
              ) : (
                <SearchCheck className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {t(mode === 'preview' ? 'edit.edit' : 'edit.preview')}
              </span>
            </Button>
          )}
          {meta?.hasPublished === false && (
            <Button
              disabled={loading === 'publish'}
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
          {meta?.hasPublished === true && (
            <Button
              disabled={loading === 'hidden'}
              size="xs"
              variant="outline"
              onClick={onHiddenChange}
            >
              {loading === 'hidden' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : meta.hidden2Public ? (
                <EyeClosed className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {t(meta.hidden2Public ? 'edit.hidden' : 'edit.unHidden')}
              </span>
            </Button>
          )}
          <Button disabled={loading === 'save'} size="xs" onClick={onSave}>
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
    </>
  )
}

export default Actions
