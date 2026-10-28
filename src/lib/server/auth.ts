import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Authentification atelier — serveur uniquement.
 * Mots de passe : scrypt (KDF intégré à Node, équivalent accepté à argon2 ici :
 * aucun module natif à compiler sur le petit serveur, coût mémoire-dur).
 * Sessions : jeton aléatoire en cookie HttpOnly, seul son SHA-256 est stocké en base.
 */

/**
 * Paramètres scrypt relevés au minimum OWASP (N=2^17, r=8, p=1).
 * Mémoire requise ≈ 128 × N × r = 128 Mio : maxmem explicitement relevé
 * (défaut Node 32 Mio, insuffisant). Les anciens hash restent vérifiables :
 * le format stocké contient ses propres paramètres (lu à la vérification).
 */
const SCRYPT = { N: 131072, r: 8, p: 1, keylen: 64, maxmem: 256 * 1024 * 1024 } as const;

export function hacherMotDePasse(motDePasse: string): string {
  const sel = randomBytes(16);
  const derive = scryptSync(motDePasse, sel, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: SCRYPT.maxmem });
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
      p: Number(p),
      // maxmem déduit des paramètres du hash stocké (anciens et nouveaux formats).
      maxmem: Math.max(32 * 1024 * 1024, 128 * Number(n) * Number(r) * 2)
    });
    return derive.length === attendu.length && timingSafeEqual(derive, attendu);
  } catch {
    return false;
  }
}

/** Attributs du cookie de session, centralisés et testés. */
export function optionsCookieSession(production: boolean) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: production,
    maxAge: SESSION_DUREE_JOURS * 24 * 60 * 60
  } as const;
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

/**
 * Jeton CSRF dérivé du jeton de session. Le secret de session est obligatoire
 * (≥ 32 octets, vérifié au démarrage par config.ts) : aucun repli silencieux.
 */
export function jetonCsrf(jetonSession: string, secret: string | undefined): string {
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('Secret de session absent ou trop court (32 octets minimum) : génération du jeton CSRF refusée.');
  }
  return createHmac('sha256', secret).update(hacherJeton(jetonSession)).digest('hex');
}

export function verifierCsrf(jetonSession: string | undefined, fourni: string | null, secret: string | undefined): boolean {
  if (!jetonSession || !fourni) return false;
  try {
    const attendu = Buffer.from(jetonCsrf(jetonSession, secret));
    const recu = Buffer.from(fourni);
    return attendu.length === recu.length && timingSafeEqual(attendu, recu);
  } catch {
    return false;
  }
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
