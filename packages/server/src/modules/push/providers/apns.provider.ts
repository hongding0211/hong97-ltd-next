import { createSign } from 'crypto'
import { readFileSync } from 'fs'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type {
  ApnsCredentialConfig,
  PushConfig,
} from '../../../config/push/push.config'
import type { PushDeviceDocument } from '../schema/push-device.schema'
import type {
  PushDeliveryCode,
  PushDeliveryResult,
  PushMessage,
  PushProviderAdapter,
} from '../types'
import { ApnsHttpClient } from './apns-http-client'

interface CachedProviderToken {
  value: string
  expiresAt: number
}

const TOKEN_TTL_MS = 50 * 60 * 1000

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export function createApnsProviderToken(
  credential: ApnsCredentialConfig,
  issuedAt = Math.floor(Date.now() / 1000),
) {
  const header = base64Url(
    JSON.stringify({
      alg: 'ES256',
      kid: credential.keyId,
    }),
  )
  const payload = base64Url(
    JSON.stringify({
      iss: credential.teamId,
      iat: issuedAt,
    }),
  )
  const signingInput = `${header}.${payload}`
  const signer = createSign('SHA256')
  signer.update(signingInput)
  signer.end()

  const privateKey = resolvePrivateKey(credential)
  const signature = signer.sign({
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  } as any)

  return `${signingInput}.${base64Url(signature)}`
}

export function resolvePrivateKey(credential: ApnsCredentialConfig) {
  if (credential.privateKey) {
    return credential.privateKey.replace(/\\n/g, '\n')
  }
  if (credential.privateKeyPath) {
    return readFileSync(credential.privateKeyPath, 'utf8')
  }

  throw new Error(
    `APNs credential ${credential.credentialRef} has no private key`,
  )
}

export function buildApnsPayload(message: PushMessage) {
  const aps: Record<string, unknown> = {}

  if (message.mode === 'alert' && message.alert) {
    aps.alert = Object.fromEntries(
      Object.entries(message.alert).filter(([, value]) => value !== undefined),
    )
  }
  if (message.mode === 'silent') {
    aps['content-available'] = 1
  }
  if (message.badge !== undefined) {
    aps.badge = message.badge
  }
  if (message.sound) {
    aps.sound = message.sound
  }
  if (message.apns?.category) {
    aps.category = message.apns.category
  }
  if (message.apns?.threadId) {
    aps['thread-id'] = message.apns.threadId
  }

  return {
    ...(message.data || {}),
    aps,
  }
}

export function mapApnsResponse(
  status: number,
  reason?: string,
): PushDeliveryCode {
  if (status === 200) {
    return 'accepted'
  }
  if (
    status === 410 ||
    reason === 'BadDeviceToken' ||
    reason === 'DeviceTokenNotForTopic' ||
    reason === 'Unregistered'
  ) {
    return 'invalid-token'
  }
  if (status === 403) {
    return 'auth-error'
  }
  if (status === 429) {
    return 'rate-limited'
  }
  if (status >= 500) {
    return 'provider-unavailable'
  }
  if (status >= 400) {
    return 'bad-request'
  }

  return 'unknown-error'
}

@Injectable()
export class ApnsPushProvider implements PushProviderAdapter {
  readonly provider = 'apns' as const
  private readonly tokenCache = new Map<string, CachedProviderToken>()

  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: ApnsHttpClient,
  ) {}

  async send(
    device: PushDeviceDocument,
    message: PushMessage,
  ): Promise<PushDeliveryResult> {
    const credential = this.getCredential(message.app.credentialRef)
    const response = await this.httpClient.post({
      host:
        message.app.environment === 'production'
          ? 'api.push.apple.com'
          : 'api.sandbox.push.apple.com',
      path: `/3/device/${device.providerToken}`,
      headers: this.buildHeaders(message, credential),
      body: buildApnsPayload(message),
    })
    const reason =
      typeof response.body?.reason === 'string'
        ? response.body.reason
        : undefined

    return {
      appId: device.appId,
      recipientId: device.recipientId,
      deviceId: device.deviceId,
      provider: 'apns',
      providerToken: device.providerToken,
      providerStatus: response.status,
      providerReason: reason,
      code: mapApnsResponse(response.status, reason),
    }
  }

  private buildHeaders(message: PushMessage, credential: ApnsCredentialConfig) {
    const headers: Record<string, string> = {
      authorization: `bearer ${this.getProviderToken(credential)}`,
      'apns-topic': message.app.topic,
      'apns-push-type':
        message.apns?.pushType ||
        (message.mode === 'silent' ? 'background' : 'alert'),
      'apns-priority':
        message.apns?.priority || (message.mode === 'silent' ? '5' : '10'),
    }

    if (message.apns?.collapseId) {
      headers['apns-collapse-id'] = message.apns.collapseId
    }

    return headers
  }

  private getProviderToken(credential: ApnsCredentialConfig) {
    const cached = this.tokenCache.get(credential.credentialRef)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value
    }

    const value = createApnsProviderToken(credential)
    this.tokenCache.set(credential.credentialRef, {
      value,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    })

    return value
  }

  private getCredential(credentialRef: string) {
    const pushConfig = this.configService.get<PushConfig>('push')
    const credential = pushConfig?.apnsCredentials[credentialRef]
    if (!credential) {
      throw new Error(`Missing APNs credential ${credentialRef}`)
    }

    return credential
  }
}
