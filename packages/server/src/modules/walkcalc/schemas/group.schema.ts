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

  @Prop()
  createdAt: number

  @Prop()
  modifiedAt: number

  @Prop([{ type: Object }])
  members: Array<{
    userId: string
    debt: number
    cost: number
  }>

  @Prop([{ type: Object }])
  records: Array<{
    who: string
    paid: number
    forWhom: string[]
    type: string
    text?: string
    long?: number
    lat?: number
    recordId: string
    createdAt: number
    modifiedAt: number
  }>

  @Prop([{ type: Object }])
  tempUsers: Array<{
    uuid: string
    name: string
    debt: number
    cost: number
  }>

  @Prop([{ type: Object }])
  archivedUsers: Array<string>
}

export const GroupSchema = SchemaFactory.createForClass(Group)
