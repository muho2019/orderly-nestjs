export interface JwtClaims {
  sub?: string;
  email?: string;
  [key: string]: unknown;
}

export function decodeJwt(token: string): JwtClaims {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid JWT format');
  }

  const payloadPart = parts[1];
  const decoded = Buffer.from(payloadPart, 'base64url').toString('utf8');

  try {
    const payload = JSON.parse(decoded);
    return payload as JwtClaims;
  } catch (error) {
    throw new Error('Failed to parse JWT payload');
  }
}
