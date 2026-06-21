// auth.service.ts - Google login, JWT issuance, refresh/logout, guest session claim
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'
import { OAuth2Client } from 'google-auth-library'
import { createHash, randomBytes } from 'crypto'
import { UsersService } from '../users/users.service'
import { SessionsClaimService } from './sessions-claim.service'
import { RefreshTokenEntity } from '../entities/refresh-token.entity'
import type { UserEntity } from '../entities/user.entity'

type LoginResult = {
  accessToken: string
  refreshToken: string
  user: UserEntity
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly sessionsClaim: SessionsClaimService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
  ) {
    this.googleClient = new OAuth2Client(config.get<string>('google.clientId'))
  }

  async loginWithGoogle(idToken: string, guestSessionId?: string): Promise<LoginResult> {
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

    if (guestSessionId) {
      await this.sessionsClaim.claimGuestSessions(guestSessionId, user.id)
    }

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email })
    const refreshToken = await this.issueRefreshToken(user.id)

    return { accessToken, refreshToken, user }
  }

  async refreshAccessToken(rawRefreshToken: string): Promise<{ accessToken: string }> {
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex')
    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash, expiresAt: MoreThan(new Date()) },
      relations: ['user'],
    })
    if (!stored) throw new UnauthorizedException('Refresh token invalid or expired')

    const accessToken = this.jwtService.sign({ sub: stored.user.id, email: stored.user.email })
    return { accessToken }
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex')
    await this.refreshTokenRepo.delete({ tokenHash })
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
