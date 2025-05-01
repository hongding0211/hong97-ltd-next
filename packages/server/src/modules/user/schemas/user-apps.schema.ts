import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type UserAppType = {
  walkcalc: {
    totalDebt?: number
  }
}

export type UserAppDocument = UserApp & Document

@Schema({ timestamps: true })
export class UserApp {
  @Prop({ required: true, unique: true })
  userId: string

  @Prop({ type: Object })
  data?: Record<keyof UserAppType, UserAppType[keyof UserAppType]>
}

export const UserAppSchema = SchemaFactory.createForClass(UserApp)
