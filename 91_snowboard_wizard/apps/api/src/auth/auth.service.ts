// auth.service.ts - Google ID token verification and JWT issuance
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { createHash, randomBytes } from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import { UsersService } from '../users/users.service'
import type { UserEntity } from '../entities/user.entity'
import { RefreshTokenEntity } from '../entities/refresh-token.entity'

type LoginResult = {
  accessToken: string
  user: UserEntity
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshTokenEntity) private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
  ) {
    this.googleClient = new OAuth2Client(config.get<string>('google.clientId'))
  }

  async loginWithGoogle(idToken: string): Promise<LoginResult> {
    let payload: { sub: string; email?: string; name?: string; picture?: string }
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.config.get<string>('google.clientId'),
      })
      const raw = ticket.getPayload()
      if (!raw?.sub || !raw.email) throw new Error('Missing claims')
      payload = { sub: raw.sub, email: raw.email, name: raw.name, picture: raw.picture }
    } catch {
      throw new UnauthorizedException('Invalid Google ID token')
    }

    const user = await this.usersService.upsertFromGoogle(
      payload.sub,
      payload.email!,
      payload.name ?? null,
      payload.picture ?? null,
    )

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email })

    return { accessToken, user }
  }

  async issueRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(raw).digest('hex')
    const refreshExpiresIn = this.config.get<string>('jwt.refreshExpiresIn') ?? '30d'

    // Parse duration string: format is '<days>d' (e.g. '30d')
    const match = refreshExpiresIn.match(/^(\d+)d$/)
    const daysToAdd = match ? parseInt(match[1], 10) : 30

    // Use millisecond arithmetic to avoid timezone/DST edge cases
    const expiresAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000)
    await this.refreshTokenRepo.save({ userId, tokenHash, expiresAt })
    return raw
  }
}
