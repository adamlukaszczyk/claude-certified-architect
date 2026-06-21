// auth.service.ts - Google ID token verification, JWT issuance, refresh token storage
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { OAuth2Client } from 'google-auth-library'
import { createHash, randomBytes } from 'crypto'
import { UsersService } from '../users/users.service'
import { RefreshTokenEntity } from '../entities/refresh-token.entity'
import type { UserEntity } from '../entities/user.entity'

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
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
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
    // TODO: wire refresh token into a separate httpOnly cookie once POST /auth/refresh is added
    await this.issueRefreshToken(user.id)

    return { accessToken, user }
  }

  private async issueRefreshToken(userId: string): Promise<void> {
    const token = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await this.refreshTokenRepo.save({ userId, tokenHash, expiresAt })
  }
}
