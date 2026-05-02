import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type ApiTokenDocument = ApiToken & Document

@Schema({ timestamps: true })
export class ApiToken {
  @Prop({ required: true, unique: true })
  tokenId: string

  @Prop({ required: true, index: true })
  userId: string

  @Prop({ required: true })
  name: string

  @Prop({ required: true, unique: true })
  tokenHash: string

  @Prop({ required: true })
  tokenPrefix: string

  @Prop({ type: Date, default: null })
  lastUsedAt?: Date | null
}

export const ApiTokenSchema = SchemaFactory.createForClass(ApiToken)
