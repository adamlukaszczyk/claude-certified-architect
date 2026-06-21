// auth.service.ts - Google ID token verification and JWT issuance
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { OAuth2Client } from 'google-auth-library'
import { UsersService } from '../users/users.service'
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
}
