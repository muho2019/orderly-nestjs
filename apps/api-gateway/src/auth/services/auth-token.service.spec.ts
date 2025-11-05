import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';
import { AuthTokenService } from './auth-token.service';

describe('AuthTokenService', () => {
  const secret = 'test-secret';
  let configService: ConfigService;
  let service: AuthTokenService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'AUTH_JWT_SECRET') {
          return secret;
        }
        return defaultValue;
      })
    } as unknown as ConfigService;

    service = new AuthTokenService(configService);
  });

  it('verifies a valid token and returns claims', () => {
    const token = sign({ sub: 'user-123', email: 'user@example.com' }, secret, { expiresIn: '1h' });

    const claims = service.verifyToken(token);

    expect(claims.sub).toBe('user-123');
    expect(claims.email).toBe('user@example.com');
  });

  it('throws when token is invalid', () => {
    expect(() => service.verifyToken('invalid-token')).toThrow(UnauthorizedException);
  });
});
