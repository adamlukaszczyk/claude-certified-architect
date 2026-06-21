// auth.controller.ts - Auth endpoints
import { Controller, Post, Get, Body, Res, UseGuards, Req, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common'
import type { Response, Request, CookieOptions } from 'express'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { GoogleAuthDto } from './dto/google-auth.dto'
import { IsString, IsOptional } from 'class-validator'
import type { UserEntity } from '../entities/user.entity'

class GoogleLoginDto extends GoogleAuthDto {
  @IsString()
  @IsOptional()
  guestSessionId?: string
}

interface RequestWithUser extends Request {
  user: UserEntity
}

const isProduction = process.env.NODE_ENV === 'production'

const ACCESS_TOKEN_COOKIE: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
}

const REFRESH_TOKEN_COOKIE: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: GoogleLoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.loginWithGoogle(dto.idToken, dto.guestSessionId)
    res.cookie('access_token', accessToken, { ...ACCESS_TOKEN_COOKIE, maxAge: 15 * 60 * 1000 })
    res.cookie('refresh_token', refreshToken, { ...REFRESH_TOKEN_COOKIE, maxAge: 30 * 24 * 60 * 60 * 1000 })
    return { userId: user.id, email: user.email }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.['refresh_token']
    if (!rawToken) {
      throw new UnauthorizedException('No refresh token')
    }
    const { accessToken } = await this.authService.refreshAccessToken(rawToken)
    res.cookie('access_token', accessToken, { ...ACCESS_TOKEN_COOKIE, maxAge: 15 * 60 * 1000 })
    return { ok: true }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.['refresh_token']
    if (rawToken) {
      await this.authService.logout(rawToken)
    }
    res.clearCookie('access_token', ACCESS_TOKEN_COOKIE)
    res.clearCookie('refresh_token', REFRESH_TOKEN_COOKIE)
    return { ok: true }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: RequestWithUser) {
    const { id, email, name, avatarUrl } = req.user
    return { id, email, name, avatarUrl }
  }
}
