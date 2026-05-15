import type {
  PushAppConfig,
  PushEnvironment as ConfigPushEnvironment,
} from '../../config/push/push.config'
import type { PushDeviceDocument } from './schema/push-device.schema'

export type PushPlatform = 'ios'
export type PushProviderName = 'apns'
export type PushEnvironment = ConfigPushEnvironment
export type PushMode = 'alert' | 'silent' | 'badge' | 'data'

export type PushDeliveryCode =
  | 'accepted'
  | 'no-destination'
  | 'invalid-token'
  | 'bad-request'
  | 'auth-error'
  | 'rate-limited'
  | 'provider-unavailable'
  | 'unknown-error'

export interface UpsertPushDeviceInput {
  appId: string
  recipientId: string
  platform: PushPlatform
  providerToken: string
  environment: PushEnvironment
  locale: string
  deviceId?: string
  appVersion?: string
  bundleId?: string
  deviceModel?: string
  metadata?: Record<string, unknown>
}

export interface SendNotificationInput {
  appId: string
  recipientId: string
  type: string
  payload: Record<string, unknown>
}

export interface PushDeliveryResult {
  code: PushDeliveryCode
  appId: string
  recipientId: string
  deviceId?: string
  provider?: PushProviderName
  providerToken?: string
  providerStatus?: number
  providerReason?: string
}

export interface SendNotificationResult {
  appId: string
  recipientId: string
  type: string
  results: PushDeliveryResult[]
}

export interface ApnsLocalizedAlert {
  title?: string
  body?: string
  'title-loc-key'?: string
  'title-loc-args'?: string[]
  'loc-key'?: string
  'loc-args'?: string[]
}

export interface PushMessage {
  app: PushAppConfig
  type: string
  mode: PushMode
  alert?: ApnsLocalizedAlert
  badge?: number
  sound?: string
  data?: Record<string, unknown>
  apns?: {
    pushType?: string
    priority?: '5' | '10'
    collapseId?: string
    category?: string
    threadId?: string
  }
}

export interface PushProviderAdapter {
  provider: PushProviderName
  send(
    device: PushDeviceDocument,
    message: PushMessage,
  ): Promise<PushDeliveryResult>
}
