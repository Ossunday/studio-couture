import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Authentification atelier — serveur uniquement.
 * Mots de passe : scrypt (KDF intégré à Node, équivalent accepté à argon2 ici :
 * aucun module natif à compiler sur le petit serveur, coût mémoire-dur).
 * Sessions : jeton aléatoire en cookie HttpOnly, seul son SHA-256 est stocké en base.
 */

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

export function hacherMotDePasse(motDePasse: string): string {
  const sel = randomBytes(16);
  const derive = scryptSync(motDePasse, sel, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, sel.toString('base64'), derive.toString('base64')].join('$');
}

export function verifierMotDePasse(motDePasse: string, stocke: string): boolean {
  try {
    const [algo, n, r, p, selB64, hashB64] = stocke.split('$');
    if (algo !== 'scrypt' || !selB64 || !hashB64) return false;
    const attendu = Buffer.from(hashB64, 'base64');
    const derive = scryptSync(motDePasse, Buffer.from(selB64, 'base64'), attendu.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p)
    });
    return derive.length === attendu.length && timingSafeEqual(derive, attendu);
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = 'studio_couture_session';
export const SESSION_DUREE_JOURS = 7;

export function genererJetonSession(): string {
  return randomBytes(32).toString('base64url');
}

export function hacherJeton(jeton: string): string {
  return createHash('sha256').update(jeton).digest('hex');
}

export function expirationSession(maintenant = new Date()): Date {
  return new Date(maintenant.getTime() + SESSION_DUREE_JOURS * 24 * 60 * 60 * 1000);
}

/** Jeton CSRF dérivé du jeton de session : impossible à deviner sans le cookie HttpOnly. */
export function jetonCsrf(jetonSession: string, secret?: string): string {
  const base = hacherJeton(jetonSession);
  return secret
    ? createHmac('sha256', secret).update(base).digest('hex')
    : createHash('sha256').update(`${base}:csrf`).digest('hex');
}

export function verifierCsrf(jetonSession: string | undefined, fourni: string | null, secret?: string): boolean {
  if (!jetonSession || !fourni) return false;
  const attendu = Buffer.from(jetonCsrf(jetonSession, secret));
  const recu = Buffer.from(fourni);
  return attendu.length === recu.length && timingSafeEqual(attendu, recu);
}

/** Limitation de débit en mémoire (un seul processus adapter-node ; à remplacer par un compteur partagé si multi-instances). */
export class LimiteurDebit {
  private essais = new Map<string, number[]>();

  constructor(
    private readonly maxEssais = 5,
    private readonly fenetreMs = 15 * 60 * 1000
  ) {}

  autoriser(cle: string, maintenant = new Date()): boolean {
    const limite = maintenant.getTime() - this.fenetreMs;
    const recents = (this.essais.get(cle) ?? []).filter((t) => t > limite);
    this.essais.set(cle, recents);
    return recents.length < this.maxEssais;
  }

  enregistrerEchec(cle: string, maintenant = new Date()): void {
    const recents = this.essais.get(cle) ?? [];
    recents.push(maintenant.getTime());
    this.essais.set(cle, recents);
  }

  reinitialiser(cle: string): void {
    this.essais.delete(cle);
  }
}

export const limiteurConnexion = new LimiteurDebit(5, 15 * 60 * 1000);
