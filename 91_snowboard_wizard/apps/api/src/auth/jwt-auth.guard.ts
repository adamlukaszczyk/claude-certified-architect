// jwt-auth.guard.ts - Auth guard for JWT-protected endpoints
import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
