import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type WalkcalcParticipantKind = 'user' | 'tempUser'
export type WalkcalcRecordType = 'expense' | 'settlement'

@Schema({ timestamps: true, collection: 'walkcalc_groups' })
export class WalkcalcGroup {
  @Prop({ required: true })
  code: string

  @Prop({ required: true })
  ownerUserId: string

  @Prop({ required: true })
  name: string

  @Prop({ type: [String], default: [] })
  archivedUserIds: string[]

  @Prop({ required: true, default: false })
  isDeleted: boolean

  @Prop()
  deletedAt?: number

  @Prop()
  deletedBy?: string

  @Prop({ required: true, default: Date.now })
  createdAtMs: number

  @Prop({ required: true, default: Date.now })
  modifiedAt: number
}

@Schema({ timestamps: true, collection: 'walkcalc_participants' })
export class WalkcalcParticipant {
  @Prop({ required: true })
  groupCode: string

  @Prop({ required: true })
  participantId: string

  @Prop({ required: true, enum: ['user', 'tempUser'] })
  kind: WalkcalcParticipantKind

  @Prop()
  userId?: string

  @Prop()
  tempName?: string

  @Prop({ required: true, default: Date.now })
  createdAtMs: number

  @Prop({ required: true, default: Date.now })
  modifiedAt: number
}

@Schema({ timestamps: true, collection: 'walkcalc_records' })
export class WalkcalcRecord {
  @Prop({ required: true })
  groupCode: string

  @Prop({ required: true })
  recordId: string

  @Prop({ required: true, enum: ['expense', 'settlement'] })
  type: WalkcalcRecordType

  @Prop({ required: true })
  amountValue: string

  @Prop()
  payerId?: string

  @Prop({ type: [String], default: [] })
  participantIds: string[]

  @Prop()
  fromId?: string

  @Prop()
  toId?: string

  @Prop({ type: [String], required: true, default: [] })
  involvedParticipantIds: string[]

  @Prop()
  category?: string

  @Prop()
  note?: string

  @Prop()
  long?: string

  @Prop()
  lat?: string

  @Prop({ required: true })
  createdAt: number

  @Prop({ required: true })
  updatedAt: number

  @Prop({ required: true })
  createdBy: string

  @Prop()
  updatedBy?: string
}

@Schema({ timestamps: true, collection: 'walkcalc_participant_projections' })
export class WalkcalcParticipantProjection {
  @Prop({ required: true })
  groupCode: string

  @Prop({ required: true })
  participantId: string

  @Prop({ required: true, enum: ['user', 'tempUser'] })
  kind: WalkcalcParticipantKind

  @Prop()
  userId?: string

  @Prop({ required: true, default: '0' })
  balanceValue: string

  @Prop({ required: true, default: '0' })
  expenseShareValue: string

  @Prop({ required: true, default: '0' })
  paidTotalValue: string

  @Prop({ required: true, default: 0 })
  recordCount: number

  @Prop({ required: true, default: '0' })
  settlementInValue: string

  @Prop({ required: true, default: '0' })
  settlementOutValue: string

  @Prop({ required: true, default: Date.now })
  modifiedAt: number
}

export type WalkcalcGroupDocument = WalkcalcGroup & Document
export type WalkcalcParticipantDocument = WalkcalcParticipant & Document
export type WalkcalcRecordDocument = WalkcalcRecord & Document
export type WalkcalcParticipantProjectionDocument =
  WalkcalcParticipantProjection & Document

export const WalkcalcGroupSchema = SchemaFactory.createForClass(WalkcalcGroup)
export const WalkcalcParticipantSchema =
  SchemaFactory.createForClass(WalkcalcParticipant)
export const WalkcalcRecordSchema = SchemaFactory.createForClass(WalkcalcRecord)
export const WalkcalcParticipantProjectionSchema = SchemaFactory.createForClass(
  WalkcalcParticipantProjection,
)

WalkcalcGroupSchema.index({ code: 1 }, { unique: true })
WalkcalcGroupSchema.index({ ownerUserId: 1 })
WalkcalcGroupSchema.index({ modifiedAt: -1 })

WalkcalcParticipantSchema.index(
  { groupCode: 1, participantId: 1 },
  { unique: true },
)
WalkcalcParticipantSchema.index({ userId: 1, groupCode: 1 })
WalkcalcParticipantSchema.index({ groupCode: 1, kind: 1 })

WalkcalcRecordSchema.index({ recordId: 1 }, { unique: true })
WalkcalcRecordSchema.index({ groupCode: 1, createdAt: -1 })
WalkcalcRecordSchema.index({
  groupCode: 1,
  involvedParticipantIds: 1,
  createdAt: -1,
})
WalkcalcRecordSchema.index({ groupCode: 1, type: 1, createdAt: -1 })
WalkcalcRecordSchema.index({ groupCode: 1, category: 1, createdAt: -1 })

WalkcalcParticipantProjectionSchema.index(
  { groupCode: 1, participantId: 1 },
  { unique: true },
)
WalkcalcParticipantProjectionSchema.index({ userId: 1 })
WalkcalcParticipantProjectionSchema.index({ groupCode: 1, balanceValue: 1 })
