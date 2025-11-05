import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, verify } from 'jsonwebtoken';

export interface JwtClaims extends JwtPayload {
  sub: string;
  email?: string;
  [key: string]: unknown;
}

@Injectable()
export class AuthTokenService {
  constructor(private readonly configService: ConfigService) {}

  verifyToken(token: string): JwtClaims {
    const secret = this.configService.get<string>('AUTH_JWT_SECRET', 'dev-secret');

    try {
      const payload = verify(token, secret, {
        algorithms: ['HS256']
      }) as JwtClaims;

      if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
        throw new UnauthorizedException('Token is missing required subject claim');
      }

      return {
        ...payload,
        sub: payload.sub.trim()
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
