// auth.controller.ts - Auth endpoints
import { Controller, Post, Get, Body, Res, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common'
import type { Response, Request, CookieOptions } from 'express'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { CsrfGuard } from './csrf.guard'
import { GoogleAuthDto } from './dto/google-auth.dto'
import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
import type { UserEntity } from '../entities/user.entity'

class GoogleLoginDto extends GoogleAuthDto {
  @IsString()
  @IsOptional()
  guestSessionId?: string
}

class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string
}

interface RequestWithUser extends Request {
  user: UserEntity
}

const ACCESS_TOKEN_COOKIE: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: GoogleLoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.authService.loginWithGoogle(dto.idToken, dto.guestSessionId)
    res.cookie('access_token', accessToken, { ...ACCESS_TOKEN_COOKIE, maxAge: 15 * 60 * 1000 })
    return { userId: user.id, email: user.email }
  }

  @Post('refresh')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken } = await this.authService.refreshAccessToken(dto.refreshToken)
    res.cookie('access_token', accessToken, { ...ACCESS_TOKEN_COOKIE, maxAge: 15 * 60 * 1000 })
    return { ok: true }
  }

  @Post('logout')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshDto, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(dto.refreshToken)
    res.clearCookie('access_token', ACCESS_TOKEN_COOKIE)
    return { ok: true }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: RequestWithUser) {
    const { id, email, name, avatarUrl } = req.user
    return { id, email, name, avatarUrl }
  }
}
