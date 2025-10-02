import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type ShortLinkDocument = ShortLink & Document

@Schema({ timestamps: true })
export class ShortLink {
  @Prop({ required: true, unique: true })
  shortCode: string

  @Prop({ required: true })
  originalUrl: string

  @Prop({ required: false })
  title?: string

  @Prop({ required: false })
  description?: string

  @Prop({ required: false, default: 0 })
  clickCount: number

  @Prop({ required: false, default: true })
  isActive: boolean

  @Prop({ required: false })
  expiresAt?: Date

  @Prop({ required: true })
  createdBy: string

  @Prop({ required: false, default: [] })
  tags: string[]
}

export const ShortLinkSchema = SchemaFactory.createForClass(ShortLink)
