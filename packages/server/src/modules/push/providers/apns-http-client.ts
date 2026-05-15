import { Injectable } from '@nestjs/common'
import * as http2 from 'http2'

export interface ApnsHttpRequest {
  host: string
  path: string
  headers: Record<string, string>
  body: Record<string, unknown>
}

export interface ApnsHttpResponse {
  status: number
  headers: http2.IncomingHttpHeaders
  body?: Record<string, unknown>
}

@Injectable()
export class ApnsHttpClient {
  post(request: ApnsHttpRequest): Promise<ApnsHttpResponse> {
    return new Promise((resolve, reject) => {
      const client = http2.connect(`https://${request.host}`)
      const req = client.request({
        ':method': 'POST',
        ':path': request.path,
        ...request.headers,
      })
      const chunks: Buffer[] = []

      req.setEncoding('utf8')
      req.on('response', (headers) => {
        req.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk))
        })
        req.on('end', () => {
          client.close()
          const rawBody = Buffer.concat(chunks).toString('utf8')
          resolve({
            status: Number(headers[':status'] || 0),
            headers,
            body: rawBody ? JSON.parse(rawBody) : undefined,
          })
        })
      })
      req.on('error', (error) => {
        client.close()
        reject(error)
      })
      req.end(JSON.stringify(request.body))
    })
  }
}
