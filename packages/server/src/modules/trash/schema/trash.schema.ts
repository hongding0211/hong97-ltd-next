import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export interface LivePhotoMedia {
  imageUrl: string
  videoUrl?: string
}

@Schema({ timestamps: true })
export class Trash {
  _id: Types.ObjectId

  @Prop({ required: false })
  content?: string

  @Prop({ required: false })
  media?: LivePhotoMedia[]

  @Prop({ required: false, default: [] })
  tags: string[]

  @Prop({ required: true, default: Date.now })
  timestamp: number

  createdAt: Date
  updatedAt: Date
}

export type TrashDocument = Trash & Document

export const TrashSchema = SchemaFactory.createForClass(Trash)
