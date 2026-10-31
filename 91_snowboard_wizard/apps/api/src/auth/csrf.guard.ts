// csrf.guard.ts - Validates Origin or Referer against ALLOWED_ORIGINS on state-changing requests
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>()
    const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method)
    if (safeMethod) return true

    const allowedOrigins = this.config.get<string[]>('allowedOrigins') ?? []
    const origin = req.headers['origin'] ?? req.headers['referer'] ?? ''
    const allowed = allowedOrigins.some(o => (origin as string).startsWith(o))
    if (!allowed) throw new ForbiddenException('CSRF check failed')
    return true
  }
}
