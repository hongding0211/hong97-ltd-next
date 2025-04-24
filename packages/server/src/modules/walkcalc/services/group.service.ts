import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Group } from '../schemas/group.schema'

@Injectable()
export class GroupService {
  constructor(
    @InjectModel('walkcalc-groups')
    private readonly groupModel: Model<Group>,
  ) {}

  private numToString(num: number): string {
    const chars =
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let result = ''
    let n = num
    do {
      result = chars[n % chars.length] + result
      n = Math.floor(n / chars.length)
    } while (n > 0)
    return result
  }

  async create(name: string, userId: string) {
    const groups = await this.groupModel
      .find({}, { idx: 1 })
      .sort({ _id: -1 })
      .limit(1)
    const nextIndex = groups.length < 1 ? 0 : groups[0].idx + 1
    const code = this.numToString(nextIndex)

    const [group] = await this.groupModel.create([
      {
        idx: nextIndex,
        id: code,
        ownerId: userId,
        name,
        records: [],
        members: [
          {
            userId,
            name: '',
            debt: 0,
            cost: 0,
          },
        ],
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        tempUsers: [],
        archivedUsers: [],
      },
    ])

    return group
  }

  async join(groupId: string, userId: string) {
    const group = await this.groupModel.findOne({ id: groupId })
    if (!group) {
      throw new Error('Group not exists.')
    }

    const existingMember = await this.groupModel.findOne({
      id: groupId,
      'members.userId': userId,
    })

    if (existingMember) {
      throw new Error('User already in this group.')
    }

    return this.groupModel.updateOne(
      { id: groupId },
      {
        $push: {
          members: {
            userId,
            name: '',
            debt: 0,
            cost: 0,
          },
        },
      },
    )
  }

  async dismiss(groupId: string, userId: string) {
    const res = await this.groupModel.deleteOne({
      id: groupId,
      ownerId: userId,
    })
    if (res.deletedCount < 1) {
      throw new Error('Group not found or you do not own this group')
    }
    return {
      groupId,
    }
  }

  async addTempUser(
    groupId: string,
    uuid: string,
    userName: string,
    userId: string,
  ) {
    const group = await this.groupModel.findOne({
      id: groupId,
      ownerId: userId,
    })

    if (!group) {
      throw new Error('You do not own this group')
    }

    const existingUser = await this.groupModel.findOne({
      id: groupId,
      'tempUsers.name': userName,
    })

    if (existingUser) {
      throw new Error('Name exists.')
    }

    return this.groupModel.updateOne(
      { id: groupId },
      {
        $push: {
          tempUsers: {
            id: uuid,
            name: userName,
            debt: 0,
            cost: 0,
          },
        },
      },
    )
  }

  async invite(groupId: string, members: string[], userId: string) {
    const group = await this.groupModel.findOne({
      id: groupId,
      ownerId: userId,
    })

    if (!group) {
      throw new Error('You do not own this group')
    }

    return this.groupModel.updateOne(
      { id: groupId },
      {
        $push: {
          members: {
            $each: members.map((memberId) => ({
              userId: memberId,
              name: '',
              debt: 0,
              cost: 0,
            })),
          },
        },
      },
    )
  }

  async my(userId: string) {
    return this.groupModel.aggregate([
      {
        $match: {
          'members.userId': userId,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'members.userId',
          foreignField: '_id',
          as: 'membersInfo',
        },
      },
    ])
  }

  async getById(groupId: string) {
    return this.groupModel.aggregate([
      {
        $match: { id: groupId },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'members.userId',
          foreignField: '_id',
          as: 'membersInfo',
        },
      },
    ])
  }

  async toggleArchive(groupId: string, isArchive: boolean, userId: string) {
    const group = await this.groupModel.findOne({
      id: groupId,
      ownerId: userId,
    })

    if (!group) {
      throw new Error('Group not found or you do not own this group')
    }

    if (isArchive) {
      return this.groupModel.updateOne(
        { id: groupId },
        {
          $push: {
            archivedUsers: {
              $each: group.members,
            },
          },
          $set: {
            members: [],
          },
        },
      )
    }
    return this.groupModel.updateOne(
      { id: groupId },
      {
        $push: {
          members: {
            $each: group.archivedUsers,
          },
        },
        $set: {
          archivedUsers: [],
        },
      },
    )
  }

  async changeName(groupId: string, name: string, userId: string) {
    const group = await this.groupModel.findOne({
      id: groupId,
      ownerId: userId,
    })

    if (!group) {
      throw new Error('Group not found or you do not own this group')
    }

    return this.groupModel.updateOne(
      { id: groupId },
      {
        $set: { name },
      },
    )
  }
}
