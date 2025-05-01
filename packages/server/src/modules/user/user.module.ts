import { Global, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { UserApp, UserAppSchema } from './schemas/user-apps.schema'
import { User, UserSchema } from './schemas/user.schema'
import { UserService } from './user.service'

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: UserApp.name, schema: UserAppSchema }]),
  ],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
