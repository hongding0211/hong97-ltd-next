import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ErrorResponse } from 'src/common/response/err-response'
import { Group } from '../schemas/group.schema'

@Injectable()
export class GroupService {
  constructor(
    @InjectModel('walkcalc-groups')
    private readonly groupModel: Model<Group>,
  ) {}

  private numToString(num: number): string {
    const binArr = num.toString(2).split('')
    const len = binArr.length
    for (let i = 0; i < 20 - len; i++) {
      binArr.unshift('0')
    }
    binArr.reverse()
    let str = parseInt(binArr.join(''), 2).toString(36)
    while (str.length < 4) {
      str = '0' + str
    }
    return str.toUpperCase()
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
      return new ErrorResponse('walkcalc.groupNotExists')
    }

    const existingMember = await this.groupModel.findOne({
      id: groupId,
      'members.userId': userId,
    })

    if (existingMember) {
      return new ErrorResponse('walkcalc.userAlreadyInGroup')
    }

    const updateRes = await this.groupModel.updateOne(
      { id: groupId },
      {
        $push: {
          members: {
            userId,
            debt: 0,
            cost: 0,
          },
        },
      },
    )

    if (updateRes.modifiedCount < 1) {
      return new ErrorResponse('walkcalc.joinFailed')
    }

    return {
      groupId,
    }
  }

  async dismiss(groupId: string, userId: string) {
    const group = await this.groupModel.findOne({
      ownerId: userId,
    })
    if (!group) {
      return new ErrorResponse('walkcalc.notGroupOwner')
    }

    // const members = group.members

    // TODO - HongD 04/26 23:29
    // update member's debt

    if (
      !(await this.groupModel.deleteOne({
        id: groupId,
        ownerId: userId,
      }))
    ) {
      return new ErrorResponse('walkcalc.groupNotFoundOrNotOwner')
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
      throw new ErrorResponse('walkcalc.notGroupOwner')
    }

    const existingUser = await this.groupModel.findOne({
      id: groupId,
      'tempUsers.name': userName,
    })

    if (existingUser) {
      throw new ErrorResponse('walkcalc.nameExists')
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
      throw new ErrorResponse('walkcalc.notGroupOwner')
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
      throw new ErrorResponse('walkcalc.groupNotFoundOrNotOwner')
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
      throw new ErrorResponse('walkcalc.groupNotFoundOrNotOwner')
    }

    return this.groupModel.updateOne(
      { id: groupId },
      {
        $set: { name },
      },
    )
  }
}
