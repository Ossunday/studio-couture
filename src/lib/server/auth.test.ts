import { describe, expect, it } from 'vitest';
import { LimiteurDebit, expirationSession, genererJetonSession, hacherJeton, hacherMotDePasse, jetonCsrf, verifierCsrf, verifierMotDePasse } from './auth';

describe('mots de passe (scrypt)', () => {
  it('vérifie le bon mot de passe et refuse les autres', () => {
    const hash = hacherMotDePasse('mot-de-passe-long');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(hash).not.toContain('mot-de-passe-long');
    expect(verifierMotDePasse('mot-de-passe-long', hash)).toBe(true);
    expect(verifierMotDePasse('autre-mot-de-passe', hash)).toBe(false);
    expect(verifierMotDePasse('mot-de-passe-long', 'format-invalide')).toBe(false);
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
    const csrf = jetonCsrf(jeton, 'secret-test');
    expect(verifierCsrf(jeton, csrf, 'secret-test')).toBe(true);
    expect(verifierCsrf(jeton, 'faux', 'secret-test')).toBe(false);
    expect(verifierCsrf(undefined, csrf, 'secret-test')).toBe(false);
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
