import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type RecordDocument = Record & Document

@Schema()
export class Record {
  @Prop()
  groupId: string

  @Prop()
  creatorId: string

  @Prop()
  amount: number

  @Prop()
  description: string

  @Prop([{ type: Object }])
  participants: Array<{
    userId: string
    amount: number
    name: string
    avatar?: string
  }>

  @Prop()
  createdAt: number

  @Prop()
  modifiedAt: number
}

export const RecordSchema = SchemaFactory.createForClass(Record)
