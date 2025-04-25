import { Button } from '@/components/ui/button'
import AppLayout from '@components/app-layout/AppLayout'
import { useLogin } from '@hooks/useLogin'
import { http } from '@services/http'
import { formatFileSize } from '@utils/file'
import { uploadFile2Oss } from '@utils/oss'
import { executePromisesWithLimit } from '@utils/promise'
import { toast } from '@utils/toast'
import { Check, Loader2, Paperclip, Plus, Upload, X } from 'lucide-react'
import { GetStaticPropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import React, { useState } from 'react'

const Item: React.FC<{
  file: File
  onRemove?: () => void
  uploading?: boolean
  uploaded?: boolean
  uploadedUrl?: string
}> = ({ file, onRemove, uploading, uploaded, uploadedUrl }) => {
  const { t } = useTranslation('tools')

  let icon = <X className="w-4 h-4" onClick={onRemove} />

  if (uploading) {
    icon = <Loader2 className="w-4 h-4 animate-spin" />
  } else if (uploaded) {
    icon = <Check className="w-4 h-4" />
  }

  return (
    <div
      className="flex justify-between cursor-pointer"
      onClick={() => {
        if (uploadedUrl) {
          navigator.clipboard.writeText(uploadedUrl)
          toast('copySuccess', {
            type: 'success',
          })
        }
      }}
    >
      <div className="flex flex-col gap-y-0.5">
        <span>{file.name}</span>
        <span className="text-sm text-neutral-500">
          {uploadedUrl ? (
            <span className="font-semibold">
              {t('items.oss.clickToCopy') + ' '}
            </span>
          ) : (
            formatFileSize(file.size)
          )}
        </span>
      </div>
      {icon}
    </div>
  )
}

function OSS() {
  const [files, setFiles] = useState<File[]>([])

  const [uploadedFiles, setUploadedFiles] = useState<
    {
      name: string
      url: string
    }[]
  >([])

  const [uploading, setUploading] = useState(false)

  const { t } = useTranslation('tools')

  const { fallbackComponent } = useLogin()

  const handleSelect = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.onchange = () => {
      const _files = input.files
      if (_files) {
        const _filesArray = Array.from(_files)
          .filter((e) => !files.map((x) => x.name).includes(e.name))
          .filter((e) => {
            if (e.size > 20 * 1024 * 1024) {
              toast('fileTooLarge', {
                type: 'error',
              })
              return false
            }
            return true
          })
        setFiles([...files, ..._filesArray])
      }
    }
    input.click()
  }

  const handleUpload = async () => {
    const fileToBeUploaded = files.filter(
      (f) => !uploadedFiles.map((x) => x.name).includes(f.name),
    )
    if (fileToBeUploaded.length === 0) {
      toast('noFilesToUpload', {
        type: 'error',
      })
      return
    }
    try {
      setUploading(true)
      await executePromisesWithLimit(
        fileToBeUploaded.map((f) => ({
          promise: uploadFile2Oss(f, 'uploader'),
          onFulfilled: (url) => {
            setUploadedFiles([...uploadedFiles, { name: f.name, url }])
          },
        })),
        3,
      )
      toast('uploadSuccess', {
        type: 'success',
      })
    } catch {
      toast('uploadFailed', {
        type: 'error',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <Head>
        <title>{t('title')}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#fff"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#000"
        />
      </Head>
      <AppLayout>
        <div className="max-w-[500px] mx-auto mt-1 md:mt-8 flex-col">
          <div className="flex flex-col gap-y-2">
            {files.length === 0 && (
              <span className="text-neutral-600 dark:text-neutral-400 text-sm">
                {t('items.oss.noFiles')}
              </span>
            )}

            {files.map((f, idx) => (
              <>
                <Item
                  key={f.name}
                  file={f}
                  onRemove={() => {
                    setFiles(files.filter((_f) => _f.name !== f.name))
                  }}
                  uploadedUrl={
                    uploadedFiles.find((x) => x.name === f.name)?.url
                  }
                  uploaded={
                    uploadedFiles.find((x) => x.name === f.name) !== undefined
                  }
                  uploading={uploading}
                />
                {idx !== files.length - 1 && (
                  <div className="w-full h-[0.5px] my-1 bg-neutral-300 dark:bg-neutral-700" />
                )}
              </>
            ))}
          </div>
          <div className="flex gap-x-3">
            <Button
              size="sm"
              variant={files.length === 0 ? 'default' : 'outline'}
              className="mt-6 mb-12"
              onClick={handleSelect}
              disabled={uploading}
            >
              {files.length ? (
                <Plus className="w-4 h-4" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
              {files.length === 0
                ? t('items.oss.select')
                : t('items.oss.append')}
            </Button>
            <Button
              size="sm"
              className="mt-6 mb-12"
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
            >
              <Upload className="w-4 h-4" />
              {t('items.oss.upload')}
            </Button>
          </div>
        </div>

        {fallbackComponent}
      </AppLayout>
    </>
  )
}

export default OSS

export async function getStaticProps(context: GetStaticPropsContext) {
  const { locale = 'cn' } = context
  http.setLocale(locale)
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'tools', 'toast'])),
    },
  }
}
