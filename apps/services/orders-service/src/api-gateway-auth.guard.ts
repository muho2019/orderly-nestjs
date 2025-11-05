import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

interface GatewayUserPayload {
  sub: string;
  email?: string;
}

interface GatewayAuthenticatedRequest extends Request {
  user?: GatewayUserPayload;
}

@Injectable()
export class ApiGatewayAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<GatewayAuthenticatedRequest>();

    const userIdHeader = request.headers['x-user-id'];
    const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;

    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new UnauthorizedException('Missing X-User-Id header set by API gateway');
    }

    const emailHeader = request.headers['x-user-email'];
    const email = Array.isArray(emailHeader) ? emailHeader[0] : emailHeader;

    request.user = {
      sub: userId,
      email: typeof email === 'string' && email.trim().length > 0 ? email : undefined
    };

    return true;
  }
}
