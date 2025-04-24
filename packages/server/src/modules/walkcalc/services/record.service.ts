import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Group } from '../schemas/group.schema'

interface AddRecordDto {
  groupId: string
  recordId: string
  creatorId: string
  who: string
  paid: number
  forWhom: Array<{ userId: string; amount: number }>
  type?: string
  text?: string
  long?: string
  lat?: string
  isDebtResolve?: boolean
}

@Injectable()
export class RecordService {
  constructor(
    @InjectModel('walkcalc-groups')
    private readonly groupModel: Model<Group>,
  ) {}

  async add(payload: AddRecordDto) {
    const {
      groupId,
      forWhom,
      paid,
      who: whoId,
      isDebtResolve,
      creatorId,
    } = payload

    if (forWhom.length < 1) {
      throw new Error('For whom length less than 1')
    }
    if (paid === 0) {
      throw new Error('Meaningless 0 amount')
    }

    const group = await this.groupModel.findOne({
      id: groupId,
      $or: [{ ownerId: creatorId }, { 'members.userId': creatorId }],
    })

    if (!group) {
      throw new Error('You are not in the group.')
    }

    if (group.records.length >= 5000) {
      throw new Error('Reach group record limits.')
    }

    // const avg = paid / forWhom.length;

    // Update last modified time and add record
    const result = await this.groupModel.updateOne(
      { id: groupId },
      {
        $set: { modifiedAt: Date.now() },
        $push: {
          records: {
            id: payload.recordId,
            amount: paid,
            description: payload.text || '',
            creatorId,
            participants: forWhom,
            createdAt: Date.now(),
          },
        },
      },
    )

    // Update debt for each participant
    for (const participant of forWhom) {
      const debt = -participant.amount
      await this.groupModel.updateOne(
        { id: groupId, 'members.userId': participant.userId },
        {
          $inc: {
            'members.$.debt': debt,
            'members.$.cost': isDebtResolve ? 0 : participant.amount,
          },
        },
      )
    }

    // Update for the one who paid
    await this.groupModel.updateOne(
      { id: groupId, 'members.userId': whoId },
      {
        $inc: { 'members.$.debt': paid },
      },
    )

    return result
  }

  async drop(groupId: string, recordId: string, userId: string) {
    const group = await this.groupModel.findOne({
      id: groupId,
      $or: [{ ownerId: userId }, { 'members.userId': userId }],
    })

    if (!group) {
      throw new Error('You are not in the group.')
    }

    const record = group.records.find((r) => r.id === recordId)
    if (!record) {
      throw new Error('Record not found.')
    }

    // Revert debt for each participant
    for (const participant of record.participants) {
      const debt = participant.amount
      await this.groupModel.updateOne(
        { id: groupId, 'members.userId': participant.userId },
        {
          $inc: {
            'members.$.debt': debt,
            'members.$.cost': -participant.amount,
          },
        },
      )
    }

    // Revert for the one who paid
    await this.groupModel.updateOne(
      { id: groupId, 'members.userId': record.creatorId },
      {
        $inc: { 'members.$.debt': -record.amount },
      },
    )

    // Remove the record
    return this.groupModel.updateOne(
      { id: groupId },
      {
        $pull: { records: { id: recordId } },
      },
    )
  }

  async update(payload: AddRecordDto) {
    // First drop the old record
    await this.drop(payload.groupId, payload.recordId, payload.creatorId)

    // Then add the new record with the same recordId
    return this.add(payload)
  }

  async getById(recordId: string) {
    return this.groupModel.aggregate([
      {
        $match: { 'records.id': recordId },
      },
      {
        $project: {
          record: {
            $filter: {
              input: '$records',
              as: 'record',
              cond: { $eq: ['$$record.id', recordId] },
            },
          },
        },
      },
    ])
  }

  async getByGroupId(groupId: string) {
    const group = await this.groupModel.findOne({ id: groupId }, { records: 1 })

    if (!group) {
      throw new Error('Group not found')
    }

    return group.records
  }
}
