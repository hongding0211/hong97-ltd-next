import path from 'path'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { ThrottlerModule } from '@nestjs/throttler'
import { HeaderResolver, I18nModule } from 'nestjs-i18n'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import config from './config'
import { AuthGuard } from './guards/auth.guard'
import { CustomThrottleGuard } from './guards/throttle'
import { StructuredResponseInterceptor } from './interceptors/response/structured-response'
import { AuthModule } from './modules/auth/auth.module'
import { BarkModule } from './modules/bark/bark.module'
import { BlogModule } from './modules/blog/blog.module'
import { OssModule } from './modules/oss/oss.module'
import { ShortLinkModule } from './modules/shortlink/shortlink.module'
import { TrashModule } from './modules/trash/trash.module'
import { UCPModule } from './modules/ucp/ucp.module'
import { UserModule } from './modules/user/user.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: Object.values(config),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        ...configService.get('database.options'),
        dbName: configService.get<string>('database.dbName'),
      }),
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('auth.jwt.secret'),
        signOptions: { expiresIn: configService.get('auth.jwt.expiresIn') },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return [
          {
            ttl: configService.get('rateLimit.ttl') ?? 60000,
            limit: configService.get('rateLimit.limit') ?? 10,
          },
        ]
      },
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'cn',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [new HeaderResolver(['x-locale'])],
      typesOutputPath: path.join(__dirname, '../../src/i18n/types.d.ts'),
    }),
    /** Global Modules */
    UserModule,
    BarkModule,
    /** General Modules */
    AuthModule,
    OssModule,
    BlogModule,
    ShortLinkModule,
    UCPModule,
    TrashModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottleGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: StructuredResponseInterceptor,
    },
  ],
})
export class AppModule {}
