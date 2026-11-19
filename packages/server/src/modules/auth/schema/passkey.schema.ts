import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'

@Schema({ _id: false })
export class PasskeyCredential {
  @Prop({ required: true })
  id: string

  @Prop({ required: true })
  rpId: string

  @Prop({ required: true })
  publicKey: string

  @Prop({ required: true })
  counter: number

  @Prop({ type: [String], default: [] })
  transports: AuthenticatorTransportFuture[]

  @Prop({ required: true })
  createdAt: Date

  @Prop({ type: String })
  createdUserAgent?: string

  @Prop({ type: Boolean })
  createdWithTouch?: boolean
}

export const PasskeyCredentialSchema =
  SchemaFactory.createForClass(PasskeyCredential)

@Schema()
export class PasskeyChallenge {
  @Prop({ required: true, unique: true })
  challenge: string

  @Prop({ required: true })
  browserId: string

  @Prop({ required: true })
  kind: 'registration' | 'authentication'

  @Prop({ type: String, default: null })
  userId: string | null

  @Prop({ required: true })
  rpId: string

  @Prop({ required: true, expires: 0 })
  expiresAt: Date
}

export const PasskeyChallengeSchema =
  SchemaFactory.createForClass(PasskeyChallenge)
