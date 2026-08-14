'use client'
import axios from 'axios'
import { http } from '../services/http'
import { toast } from './toast'

const axiosInstance = axios.create()

type UploadMethod = 'POST' | 'PUT'

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

    return filePath
  } catch {
    toast('uploadFailed', {
      type: 'error',
    })
  }
}

export function getCompressImage(path: string, width: number) {
  return `${path}?x-oss-process=image/resize,w_${width}`
}
