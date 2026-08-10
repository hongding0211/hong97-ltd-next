import type { NextApiRequest, NextApiResponse } from 'next'

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024

export const config = {
  api: {
    bodyParser: false,
  },
}

const readBody = async (request: NextApiRequest): Promise<Buffer> => {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_UPLOAD_SIZE) {
      throw new Error('Upload is too large')
    }
    chunks.push(buffer)
  }

  return Buffer.concat(chunks)
}

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  if (process.env.NODE_ENV !== 'development') {
    response.status(404).end()
    return
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).end()
    return
  }

  const uploadUrlHeader = request.headers['x-oss-upload-url']
  const uploadUrlValue = Array.isArray(uploadUrlHeader)
    ? uploadUrlHeader[0]
    : uploadUrlHeader

  if (!uploadUrlValue) {
    response.status(400).end()
    return
  }

  try {
    const uploadUrl = new URL(uploadUrlValue)
    if (
      uploadUrl.protocol !== 'https:' ||
      !uploadUrl.hostname.endsWith('.aliyuncs.com')
    ) {
      response.status(400).end()
      return
    }

    const body = await readBody(request)
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body,
    })

    if (!uploadResponse.ok) {
      response.status(502).end()
      return
    }

    response.status(204).end()
  } catch {
    response.status(502).end()
  }
}
