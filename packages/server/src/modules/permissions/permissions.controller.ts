import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import { RootOnly } from '../../decorators/root-only.decorator'
import { UserId } from '../../decorators/user-id.decorator'
import { CreatePermissionGrantDto } from './dto/permission.dto'
import { PermissionsService } from './permissions.service'

@Controller('permissions')
@RootOnly()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async list() {
    const [points, users] = await Promise.all([
      this.permissionsService.listPermissionPoints(),
      this.permissionsService.listUsers(),
    ])
    return { points, users }
  }

  @Post(':permissionKey/grants')
  async addGrant(
    @Param('permissionKey') permissionKey: string,
    @Body() body: CreatePermissionGrantDto,
    @UserId() actorUserId: string,
  ) {
    return this.permissionsService.addGrant(
      permissionKey,
      body.userId,
      actorUserId,
    )
  }

  @Delete(':permissionKey/grants/:userId')
  async deleteGrant(
    @Param('permissionKey') permissionKey: string,
    @Param('userId') userId: string,
  ) {
    return this.permissionsService.deleteGrant(permissionKey, userId)
  }
}
