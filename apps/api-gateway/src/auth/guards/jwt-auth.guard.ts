import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthTokenService, JwtClaims } from '../services/auth-token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authTokenService: AuthTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtClaims }>();
    const header = request.headers.authorization;

    if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header with Bearer token is required');
    }

    const token = header.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('Authorization token is empty');
    }

    const claims = this.authTokenService.verifyToken(token);
    request.user = claims;

    const headers = request.headers as Record<string, string>;
    headers['x-user-id'] = claims.sub;
    if (typeof claims.email === 'string' && claims.email.trim().length > 0) {
      headers['x-user-email'] = claims.email.trim();
    }

    return true;
  }
}
