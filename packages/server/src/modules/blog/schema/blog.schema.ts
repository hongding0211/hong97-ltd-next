import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type BlogDocument = Blog & Document

@Schema({ timestamps: true })
export class Blog {
  @Prop({ required: true, unique: true })
  blogId: string

  @Prop({ required: true })
  title: string

  @Prop({ required: true })
  viewHistory: {
    userId?: string
    time: number
  }[]

  @Prop({ required: true })
  likeHistory: {
    userId?: string
    time: number
  }[]

  @Prop({ required: true })
  comments: {
    commentId?: string
    userId?: string
    anonymous: boolean
    name?: string
    time: number
    content: string
  }[]

  @Prop({ required: true })
  keywords: string[]

  @Prop({ required: false })
  coverImg?: string

  @Prop({ required: true })
  time: number
}

export const BlogSchema = SchemaFactory.createForClass(Blog)
