import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export interface WalkcalcMember {
  userId: string
  debt: number
  cost: number
}

export interface WalkcalcTempUser {
  uuid: string
  name: string
  debt: number
  cost: number
}

export interface WalkcalcRecord {
  recordId: string
  who: string
  paid: number
  forWhom: string[]
  type?: string
  text?: string
  long?: string
  lat?: string
  isDebtResolve?: boolean
  createdAt: number
  modifiedAt: number
  createdBy: string
  modifiedBy?: string
}

const WalkcalcMemberSchema = {
  _id: false,
  userId: { type: String, required: true },
  debt: { type: Number, required: true, default: 0 },
  cost: { type: Number, required: true, default: 0 },
}

const WalkcalcTempUserSchema = {
  _id: false,
  uuid: { type: String, required: true },
  name: { type: String, required: true },
  debt: { type: Number, required: true, default: 0 },
  cost: { type: Number, required: true, default: 0 },
}

const WalkcalcRecordSchema = {
  _id: false,
  recordId: { type: String, required: true },
  who: { type: String, required: true },
  paid: { type: Number, required: true },
  forWhom: { type: [String], required: true, default: [] },
  type: { type: String },
  text: { type: String },
  long: { type: String },
  lat: { type: String },
  isDebtResolve: { type: Boolean },
  createdAt: { type: Number, required: true },
  modifiedAt: { type: Number, required: true },
  createdBy: { type: String, required: true },
  modifiedBy: { type: String },
}

@Schema({ timestamps: true, collection: 'walkcalc_groups' })
export class WalkcalcGroup {
  @Prop({ required: true, unique: true })
  code: string

  @Prop({ required: true, unique: true })
  idx: number

  @Prop({ required: true })
  ownerUserId: string

  @Prop({ required: true })
  name: string

  @Prop({ type: [WalkcalcMemberSchema], default: [] })
  members: WalkcalcMember[]

  @Prop({ type: [WalkcalcTempUserSchema], default: [] })
  tempUsers: WalkcalcTempUser[]

  @Prop({ type: [WalkcalcRecordSchema], default: [] })
  records: WalkcalcRecord[]

  @Prop({ type: [String], default: [] })
  archivedUserIds: string[]

  @Prop({ required: true, default: Date.now })
  createdAtMs: number

  @Prop({ required: true, default: Date.now })
  modifiedAt: number
}

export type WalkcalcGroupDocument = WalkcalcGroup & Document

export const WalkcalcGroupSchema = SchemaFactory.createForClass(WalkcalcGroup)

WalkcalcGroupSchema.index({ ownerUserId: 1 })
WalkcalcGroupSchema.index({ 'members.userId': 1 })
WalkcalcGroupSchema.index({ modifiedAt: -1 })
