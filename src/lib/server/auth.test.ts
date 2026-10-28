import { describe, expect, it } from 'vitest';
import { scryptSync } from 'node:crypto';
import { LimiteurDebit, expirationSession, genererJetonSession, hacherJeton, hacherMotDePasse, jetonCsrf, optionsCookieSession, verifierCsrf, verifierMotDePasse } from './auth';

const SECRET_LONG = 'secret-de-test-unitaire-32-octets-minimum';

describe('mots de passe (scrypt)', () => {
  it('vérifie le bon mot de passe et refuse les autres', () => {
    const hash = hacherMotDePasse('mot-de-passe-long');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(hash).not.toContain('mot-de-passe-long');
    expect(verifierMotDePasse('mot-de-passe-long', hash)).toBe(true);
    expect(verifierMotDePasse('autre-mot-de-passe', hash)).toBe(false);
    expect(verifierMotDePasse('mot-de-passe-long', 'format-invalide')).toBe(false);
  });
  it('utilise le minimum OWASP N=2^17, r=8, p=1 pour les nouveaux hash', () => {
    const hash = hacherMotDePasse('mot-de-passe-long');
    expect(hash.split('$').slice(0, 4)).toEqual(['scrypt', '131072', '8', '1']);
  });
  it('non-régression : vérifie encore les anciens hash N=16384 (paramètres stockés)', () => {
    const sel = Buffer.from('0123456789abcdef');
    const derive = scryptSync('ancien-mot-de-passe', sel, 64, { N: 16384, r: 8, p: 1 });
    const ancien = ['scrypt', 16384, 8, 1, sel.toString('base64'), derive.toString('base64')].join('$');
    expect(verifierMotDePasse('ancien-mot-de-passe', ancien)).toBe(true);
    expect(verifierMotDePasse('mauvais-mot-de-passe', ancien)).toBe(false);
  });
});

describe('cookie de session', () => {
  it('est HttpOnly, SameSite=Lax, 7 jours, Secure uniquement en production', () => {
    const dev = optionsCookieSession(false);
    expect(dev).toMatchObject({ path: '/', httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7 * 24 * 60 * 60 });
    expect(optionsCookieSession(true).secure).toBe(true);
    expect(optionsCookieSession(true).httpOnly).toBe(true);
  });
});

describe('sessions et CSRF', () => {
  it('ne stocke jamais le jeton en clair (hash SHA-256)', () => {
    const jeton = genererJetonSession();
    expect(hacherJeton(jeton)).not.toContain(jeton);
    expect(hacherJeton(jeton)).toHaveLength(64);
  });
  it('expire après 7 jours', () => {
    const debut = new Date('2026-10-28T00:00:00Z');
    expect(expirationSession(debut).toISOString()).toBe('2026-11-04T00:00:00.000Z');
  });
  it('accepte le jeton CSRF de la session et refuse les autres', () => {
    const jeton = genererJetonSession();
    const csrf = jetonCsrf(jeton, SECRET_LONG);
    expect(verifierCsrf(jeton, csrf, SECRET_LONG)).toBe(true);
    expect(verifierCsrf(jeton, 'faux', SECRET_LONG)).toBe(false);
    expect(verifierCsrf(undefined, csrf, SECRET_LONG)).toBe(false);
  });
  it('refuse de générer un jeton CSRF sans secret de 32 octets', () => {
    const jeton = genererJetonSession();
    expect(() => jetonCsrf(jeton, undefined)).toThrow(/32 octets/);
    expect(() => jetonCsrf(jeton, 'trop-court')).toThrow(/32 octets/);
    expect(verifierCsrf(jeton, 'quelconque', undefined)).toBe(false);
  });
});

describe('limitation de débit connexion', () => {
  it('bloque après 5 échecs pendant 15 minutes', () => {
    const limiteur = new LimiteurDebit(5, 15 * 60 * 1000);
    const t0 = new Date('2026-10-28T00:00:00Z');
    for (let i = 0; i < 5; i++) {
      expect(limiteur.autoriser('ip:awa@exemple.bj', t0)).toBe(true);
      limiteur.enregistrerEchec('ip:awa@exemple.bj', t0);
    }
    expect(limiteur.autoriser('ip:awa@exemple.bj', t0)).toBe(false);
    expect(limiteur.autoriser('ip:awa@exemple.bj', new Date(t0.getTime() + 16 * 60 * 1000))).toBe(true);
    limiteur.reinitialiser('ip:awa@exemple.bj');
    expect(limiteur.autoriser('ip:awa@exemple.bj', t0)).toBe(true);
  });
});
