import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type RefreshSessionDocument = RefreshSession & Document

@Schema({ timestamps: true })
export class RefreshSession {
  @Prop({ required: true, unique: true })
  sessionId: string

  @Prop({ required: true, index: true })
  userId: string

  @Prop({ required: true })
  tokenHash: string

  @Prop({ required: true, index: true })
  expiresAt: Date

  @Prop({ type: Date, default: null })
  revokedAt?: Date | null

  @Prop({ type: Date, default: null })
  rotatedAt?: Date | null
}

export const RefreshSessionSchema = SchemaFactory.createForClass(RefreshSession)
