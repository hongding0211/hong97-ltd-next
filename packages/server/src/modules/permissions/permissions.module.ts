import { Global, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PermissionGuard } from './permission.guard'
import { PermissionsController } from './permissions.controller'
import { PermissionsService } from './permissions.service'
import {
  PermissionGrant,
  PermissionGrantSchema,
} from './schema/permission-grant.schema'

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PermissionGrant.name, schema: PermissionGrantSchema },
    ]),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionGuard],
  exports: [PermissionsService, PermissionGuard],
})
export class PermissionsModule {}
