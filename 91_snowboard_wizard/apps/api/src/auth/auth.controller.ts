// auth.controller.ts - Auth endpoints
import { Controller, Post, Get, Body, Res, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common'
import type { Response, Request } from 'express'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { CsrfGuard } from './csrf.guard'
import { GoogleAuthDto } from './dto/google-auth.dto'
import type { UserEntity } from '../entities/user.entity'

interface RequestWithUser extends Request {
  user: UserEntity
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: GoogleAuthDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.authService.loginWithGoogle(dto.idToken)
    const isProduction = process.env.NODE_ENV === 'production'
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 15 * 60 * 1000, // 15 minutes
    })
    return { userId: user.id, email: user.email }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: RequestWithUser) {
    const { id, email, name, avatarUrl } = req.user
    return { id, email, name, avatarUrl }
  }

  @Get('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token')
    return { ok: true }
  }
}
