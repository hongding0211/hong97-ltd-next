'use client'

import axios from 'axios'
import { rgbaToThumbHash } from 'thumbhash'
import {
  type ImagePreset,
  appendImageUrlMeta,
  imageMetaFromRgba,
  imageMimeFromBytes,
  policy,
} from './image-core.cjs'
export { appendImageUrlMeta, getImageUrlMeta } from './image-core.cjs'
export type { ImageUrlMeta } from './image-core.cjs'
import { http } from '../services/http'
import { toast } from './toast'

const axiosInstance = axios.create()

type UploadMethod = 'POST' | 'PUT'

import type { ImageUrlMeta } from './image-core.cjs'

const IMAGE_META_MAX_EDGE = policy.metadataMaxEdge
const IMMUTABLE_CACHE_CONTROL = policy.cacheControl

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl)
      reject(error)
    }
    image.src = objectUrl
  })

export async function createImageUrlMeta(file: File): Promise<ImageUrlMeta> {
  const image = await loadImage(file)
  const width = image.naturalWidth
  const height = image.naturalHeight
  if (!width || !height) {
    throw new Error('Invalid image dimensions')
  }

  const scale = Math.min(1, IMAGE_META_MAX_EDGE / Math.max(width, height))
  const thumbWidth = Math.max(1, Math.round(width * scale))
  const thumbHeight = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = thumbWidth
  canvas.height = thumbHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Failed to create image metadata canvas')
  }

  context.drawImage(image, 0, 0, thumbWidth, thumbHeight)
  const pixels = context.getImageData(0, 0, thumbWidth, thumbHeight).data
  return imageMetaFromRgba(
    width,
    height,
    thumbWidth,
    thumbHeight,
    pixels,
    rgbaToThumbHash,
  )
}

const uploadViaDevProxy = async (
  url: string,
  file: File,
  method: UploadMethod,
  fields?: Record<string, string>,
  headers?: Record<string, string>,
) => {
  await axiosInstance.post('/api/dev/oss-upload', file, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-OSS-Upload-URL': url,
      'X-OSS-Upload-Method': method,
      ...(fields
        ? {
            'X-OSS-Upload-Fields': btoa(
              unescape(encodeURIComponent(JSON.stringify(fields))),
            ),
          }
        : {}),
      ...(headers
        ? {
            'X-OSS-Upload-Headers': btoa(
              unescape(encodeURIComponent(JSON.stringify(headers))),
            ),
          }
        : {}),
    },
  })
}

const uploadFile = async (
  url: string,
  file: File,
  method: UploadMethod,
  fields?: Record<string, string>,
  headers?: Record<string, string>,
) => {
  if (process.env.NODE_ENV === 'development') {
    await uploadViaDevProxy(url, file, method, fields, headers)
    return
  }

  if (method === 'POST') {
    const formData = new FormData()
    Object.entries(fields ?? {}).forEach(([key, value]) => {
      formData.append(key, value)
    })
    formData.append('file', file)
    await axiosInstance.post(url, formData)
  } else {
    await axiosInstance.put(url, file, {
      headers: headers ?? {
        'Content-Type': file.type || 'application/octet-stream',
        'Cache-Control': IMMUTABLE_CACHE_CONTROL,
      },
    })
  }
}

/** Keep browser and CLI upload presets in config/image-policy.json. */
export async function convertImageToWebP(
  file: File,
  quality = 0.9,
  maxWidth?: number,
): Promise<File> {
  if (policy.preserveTypes.includes(file.type)) return file
  const image = await loadImage(file)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  const width = maxWidth
    ? Math.min(maxWidth, image.naturalWidth)
    : image.naturalWidth
  canvas.width = width
  canvas.height = Math.max(
    1,
    Math.round((width * image.naturalHeight) / image.naturalWidth),
  )
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error('Image conversion failed')),
      'image/webp',
      quality,
    )
  })
  // Browsers may fall back to PNG when WebP encoding is unsupported.
  const outputMime = imageMimeFromBytes(
    new Uint8Array(await blob.slice(0, 16).arrayBuffer()),
  )
  if (!outputMime || outputMime !== blob.type)
    throw new Error('Image output format mismatch')
  if (!['image/webp', 'image/png', 'image/jpeg'].includes(outputMime))
    throw new Error('Unsupported image output')
  const extension =
    blob.type === 'image/webp'
      ? 'webp'
      : blob.type === 'image/png'
        ? 'png'
        : 'jpg'
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + extension, {
    type: blob.type,
  })
}

export async function uploadImage(
  file: File,
  app: string,
  preset: ImagePreset,
) {
  const config = policy.presets[preset]
  return uploadFile2Oss(file, app, {
    compress2Webp: true,
    requireImageMeta: true,
    compress2WebpOpt: {
      quality: config.quality / 100,
      maxWidth: config.maxWidth,
    },
  })
}

export async function uploadFile2Oss(
  _file: File,
  app?: string,
  opts?: {
    compress2Webp?: boolean
    requireImageMeta?: boolean
    compress2WebpOpt?: {
      quality?: number
      maxWidth?: number
    }
  },
) {
  try {
    const actualMime = imageMimeFromBytes(
      new Uint8Array(await _file.slice(0, 16).arrayBuffer()),
    )
    const extensions = policy.extensions
    let file =
      actualMime &&
      (actualMime !== _file.type ||
        !_file.name.toLowerCase().endsWith('.' + extensions[actualMime]))
        ? new File(
            [_file],
            _file.name.replace(/\.[^.]+$/, '') + '.' + extensions[actualMime],
            { type: actualMime },
          )
        : _file
    if (opts?.compress2Webp) {
      file = await convertImageToWebP(
        file,
        opts?.compress2WebpOpt?.quality,
        opts?.compress2WebpOpt?.maxWidth,
      )
    }
    const imageMeta = await (async () => {
      if (!file.type.startsWith('image/')) {
        return null
      }
      try {
        return await createImageUrlMeta(file)
      } catch {
        if (file.type.startsWith('image/') || opts?.requireImageMeta) {
          throw new Error('Failed to generate image placeholder')
        }
        return null
      }
    })()
    const preUpload = await http.post(
      'PostRequestUpload',
      {
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        app: app ?? 'general',
      },
      undefined,
      {
        headers: imageMeta
          ? { 'X-Image-Metadata': JSON.stringify(imageMeta) }
          : {},
      },
    )

    const {
      url,
      fileName,
      filePath,
      uploadMethod = 'PUT',
      fields,
      headers,
    } = preUpload.data

    if (!preUpload.isSuccess || !filePath) {
      throw new Error()
    }

    const uploadFileValue = new File([file], fileName, {
      type: file.type,
      lastModified: file.lastModified,
    })
    await uploadFile(url, uploadFileValue, uploadMethod, fields, headers)

    return imageMeta ? appendImageUrlMeta(filePath, imageMeta) : filePath
  } catch {
    toast('uploadFailed', {
      type: 'error',
    })
  }
}

/** Compatibility entry point; no separate resize rules. */
export { getOssImageVariant as getCompressImage } from './image-core.cjs'
