'use client'
import axios from 'axios'
import { http } from '../services/http'
import { toast } from './toast'

const axiosInstance = axios.create()

export async function uploadFile2Oss(file: File, app?: string) {
  try {
    const preUpload = await http.post('PostRequestUpload', {
      fileName: file.name,
      contentType: 'application/octet-stream',
      app: app ?? 'general',
      compress: true,
      quality: 90,
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
