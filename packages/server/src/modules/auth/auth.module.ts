import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { PushDevice, PushDeviceSchema } from '../push/schema/push-device.schema'
import { User, UserSchema } from '../user/schema/user.schema'
import {
  WalkcalcGroup,
  WalkcalcGroupSchema,
  WalkcalcParticipant,
  WalkcalcParticipantProjection,
  WalkcalcParticipantProjectionSchema,
  WalkcalcParticipantSchema,
  WalkcalcRecord,
  WalkcalcRecordSchema,
} from '../walkcalc/schema/walkcalc-group.schema'
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
      { name: PushDevice.name, schema: PushDeviceSchema },
      { name: WalkcalcGroup.name, schema: WalkcalcGroupSchema },
      { name: WalkcalcParticipant.name, schema: WalkcalcParticipantSchema },
      { name: WalkcalcRecord.name, schema: WalkcalcRecordSchema },
      {
        name: WalkcalcParticipantProjection.name,
        schema: WalkcalcParticipantProjectionSchema,
      },
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
