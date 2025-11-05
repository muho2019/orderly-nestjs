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
  const rawBase = process.env.ORDERS_SERVICE_BASE_URL ?? `${DEFAULT_SERVICE_BASE}${VERSIONED_SEGMENT}`;
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
