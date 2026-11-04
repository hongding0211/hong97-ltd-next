import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type BlogDocument = Blog & Document

@Schema({ _id: false })
export class BlogDraft {
  @Prop({ type: String })
  title: string

  @Prop({ type: String })
  coverImg: string

  @Prop({ required: true, type: [String] })
  keywords: string[]

  @Prop({ type: String })
  content: string

  @Prop({ required: true, type: Number })
  savedAt: number
}

const BlogDraftSchema = SchemaFactory.createForClass(BlogDraft)

@Schema({ timestamps: true })
export class Blog {
  @Prop({ required: true, unique: true })
  blogId: string

  @Prop({ required: true })
  title: string

  @Prop({ required: true })
  viewHistory: {
    userId?: string
    visitorIdHash?: string
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
    parentCommentId?: string
    replyToCommentId?: string
    userId?: string
    anonymous: boolean
    name?: string
    time: number
    content: string
    deleted?: boolean
  }[]

  @Prop({ required: false })
  keywords?: string[]

  @Prop({ required: false })
  coverImg?: string

  @Prop({ required: true })
  time: number

  @Prop()
  authRequired?: boolean

  @Prop({ required: false })
  shortCode?: string

  @Prop({ required: false })
  content?: string

  @Prop()
  hasPublished?: boolean

  @Prop()
  hidden2Public?: boolean

  @Prop({ default: false })
  pinned?: boolean

  @Prop()
  lastUpdateTime?: number

  @Prop({ type: BlogDraftSchema, required: false, select: false })
  draft?: BlogDraft
}

export const BlogSchema = SchemaFactory.createForClass(Blog)
