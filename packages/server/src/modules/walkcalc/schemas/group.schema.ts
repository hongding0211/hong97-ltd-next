import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type GroupDocument = Group & Document

@Schema()
export class Group {
  @Prop()
  idx: number

  @Prop()
  id: string

  @Prop()
  ownerId: string

  @Prop()
  name: string

  @Prop([{ type: Object }])
  members: Array<{
    userId: string
    name: string
    avatar?: string
  }>

  @Prop([{ type: Object }])
  records: Array<{
    id: string
    amount: number
    description: string
    creatorId: string
    participants: Array<{
      userId: string
      amount: number
    }>
    createdAt: number
  }>

  @Prop()
  createdAt: number

  @Prop()
  modifiedAt: number

  @Prop([{ type: Object }])
  tempUsers: Array<{
    id: string
    name: string
  }>

  @Prop([{ type: Object }])
  archivedUsers: Array<{
    userId: string
    name: string
    avatar?: string
  }>
}

export const GroupSchema = SchemaFactory.createForClass(Group)
