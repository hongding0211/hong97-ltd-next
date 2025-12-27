'use client'
import axios from 'axios'
import { http } from '../services/http'
import { toast } from './toast'

const axiosInstance = axios.create()

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

export async function uploadFile2Oss(file: File, app?: string) {
  try {
    const preUpload = await http.post('PostRequestUpload', {
      fileName: file.name,
      contentType: 'application/octet-stream',
      app: app ?? 'general',
    })

    const { url, fileName, filePath } = preUpload.data

    if (!preUpload.isSuccess || !filePath) {
      throw new Error()
    }

    await axiosInstance.put(
      url,
      new File([file], fileName, {
        type: file.type,
        lastModified: file.lastModified,
      }),
      {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      },
    )

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
