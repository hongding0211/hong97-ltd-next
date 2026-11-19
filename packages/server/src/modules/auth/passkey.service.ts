import { createHash } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  type OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import {
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type { Model } from 'mongoose'
import { createClient } from 'redis'
import { User, type UserDocument } from '../user/schema/user.schema'
import {
  PasskeyChallenge,
  type PasskeyCredential,
} from './schema/passkey.schema'

const challengeLifetimeMs = 10 * 60_000
const browserUserAgents = [
  ['Edge', /(?:Edg|EdgiOS|EdgA)\//i],
  ['Opera', /(?:OPR|OPiOS)\//i],
  ['Firefox', /(?:Firefox|FxiOS)\//i],
  ['Chrome', /(?:Chrome|CriOS)\//i],
  ['Safari', /Version\/.*Safari\//i],
] as const

function passkeySummary(passkey: PasskeyCredential) {
  const agent = passkey.createdUserAgent || ''
  let device: string | undefined
  if (/\biPad\b/i.test(agent)) device = 'iPad'
  else if (/\biPhone\b/i.test(agent)) device = 'iPhone'
  else if (/\biPod\b/i.test(agent)) device = 'iPod'
  else if (/\bMacintosh\b/i.test(agent))
    device = passkey.createdWithTouch ? 'iPad' : 'Mac'

  return {
    id: passkey.id,
    createdAt: passkey.createdAt,
    device,
    browser: browserUserAgents.find(([, pattern]) => pattern.test(agent))?.[0],
  }
}

@Injectable()
export class PasskeyService implements OnModuleDestroy {
  private readonly inviteRedis?: ReturnType<typeof createClient>
  private connecting?: Promise<unknown>

  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(PasskeyChallenge.name)
    private readonly challenges: Model<PasskeyChallenge>,
    private readonly config: ConfigService,
  ) {
    const url = this.config.get<string>('rateLimit.redisUrl')
    if (url) {
      this.inviteRedis = createClient({
        url,
        disableOfflineQueue: true,
        socket: { connectTimeout: 750, reconnectStrategy: false },
      })
      this.inviteRedis.on('error', () => undefined)
    }
  }

  onModuleDestroy() {
    if (this.inviteRedis?.isOpen) this.inviteRedis.destroy()
  }

  get site() {
    const url = new URL(
      this.config.get<string>('auth.passkeys.origin') ||
        this.config.getOrThrow<string>('auth.frontendUrl'),
    )
    if (
      url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && url.hostname === 'localhost')
    ) {
      throw new BadRequestException('Passkeys require HTTPS')
    }
    return {
      origin: url.origin,
      rpId: url.hostname,
      secure: url.protocol === 'https:',
    }
  }

  async list(userId: string) {
    const user = await this.findUser(userId)
    return this.summaries(user)
  }

  async claimInvite(userId: string) {
    const redis = this.inviteRedis
    if (!redis) return false

    try {
      const { rpId } = this.site
      const eligible = await this.users.exists({
        userId,
        'passkeys.rpId': { $ne: rpId },
      })
      if (!eligible) return false

      if (!redis.isReady) {
        this.connecting ??= redis.connect().finally(() => {
          this.connecting = undefined
        })
        await this.connecting
      }

      const seconds = this.config.getOrThrow<number>(
        'auth.passkeys.inviteCooldownSeconds',
      )
      const reserved = await redis
        .withAbortSignal(AbortSignal.timeout(750))
        .set(`sso:passkey-invite:${rpId}:${userId}`, '1', {
          condition: 'NX',
          expiration: { type: 'EX', value: seconds },
        })
      return reserved === 'OK'
    } catch {
      return false
    }
  }

  async registrationOptions(userId: string, browserId: string) {
    const user = await this.findUser(userId)
    if (this.credentials(user).length) {
      throw new ConflictException('This account already has a passkey')
    }
    const { rpId } = this.site
    const options = await generateRegistrationOptions({
      rpName: 'hong97.ltd',
      rpID: rpId,
      userID: this.userHandle(user.userId),
      userName:
        user.authData?.local?.email ||
        user.authData?.local?.phoneNumber ||
        user.authData?.github?.login ||
        user.authData?.apple?.email ||
        user.profile.name,
      userDisplayName: user.profile.name,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
    })
    await this.saveChallenge(
      options.challenge,
      browserId,
      'registration',
      userId,
    )
    return options
  }

  async register(
    userId: string,
    browserId: string,
    challenge: string,
    response: RegistrationResponseJSON,
    client: { userAgent?: string; touchDevice?: boolean },
  ) {
    const { origin, rpId } = this.site
    await this.consumeChallenge(challenge, browserId, 'registration', userId)
    const result = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: true,
    }).catch(() => {
      throw new BadRequestException('Unable to verify passkey registration')
    })
    if (!result.verified || !result.registrationInfo) {
      throw new BadRequestException('Unable to verify passkey registration')
    }

    const { credential } = result.registrationInfo
    const passkey: PasskeyCredential = {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      transports: credential.transports || [],
      rpId,
      createdAt: new Date(),
      createdUserAgent: client.userAgent?.slice(0, 512),
      createdWithTouch: client.touchDevice,
    }
    const stored = await this.users.updateOne(
      { userId, passkeys: { $not: { $elemMatch: { rpId } } } },
      { $push: { passkeys: passkey } },
    )
    if (!stored.modifiedCount) {
      throw new ConflictException('This account already has a passkey')
    }
    return passkeySummary(passkey)
  }

  async remove(userId: string, id: string) {
    const user = await this.users
      .findOneAndUpdate(
        { userId },
        { $pull: { passkeys: { id, rpId: this.site.rpId } } },
        { new: true },
      )
      .select('+passkeys')
      .exec()
    if (!user) throw new UnauthorizedException()
    return this.summaries(user)
  }

  async authenticationOptions(browserId: string) {
    const options = await generateAuthenticationOptions({
      rpID: this.site.rpId,
      userVerification: 'required',
    })
    await this.saveChallenge(
      options.challenge,
      browserId,
      'authentication',
      null,
    )
    return options
  }

  async authenticate(
    browserId: string,
    challenge: string,
    response: AuthenticationResponseJSON,
  ) {
    const { origin, rpId } = this.site
    await this.consumeChallenge(challenge, browserId, 'authentication', null)
    const user = await this.users
      .findOne({
        passkeys: { $elemMatch: { id: response.id, rpId } },
      })
      .select('+passkeys')
      .exec()
    const credential =
      user && this.credentials(user).find(({ id }) => id === response.id)
    if (!user || !credential) {
      throw new NotFoundException('This passkey is no longer recognized')
    }
    if (
      response.response?.userHandle !==
      Buffer.from(this.userHandle(user.userId)).toString('base64url')
    ) {
      throw new UnauthorizedException('Unable to verify passkey')
    }

    const result = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      requireUserVerification: true,
      credential: {
        id: credential.id,
        publicKey: new Uint8Array(
          Buffer.from(credential.publicKey, 'base64url'),
        ),
        counter: credential.counter,
        transports: credential.transports,
      },
    }).catch(() => {
      throw new UnauthorizedException('Unable to verify passkey')
    })
    if (!result.verified)
      throw new UnauthorizedException('Unable to verify passkey')

    const saved = await this.users.updateOne(
      {
        userId: user.userId,
        passkeys: {
          $elemMatch: { id: credential.id, rpId, counter: credential.counter },
        },
      },
      { $set: { 'passkeys.$.counter': result.authenticationInfo.newCounter } },
    )
    if (!saved.matchedCount)
      throw new UnauthorizedException('Unable to verify passkey')
    return user
  }

  private async findUser(userId: string) {
    const user = await this.users.findOne({ userId }).select('+passkeys').exec()
    if (!user) throw new UnauthorizedException()
    return user
  }

  private credentials(user: UserDocument) {
    return (user.passkeys || []).filter(({ rpId }) => rpId === this.site.rpId)
  }

  private summaries(user: UserDocument) {
    return this.credentials(user)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(passkeySummary)
  }

  private userHandle(userId: string) {
    return new Uint8Array(createHash('sha256').update(userId).digest())
  }

  private async saveChallenge(
    challenge: string,
    browserId: string,
    kind: PasskeyChallenge['kind'],
    userId: string | null,
  ) {
    await this.challenges.create({
      challenge,
      browserId,
      kind,
      userId,
      rpId: this.site.rpId,
      expiresAt: new Date(Date.now() + challengeLifetimeMs),
    })
  }

  private async consumeChallenge(
    challenge: string,
    browserId: string,
    kind: PasskeyChallenge['kind'],
    userId: string | null,
  ) {
    const saved = await this.challenges
      .findOneAndDelete({
        challenge,
        browserId,
        kind,
        userId,
        rpId: this.site.rpId,
        expiresAt: { $gt: new Date() },
      })
      .exec()
    if (!saved) throw new BadRequestException('Passkey request expired')
  }
}
