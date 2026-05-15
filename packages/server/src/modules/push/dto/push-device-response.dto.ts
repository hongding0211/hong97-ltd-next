import type { PushDeviceDocument } from '../schema/push-device.schema'

export class PushDeviceResponseDto {
  deviceId: string
  recipientId: string
  appId: string
  platform: string
  provider: string
  environment: string
  locale: string
  enabled: boolean
  appVersion?: string
  bundleId?: string
  deviceModel?: string
  lastRegisteredAt: Date

  static fromDocument(device: PushDeviceDocument): PushDeviceResponseDto {
    return {
      deviceId: device.deviceId,
      recipientId: device.recipientId,
      appId: device.appId,
      platform: device.platform,
      provider: device.provider,
      environment: device.environment,
      locale: device.locale,
      enabled: device.enabled,
      appVersion: device.appVersion,
      bundleId: device.bundleId,
      deviceModel: device.deviceModel,
      lastRegisteredAt: device.lastRegisteredAt,
    }
  }
}
