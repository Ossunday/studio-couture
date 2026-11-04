import { createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE_CSRF_LANGUE = 'sc_csrf_langue';

export function jetonLangue(valeurCookie: string, secret: string | undefined): string | undefined {
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) return undefined;
  return createHmac('sha256', secret).update(`langue:${valeurCookie}`).digest('hex');
}

export function verifierJetonLangue(
  valeurCookie: string | undefined,
  fourni: string | null | undefined,
  secret: string | undefined
): boolean {
  if (!valeurCookie || !fourni) return false;
  const attendu = jetonLangue(valeurCookie, secret);
  if (!attendu) return false;
  const a = Buffer.from(attendu);
  const b = Buffer.from(fourni);
  return a.length === b.length && timingSafeEqual(a, b);
}
