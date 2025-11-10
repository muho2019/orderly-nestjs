import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class AdminApiGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedToken = this.configService
      .get<string>('CATALOG_ADMIN_TOKEN', 'catalog-admin-token')
      .trim();

    if (!expectedToken) {
      throw new UnauthorizedException('Catalog admin token is not configured');
    }

    const headerValue = request.headers['x-admin-token'];
    const providedToken =
      typeof headerValue === 'string'
        ? headerValue.trim()
        : Array.isArray(headerValue)
          ? headerValue[0]?.trim()
          : undefined;

    if (!providedToken || providedToken !== expectedToken) {
      throw new UnauthorizedException('Admin access is restricted');
    }

    return true;
  }
}
