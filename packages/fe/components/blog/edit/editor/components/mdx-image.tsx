import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { ImagesV2 } from '@components/common/images-v2'
import { convertImageToWebP, uploadFile2Oss } from '@utils/oss'
import { toast } from '@utils/toast'
import cx from 'classnames'
import { CloudUpload, Loader2, Plus, Repeat, Trash } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import React, { useEffect, useId, useState } from 'react'
import { ReactMdxComponent } from '../react-mdx-types'

interface IMdxImage {
  urls: string
  caption: string
  loop: boolean
  loading?: boolean
}

const MdxImage: ReactMdxComponent<IMdxImage> = ({
  props,
  onPropsUpdate,
  mode,
}) => {
  const { urls = '', caption = '', loop, loading: loadingProps = false } = props

  const url = (() => {
    if (!urls.trim().length) {
      return []
    }
    return urls.split(',')
  })()

  const [loading, setLoading] = useState(loadingProps)
  const [idx, setIdx] = useState(0)

  const { t } = useTranslation('blog')

  const uid = useId()

  const handleUpload = async (toastOnSuccess?: boolean) => {
    if (loading) {
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.id = uid
    input.multiple = true
    input.onchange = async () => {
      const _files = Array.from(input.files || [])
      if (!_files?.length) {
        toast('blog.uploadFailed', { type: 'error' })
        return
      }
      try {
        setLoading(true)
        const compressedImg = await Promise.all(
          _files.map((f) => convertImageToWebP(f, 0.85, 1920)),
        )
        const uploadedFiles = (
          await Promise.all(compressedImg.map((c) => uploadFile2Oss(c, 'blog')))
        ).filter(Boolean)
        onPropsUpdate({
          ...props,
          urls: [...url, ...uploadedFiles].join(','),
        })
        if (toastOnSuccess) {
          toast('blog.uploadSuccess', { type: 'success' })
        }
      } catch {
        toast('blog.uploadFailed', { type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }

  const handleDel = () => {
    onPropsUpdate({
      ...props,
      urls: url.filter((_, i) => i !== idx).join(','),
    })
  }

  useEffect(() => {
    setLoading(loadingProps)
  }, [loadingProps])

  if (mode === 'editor') {
    return (
      <>
        {url.length ? (
          <ImagesV2
            images={url.map((u) => ({
              img: u,
            }))}
            markdown
            onIndexChange={setIdx}
            autoLoop={false}
          />
        ) : (
          <div className="w-full flex justify-center">
            <div
              onClick={() => {
                handleUpload(false)
              }}
              className="cursor-pointer h-[100px] w-full sm:max-w-[75%] rounded flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-500"
            >
              <div className="flex gap-x-1 items-center">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {t('edit.uploadImg')}
                </span>
              </div>
            </div>
          </div>
        )}
        {!!url.length && (
          <div
            className={cx(
              'w-full flex justify-center',
              url.length ? 'mt-[-1rem]' : 'mt-0.5',
            )}
          >
            <div
              className={cx(
                'flex items-center justify-between w-full sm:max-w-[75%]',
                'bg-neutral-50 dark:bg-neutral-900',
                'p-1 px-2',
                'rounded',
              )}
            >
              <Input
                value={caption}
                onChange={(e) =>
                  onPropsUpdate({
                    ...props,
                    caption: e.target.value,
                  })
                }
                placeholder={t('edit.imgCaptionPlaceholder')}
                spellCheck="false"
                className={cx(
                  'opacity-70 text-black dark:text-white text-[0.8rem] border-0 !bg-transparent shadow-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0',
                  'mr-2',
                )}
              />

              <div className="flex items-center gap-x-0.5 opacity-90">
                {url?.length > 1 && (
                  <Toggle
                    pressed={loop}
                    onPressedChange={(e) =>
                      onPropsUpdate({
                        ...props,
                        loop: e,
                      })
                    }
                    aria-label="toggle auto loop"
                    size="xxs"
                    variant="default"
                    className={cx('!gap-x-0.5')}
                  >
                    <Repeat className="!w-[0.75rem]" />
                    {loop ? 'On' : 'Off'}
                  </Toggle>
                )}
                <Button
                  size="xxs"
                  className="!gap-x-0.5"
                  variant="ghost"
                  onClick={handleDel}
                >
                  <Trash className="!w-[0.75rem]" />
                  Del
                </Button>
                <Button
                  size="xxs"
                  className="!gap-x-0.5"
                  variant="ghost"
                  onClick={() => {
                    handleUpload(true)
                  }}
                >
                  <Plus className="!w-[0.75rem]" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  if (!urls?.length || !url?.length) {
    return <br />
  }

  return (
    <ImagesV2
      images={url.map((u) => ({
        img: u,
      }))}
      caption={caption}
      autoLoop={loop}
      markdown
    />
  )
}

export default MdxImage
