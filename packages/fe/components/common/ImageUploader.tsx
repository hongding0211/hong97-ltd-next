'use client'

import { formatFileSize } from '@utils/file'
import { uploadFile2Oss } from '@utils/oss'
import { executePromisesWithLimit } from '@utils/promise'
import { toast } from '@utils/toast'
import { Loader2, Plus, X } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react'

interface ImageUploaderProps {
  value?: string[]
  onChange?: (urls: string[]) => void
  maxCount?: number
  disabled?: boolean
  accept?: string
  maxSize?: number // in bytes
  className?: string
  showHint?: boolean
}

interface ImageItem {
  id: string
  file?: File
  url: string
  uploading: boolean
  uploaded: boolean
  preview: string
}

export interface ImageUploaderRef {
  uploadAll: () => Promise<string[]>
}

export const ImageUploader = forwardRef<ImageUploaderRef, ImageUploaderProps>(
  (
    {
      value = [],
      onChange,
      maxCount = 9,
      disabled = false,
      accept = 'image/*',
      maxSize = 20 * 1024 * 1024, // 20MB
      className = '',
      showHint = true,
    },
    ref,
  ) => {
    const [images, setImages] = useState<ImageItem[]>(() =>
      value.map((url, index) => ({
        id: `existing-${index}`,
        url,
        uploading: false,
        uploaded: true,
        preview: url,
      })),
    )

    const fileInputRef = useRef<HTMLInputElement>(null)
    const { t } = useTranslation('common')

    useImperativeHandle(
      ref,
      () => ({
        uploadAll: async () => {
          const imagesToUpload = images.filter(
            (img) => img.file && !img.uploaded && !img.uploading,
          )

          if (imagesToUpload.length === 0) {
            return images.filter((img) => img.uploaded).map((img) => img.url)
          }

          // Mark images as uploading
          setImages((prev) =>
            prev.map((img) =>
              imagesToUpload.some((uploadImg) => uploadImg.id === img.id)
                ? { ...img, uploading: true }
                : img,
            ),
          )

          return new Promise((resolve, _reject) => {
            const uploadedUrls: string[] = []

            executePromisesWithLimit(
              imagesToUpload.map((imageItem) => ({
                promise: uploadFile2Oss(imageItem.file!, 'trash', {
                  compress2Webp: true,
                  compress2WebpOpt: {
                    quality: 0.9,
                    maxWidth: 2500,
                  },
                }),
                onFulfilled: (url: string) => {
                  uploadedUrls.push(url)
                  setImages((prev) =>
                    prev.map((img) =>
                      img.id === imageItem.id
                        ? { ...img, url, uploading: false, uploaded: true }
                        : img,
                    ),
                  )
                },
                onRejected: () => {
                  setImages((prev) =>
                    prev.map((img) =>
                      img.id === imageItem.id
                        ? { ...img, uploading: false }
                        : img,
                    ),
                  )
                  toast(t('uploadFailed'), { type: 'error' })
                },
              })),
              3,
              () => {
                const allUploadedUrls = [
                  ...images
                    .filter(
                      (img) =>
                        img.uploaded &&
                        !imagesToUpload.some((u) => u.id === img.id),
                    )
                    .map((img) => img.url),
                  ...uploadedUrls,
                ]
                resolve(allUploadedUrls)
              },
            )
          })
        },
      }),
      [images, t],
    )

    const updateImages = (newImages: ImageItem[]) => {
      setImages(newImages)
      const uploadedUrls = newImages
        .filter((img) => img.uploaded)
        .map((img) => img.url)
      onChange?.(uploadedUrls)
    }

    const handleFileSelect = () => {
      if (disabled || images.length >= maxCount) return
      fileInputRef.current?.click()
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || [])

      // Filter valid files
      const validFiles = files.filter((file) => {
        if (!file.type.startsWith('image/')) {
          toast(t('pleaseSelectImageFile'), { type: 'error' })
          return false
        }

        if (file.size > maxSize) {
          toast(t('fileSizeExceeded', { size: formatFileSize(maxSize) }), {
            type: 'error',
          })
          return false
        }

        return true
      })

      // Check if adding these files would exceed maxCount
      const remainingSlots = maxCount - images.length
      const filesToAdd = validFiles.slice(0, remainingSlots)

      if (filesToAdd.length < validFiles.length) {
        toast(t('maxImagesExceeded', { count: maxCount }), { type: 'error' })
      }

      // Create image items for new files
      const newImageItems: ImageItem[] = filesToAdd.map((file, index) => ({
        id: `new-${Date.now()}-${index}`,
        file,
        url: '',
        uploading: false,
        uploaded: false,
        preview: URL.createObjectURL(file),
      }))

      updateImages([...images, ...newImageItems])

      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    const handleRemove = (id: string) => {
      const imageToRemove = images.find((img) => img.id === id)
      if (imageToRemove?.preview && !imageToRemove.uploaded) {
        URL.revokeObjectURL(imageToRemove.preview)
      }

      const newImages = images.filter((img) => img.id !== id)
      updateImages(newImages)
    }

    const _isUploading = images.some((img) => img.uploading)

    return (
      <div className={`space-y-4 ${className}`}>
        {/* Image Scroll View */}
        <div className="flex overflow-x-auto gap-1.5 pb-2 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
          {/* Add button */}
          {images.length < maxCount && !disabled && (
            <button
              type="button"
              onClick={handleFileSelect}
              className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
            >
              <div className="text-center">
                <Plus className="w-5 h-5 mx-auto text-neutral-400" />
                <span className="text-xs text-neutral-500 mt-1">
                  {t('addImage')}
                </span>
              </div>
            </button>
          )}

          {images.map((image) => (
            <div key={image.id} className="relative flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-md bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <img
                  src={image.preview}
                  alt={t('preview')}
                  className="w-full h-full object-cover"
                />

                {/* Loading overlay */}
                {image.uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                )}

                {/* Remove button */}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(image.id)}
                    className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors"
                    disabled={image.uploading}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* File input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Info text */}
        {showHint && images.length === 0 && (
          <p className="text-sm text-neutral-500 text-center">
            {t('imageUploadHint', {
              count: maxCount,
              size: formatFileSize(maxSize),
            })}
          </p>
        )}
      </div>
    )
  },
)

ImageUploader.displayName = 'ImageUploader'

export default ImageUploader
