'use client'
import axios from 'axios'
import { rgbaToThumbHash } from 'thumbhash'
import { http } from '../services/http'
import { toast } from './toast'

const axiosInstance = axios.create()

type UploadMethod = 'POST' | 'PUT'

export type ImageUrlMeta = {
  width: number
  height: number
  thumbHash: string
}

const IMAGE_META_MAX_EDGE = 100

const bytesToBase64Url = (bytes: Uint8Array) => {
  let value = ''
  bytes.forEach((byte) => {
    value += String.fromCharCode(byte)
  })
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

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
  const thumbHash = bytesToBase64Url(
    rgbaToThumbHash(thumbWidth, thumbHeight, pixels),
  )

  return { width, height, thumbHash }
}

export function appendImageUrlMeta(path: string, meta: ImageUrlMeta) {
  const [basePath, existingFragment = ''] = path.split('#', 2)
  const params = new URLSearchParams(existingFragment)
  params.set('w', String(meta.width))
  params.set('h', String(meta.height))
  params.set('th', meta.thumbHash)
  return `${basePath}#${params.toString()}`
}

export function getImageUrlMeta(path: string): ImageUrlMeta | null {
  const fragment = path.split('#', 2)[1]
  if (!fragment) {
    return null
  }

  const params = new URLSearchParams(fragment)
  const width = Number(params.get('w'))
  const height = Number(params.get('h'))
  const thumbHash = params.get('th') ?? ''
  if (
    !Number.isInteger(width) ||
    width <= 0 ||
    !Number.isInteger(height) ||
    height <= 0 ||
    !/^[A-Za-z0-9_-]+$/.test(thumbHash)
  ) {
    return null
  }

  return { width, height, thumbHash }
}

const uploadViaDevProxy = async (
  url: string,
  file: File,
  method: UploadMethod,
  fields?: Record<string, string>,
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
    },
  })
}

const uploadFile = async (
  url: string,
  file: File,
  method: UploadMethod,
  fields?: Record<string, string>,
) => {
  if (process.env.NODE_ENV === 'development') {
    await uploadViaDevProxy(url, file, method, fields)
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
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    })
  }
}

export async function convertImageToWebP(
  file: File,
  quality = 0.9,
  maxWidth?: number,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      const ratio = (() => {
        const r = img.width / (img.height || 0)
        return r ?? 1
      })()
      const newWidth = (() => {
        if (!maxWidth) {
          return img.width
        }
        return Math.min(maxWidth, img.width)
      })()
      const newHeight = newWidth / ratio

      canvas.width = newWidth
      canvas.height = newHeight
      ctx?.drawImage(img, 0, 0, newWidth, newHeight)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const webpFile = new File(
              [blob],
              file.name.replace(/\.(jpg|jpeg|png)$/i, '.webp'),
              { type: 'image/webp' },
            )
            resolve(webpFile)
          } else {
            reject(new Error('Failed to convert image'))
          }
        },
        'image/webp',
        quality,
      )
    }

    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export async function uploadFile2Oss(
  _file: File,
  app?: string,
  opts?: {
    compress2Webp?: boolean
    compress2WebpOpt?: {
      quality?: number
      maxWidth?: number
    }
  },
) {
  try {
    let file = _file
    if (opts?.compress2Webp) {
      file = await convertImageToWebP(
        _file,
        opts?.compress2WebpOpt?.quality,
        opts?.compress2WebpOpt?.maxWidth,
      )
    }
    const imageMeta = await (async () => {
      if (
        (app ?? 'general') === 'uploader' ||
        !file.type.startsWith('image/')
      ) {
        return null
      }
      try {
        return await createImageUrlMeta(file)
      } catch {
        return null
      }
    })()
    const preUpload = await http.post('PostRequestUpload', {
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSize: file.size,
      app: app ?? 'general',
    })

    const {
      url,
      fileName,
      filePath,
      uploadMethod = 'PUT',
      fields,
    } = preUpload.data

    if (!preUpload.isSuccess || !filePath) {
      throw new Error()
    }

    const uploadFileValue = new File([file], fileName, {
      type: file.type,
      lastModified: file.lastModified,
    })
    await uploadFile(url, uploadFileValue, uploadMethod, fields)

    return imageMeta ? appendImageUrlMeta(filePath, imageMeta) : filePath
  } catch {
    toast('uploadFailed', {
      type: 'error',
    })
  }
}

export function getCompressImage(path: string, width: number) {
  const [basePath, fragment] = path.split('#', 2)
  const separator = basePath.includes('?') ? '&' : '?'
  const resizedPath = `${basePath}${separator}x-oss-process=image/resize,w_${width}`
  return fragment ? `${resizedPath}#${fragment}` : resizedPath
}
