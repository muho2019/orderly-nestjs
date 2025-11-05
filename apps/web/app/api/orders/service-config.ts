import type { JwtClaims } from '../../../src/utils/jwt';
import { decodeJwt } from '../../../src/utils/jwt';

const DEFAULT_SERVICE_BASE = 'http://localhost:3000';
const VERSIONED_SEGMENT = '/v1/orders';

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '');

  if (trimmed.endsWith(VERSIONED_SEGMENT)) {
    return trimmed;
  }

  if (trimmed.endsWith('/orders')) {
    return `${trimmed.replace(/\/orders$/, '')}${VERSIONED_SEGMENT}`;
  }

  if (trimmed.endsWith('/v1')) {
    return `${trimmed}${VERSIONED_SEGMENT.replace('/v1', '')}`;
  }

  return `${trimmed}${VERSIONED_SEGMENT}`;
}

export function resolveOrdersServiceBaseUrl(): string {
  const rawBase =
    process.env.ORDERS_SERVICE_BASE_URL ?? `${DEFAULT_SERVICE_BASE}${VERSIONED_SEGMENT}`;
  return normalizeBaseUrl(rawBase);
}

export function buildOrdersServiceUrl(path: string): string {
  const base = resolveOrdersServiceBaseUrl();
  if (!path || path === '/') {
    return base;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function extractUserFromToken(token: string): { sub: string; email?: string } {
  let claims: JwtClaims;
  try {
    claims = decodeJwt(token);
  } catch {
    throw new Error('JWT 토큰을 해석할 수 없습니다.');
  }

  const sub = claims.sub;
  if (typeof sub !== 'string' || sub.trim().length === 0) {
    throw new Error('JWT에 사용자 ID가 포함되어 있지 않습니다.');
  }

  const email = typeof claims.email === 'string' ? claims.email : undefined;
  return { sub: sub.trim(), email };
}
