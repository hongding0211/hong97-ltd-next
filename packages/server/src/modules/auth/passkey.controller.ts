import { randomBytes } from 'node:crypto'
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server'
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { PasskeyService } from './passkey.service'

class PasskeyVerificationDto {
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  challenge: string

  @IsObject()
  response: Record<string, unknown>
}

class PasskeyRegistrationDto extends PasskeyVerificationDto {
  @IsOptional()
  @IsBoolean()
  touchDevice?: boolean
}

class PasskeyLoginDto extends PasskeyVerificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  redirect?: string
}

type SessionRequest = Request & {
  user?: { id: string }
  authenticatedBySession?: boolean
}

@Controller('auth/passkeys')
export class PasskeyController {
  constructor(
    private readonly passkeys: PasskeyService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Req() req: SessionRequest) {
    return this.passkeys.list(this.sessionUser(req))
  }

  @Post('invite')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async invite(@Req() req: SessionRequest) {
    this.checkOrigin(req)
    return { show: await this.passkeys.claimInvite(this.sessionUser(req)) }
  }

  @Post('register/options')
  @HttpCode(200)
  registrationOptions(
    @Req() req: SessionRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.checkOrigin(req)
    return this.passkeys.registrationOptions(
      this.sessionUser(req),
      this.browserId(req, res),
    )
  }

  @Post('register/verify')
  @HttpCode(200)
  register(@Req() req: SessionRequest, @Body() body: PasskeyRegistrationDto) {
    this.checkOrigin(req)
    return this.passkeys.register(
      this.sessionUser(req),
      this.browserId(req),
      body.challenge,
      body.response as unknown as RegistrationResponseJSON,
      { userAgent: req.get('user-agent'), touchDevice: body.touchDevice },
    )
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Req() req: SessionRequest, @Param('id') id: string) {
    this.checkOrigin(req)
    return this.passkeys.remove(this.sessionUser(req), id)
  }

  @Post('authenticate/options')
  @HttpCode(200)
  authenticationOptions(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.checkOrigin(req)
    return this.passkeys.authenticationOptions(this.browserId(req, res))
  }

  @Post('authenticate/verify')
  @HttpCode(200)
  async authenticate(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: PasskeyLoginDto,
  ) {
    this.checkOrigin(req)
    const user = await this.passkeys.authenticate(
      this.browserId(req),
      body.challenge,
      body.response as unknown as AuthenticationResponseJSON,
    )
    const session = await this.auth.issueLoginSession(user, res)
    return {
      ...session,
      destination: body.redirect
        ? this.auth.getLoginDestination(body.redirect, session)
        : undefined,
    }
  }

  private sessionUser(req: SessionRequest) {
    if (!req.authenticatedBySession || !req.user)
      throw new UnauthorizedException()
    return req.user.id
  }

  private checkOrigin(req: Request) {
    if (req.get('origin') !== this.passkeys.site.origin)
      throw new ForbiddenException()
  }

  private browserId(req: Request, res?: Response) {
    const { secure } = this.passkeys.site
    const name = secure ? '__Host-h97Passkey' : 'h97Passkey'
    const existing = req.cookies?.[name]
    if (typeof existing === 'string' && /^[A-Za-z0-9_-]{43}$/.test(existing))
      return existing
    if (!res) throw new UnauthorizedException()

    const id = randomBytes(32).toString('base64url')
    res.cookie(name, id, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      maxAge: 86_400_000,
      path: '/',
    })
    return id
  }
}
