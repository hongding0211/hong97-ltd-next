import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type UCPDocument = UCP & Document

@Schema({ timestamps: true })
export class UCP {
  @Prop({ required: true, unique: true })
  id: string

  @Prop({ required: true })
  desc: string

  @Prop({ required: true })
  data: any[]

  @Prop({ required: true })
  createdBy: string
}

export const UCPSchema = SchemaFactory.createForClass(UCP)
