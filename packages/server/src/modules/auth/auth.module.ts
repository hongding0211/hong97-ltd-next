import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { User, UserSchema } from '../user/schema/user.schema'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { ApiToken, ApiTokenSchema } from './schema/api-token.schema'
import {
  RefreshSession,
  RefreshSessionSchema,
} from './schema/refresh-session.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ApiToken.name, schema: ApiTokenSchema },
      { name: User.name, schema: UserSchema },
      { name: RefreshSession.name, schema: RefreshSessionSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('auth.jwt.secret'),
        signOptions: {
          expiresIn: configService.get('auth.jwt.accessExpiresIn') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
