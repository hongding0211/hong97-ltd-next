import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import type { PushEnvironment, PushPlatform, PushProviderName } from '../types'

export type PushDeviceDocument = PushDevice & Document

@Schema({ timestamps: true })
export class PushDevice {
  @Prop({ required: true })
  deviceId: string

  @Prop({ required: true, index: true })
  recipientId: string

  @Prop({ required: true, index: true })
  appId: string

  @Prop({ required: true })
  platform: PushPlatform

  @Prop({ required: true })
  provider: PushProviderName

  @Prop({ required: true })
  providerToken: string

  @Prop({ required: true })
  environment: PushEnvironment

  @Prop({ required: true })
  locale: string

  @Prop()
  appVersion?: string

  @Prop()
  bundleId?: string

  @Prop()
  deviceModel?: string

  @Prop({ type: Object })
  metadata?: Record<string, unknown>

  @Prop({ default: true, index: true })
  enabled: boolean

  @Prop({ type: Date, required: true })
  lastRegisteredAt: Date

  @Prop({ type: Date, default: null })
  lastSuccessAt?: Date | null

  @Prop({ type: Date, default: null })
  lastFailureAt?: Date | null

  @Prop()
  failureReason?: string
}

export const PushDeviceSchema = SchemaFactory.createForClass(PushDevice)

PushDeviceSchema.index(
  { appId: 1, platform: 1, providerToken: 1, environment: 1 },
  { unique: true },
)
PushDeviceSchema.index({ appId: 1, recipientId: 1, enabled: 1 })
PushDeviceSchema.index({ lastRegisteredAt: 1 })
