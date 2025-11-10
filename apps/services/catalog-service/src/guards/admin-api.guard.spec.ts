import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AdminApiGuard } from './admin-api.guard';

describe('AdminApiGuard', () => {
  const buildContext = (headers: Record<string, string>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers } as unknown as Request)
      })
    }) as ExecutionContext;

  it('allows access when admin token matches expected value', () => {
    const configService = {
      get: jest.fn().mockReturnValue('expected-token')
    } as unknown as ConfigService;

    const guard = new AdminApiGuard(configService);
    const context = buildContext({ 'x-admin-token': 'expected-token' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws when token is missing', () => {
    const configService = {
      get: jest.fn().mockReturnValue('expected-token')
    } as unknown as ConfigService;

    const guard = new AdminApiGuard(configService);
    const context = buildContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws when token does not match expected value', () => {
    const configService = {
      get: jest.fn().mockReturnValue('expected-token')
    } as unknown as ConfigService;

    const guard = new AdminApiGuard(configService);
    const context = buildContext({ 'x-admin-token': 'invalid' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
  it('throws when admin token is not configured', () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined)
    } as unknown as ConfigService;

    const guard = new AdminApiGuard(configService);
    const context = buildContext({ 'x-admin-token': 'anything' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
