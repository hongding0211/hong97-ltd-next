import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type PermissionGrantDocument = PermissionGrant & Document

@Schema({ timestamps: true })
export class PermissionGrant {
  @Prop({ required: true, index: true })
  permissionKey: string

  @Prop({ required: true, index: true })
  userId: string

  @Prop({ required: true })
  createdBy: string
}

export const PermissionGrantSchema =
  SchemaFactory.createForClass(PermissionGrant)

PermissionGrantSchema.index({ permissionKey: 1, userId: 1 }, { unique: true })
