import { randomUUID } from 'crypto'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import type { PushAppConfig, PushConfig } from '../../config/push/push.config'
import { PushNotificationCatalog } from './catalog'
import { ApnsPushProvider } from './providers/apns.provider'
import { PushDevice, PushDeviceDocument } from './schema/push-device.schema'
import type {
  PushDeliveryResult,
  PushProviderAdapter,
  SendNotificationInput,
  SendNotificationResult,
  UpsertPushDeviceInput,
} from './types'

interface DisablePushDeviceInput {
  appId: string
  providerToken: string
  environment: string
  reason?: string
}

interface DisablePushDeviceForRecipientInput {
  recipientId: string
  deviceId: string
  reason?: string
}

@Injectable()
export class PushService {
  private readonly adapters: Record<string, PushProviderAdapter>

  constructor(
    @InjectModel(PushDevice.name)
    private readonly pushDeviceModel: Model<PushDeviceDocument>,
    private readonly configService: ConfigService,
    private readonly catalog: PushNotificationCatalog,
    apnsProvider: ApnsPushProvider,
  ) {
    this.adapters = {
      [apnsProvider.provider]: apnsProvider,
    }
  }

  async upsertDeviceRegistration(input: UpsertPushDeviceInput) {
    const app = this.getAppConfig(input.appId)
    if (input.platform !== app.platform) {
      throw new Error(`Push app ${input.appId} only supports ${app.platform}`)
    }
    if (input.environment !== app.environment) {
      throw new Error(
        `Push app ${input.appId} is configured for ${app.environment}`,
      )
    }

    const now = new Date()
    const providerToken = input.providerToken.trim()
    const setFields: Partial<PushDevice> = {
      recipientId: input.recipientId,
      appId: app.appId,
      platform: app.platform,
      provider: app.provider,
      providerToken,
      environment: app.environment,
      locale: this.catalog.resolveLocale(app, input.locale),
      appVersion: input.appVersion,
      bundleId: input.bundleId,
      deviceModel: input.deviceModel,
      metadata: input.metadata,
      enabled: true,
      lastRegisteredAt: now,
      failureReason: undefined,
    }

    if (input.deviceId) {
      setFields.deviceId = input.deviceId
    }

    const setOnInsert: Partial<PushDevice> = {}
    if (!input.deviceId) {
      setOnInsert.deviceId = randomUUID()
    }

    return this.execQuery(
      this.pushDeviceModel.findOneAndUpdate(
        {
          appId: app.appId,
          platform: app.platform,
          providerToken,
          environment: app.environment,
        },
        {
          $set: setFields,
          $setOnInsert: setOnInsert,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      ),
    )
  }

  async disableDeviceRegistration(input: DisablePushDeviceInput) {
    return this.execQuery(
      this.pushDeviceModel.updateOne(
        {
          appId: input.appId,
          providerToken: input.providerToken,
          environment: input.environment,
        },
        {
          $set: {
            enabled: false,
            lastFailureAt: new Date(),
            failureReason: input.reason,
          },
        },
      ),
    )
  }

  async disableDeviceForRecipient(input: DisablePushDeviceForRecipientInput) {
    return this.execQuery(
      this.pushDeviceModel.updateOne(
        {
          recipientId: input.recipientId,
          deviceId: input.deviceId,
        },
        {
          $set: {
            enabled: false,
            lastFailureAt: new Date(),
            failureReason: input.reason,
          },
        },
      ),
    )
  }

  async sendNotification(
    input: SendNotificationInput,
  ): Promise<SendNotificationResult> {
    const app = this.getAppConfig(input.appId)
    const entry = this.catalog.get(input.type)
    if (!entry) {
      throw new Error(`Unknown push notification type: ${input.type}`)
    }
    this.catalog.validatePayload(entry, input.payload)

    const devices = await this.execQuery(
      this.pushDeviceModel.find({
        appId: app.appId,
        recipientId: input.recipientId,
        enabled: true,
        environment: app.environment,
      }),
    )

    if (!devices.length) {
      return {
        appId: app.appId,
        recipientId: input.recipientId,
        type: input.type,
        results: [
          {
            code: 'no-destination',
            appId: app.appId,
            recipientId: input.recipientId,
          },
        ],
      }
    }

    const results = await Promise.all(
      devices.map((device) => this.sendToDevice(app, device, entry, input)),
    )

    return {
      appId: app.appId,
      recipientId: input.recipientId,
      type: input.type,
      results,
    }
  }

  private async sendToDevice(
    app: PushAppConfig,
    device: PushDeviceDocument,
    entry: NonNullable<ReturnType<PushNotificationCatalog['get']>>,
    input: SendNotificationInput,
  ): Promise<PushDeliveryResult> {
    const adapter = this.adapters[device.provider]
    if (!adapter) {
      return this.providerFailureResult(
        device,
        'unknown-error',
        'unknown-provider',
      )
    }

    try {
      const message = this.catalog.renderMessage(
        app,
        device,
        entry,
        input.payload,
      )
      const result = await adapter.send(device, message)
      await this.recordDeliveryResult(device, result)
      return result
    } catch (error) {
      const result = this.providerFailureResult(
        device,
        'provider-unavailable',
        (error as Error).message,
      )
      await this.recordDeliveryResult(device, result)
      return result
    }
  }

  private async recordDeliveryResult(
    device: PushDeviceDocument,
    result: PushDeliveryResult,
  ) {
    const deviceQuery = { _id: (device as any)._id }
    if (result.code === 'accepted') {
      await this.execQuery(
        this.pushDeviceModel.updateOne(deviceQuery, {
          $set: {
            lastSuccessAt: new Date(),
            failureReason: undefined,
          },
        }),
      )
      return
    }

    await this.execQuery(
      this.pushDeviceModel.updateOne(deviceQuery, {
        $set: {
          enabled: result.code === 'invalid-token' ? false : device.enabled,
          lastFailureAt: new Date(),
          failureReason: result.providerReason || result.code,
        },
      }),
    )
  }

  private providerFailureResult(
    device: PushDeviceDocument,
    code: PushDeliveryResult['code'],
    reason: string,
  ): PushDeliveryResult {
    return {
      code,
      appId: device.appId,
      recipientId: device.recipientId,
      deviceId: device.deviceId,
      provider: device.provider,
      providerToken: device.providerToken,
      providerReason: reason,
    }
  }

  private getAppConfig(appId: string) {
    const pushConfig = this.configService.get<PushConfig>('push')
    const app = pushConfig?.apps.find((item) => item.appId === appId)
    if (!app) {
      throw new Error(`Unknown push app: ${appId}`)
    }

    return app
  }

  private async execQuery<T>(
    query: T | { exec: () => Promise<T> },
  ): Promise<T> {
    if (query && typeof (query as any).exec === 'function') {
      return (query as any).exec()
    }

    return query as T
  }
}
