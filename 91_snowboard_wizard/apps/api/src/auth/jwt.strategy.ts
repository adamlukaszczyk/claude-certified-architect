// jwt.strategy.ts - Validates JWT from httpOnly cookie
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { UsersService } from '../users/users.service'
import type { Request } from 'express'

type JwtPayload = { sub: string; email: string }

function extractJwtFromCookie(req: Request): string | null {
  const token = req.cookies?.access_token
  return typeof token === 'string' ? token : null
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractJwtFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') ?? 'dev-secret',
    })
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub)
    if (!user) throw new UnauthorizedException()
    return user
  }
}
