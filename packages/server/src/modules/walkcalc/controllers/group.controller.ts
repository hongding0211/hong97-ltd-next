import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { UserId } from 'src/decorators/user-id.decorator'
import { v4 as uuidv4 } from 'uuid'
import { GroupService } from '../services/group.service'

@Controller('walkcalc/group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post('create')
  async create(@Body() body: { name: string }, @UserId() userId: string) {
    const { name } = body
    const group = await this.groupService.create(name, userId)
    return {
      groupId: group.id,
    }
  }

  @Post('join')
  async join(@Body() body: { id: string }, @UserId() userId: string) {
    const { id } = body
    const result = await this.groupService.join(id, userId)
    if (result.modifiedCount === 1) {
      return {
        groupId: id,
      }
    }
    throw new Error('Join failed.')
  }

  @Get('dismiss')
  async dismiss(@Query('id') id: string, @UserId() userId: string) {
    await this.groupService.dismiss(id, userId)
  }

  @Post('temp-user')
  async addTempUser(
    @Body() body: { id: string; name: string },
    @UserId() userId: string,
  ) {
    const { id, name } = body
    const uuid = uuidv4()

    const result = await this.groupService.addTempUser(id, uuid, name, userId)
    if (result.modifiedCount === 1) {
      return {
        uuid,
        name,
      }
    }
    throw new Error('Add failed.')
  }

  @Post('invite')
  async invite(
    @Body() body: { id: string; members: string[] },
    @UserId() userId: string,
  ) {
    const { id, members } = body
    const result = await this.groupService.invite(id, members, userId)
    if (result.modifiedCount === 1) {
      return {
        id,
        members,
      }
    }
    throw new Error('Invite failed.')
  }

  @Get('my')
  async my(@UserId() userId: string) {
    const groups = await this.groupService.my(userId)
    return groups.map((group) => {
      const membersInfo = group.membersInfo.map((member) => {
        const memberData = group.members.find(
          (m) => m.id.toString() === member._id.toString(),
        )
        return {
          ...member,
          debt: memberData?.debt,
          _id: undefined,
        }
      })
      return {
        ...group,
        membersInfo,
        members: undefined,
      }
    })
  }

  @Get('detail')
  async getById(@Query('id') id: string) {
    const groups = await this.groupService.getById(id)
    if (groups.length < 1) {
      throw new Error('Query failed')
    }

    const group = groups[0]
    const membersInfo = group.membersInfo.map((member) => {
      const memberData = group.members.find(
        (m) => m.id.toString() === member._id.toString(),
      )
      return {
        ...member,
        debt: memberData?.debt,
        cost: memberData?.cost,
        _id: undefined,
      }
    })

    return {
      ...group,
      membersInfo,
      members: undefined,
    }
  }

  @Post('archive')
  async archive(@Body() body: { id: string }, @UserId() userId: string) {
    const { id } = body
    const result = await this.groupService.toggleArchive(id, true, userId)
    if (result.modifiedCount) {
      return { id }
    }
    throw new Error('Archive failed.')
  }

  @Post('unarchive')
  async unarchive(@Body() body: { id: string }, @UserId() userId: string) {
    const { id } = body
    const result = await this.groupService.toggleArchive(id, false, userId)
    if (result.modifiedCount) {
      return { id }
    }
    throw new Error('Unarchive failed.')
  }

  @Post('name')
  async changeName(
    @Body() body: { id: string; name: string },
    @UserId() userId: string,
  ) {
    const { id, name } = body
    if (!name) {
      throw new Error('Invalid group name')
    }

    const result = await this.groupService.changeName(id, name, userId)
    if (result.modifiedCount) {
      return { id, name }
    }
    throw new Error('Change failed.')
  }
}
