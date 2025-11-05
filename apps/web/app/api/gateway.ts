const DEFAULT_GATEWAY_BASE_URL = 'http://localhost:4000/v1';

export function buildGatewayUrl(path: string): string {
  const base = process.env.API_GATEWAY_BASE_URL ?? DEFAULT_GATEWAY_BASE_URL;
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
