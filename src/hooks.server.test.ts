import { describe, expect, it } from 'vitest';
import { handle, init } from './hooks.server';

/**
 * Garde-fou : « referrer-policy: no-referrer » faisait envoyer par Chromium
 * « Origin: null » sur les POST de formulaire (prouvé par
 * scripts/diagnostic/debug-proxy.mjs), ce que le contrôle CSRF/Origin de
 * SvelteKit rejette en 403 — tous les formulaires de l’atelier tombaient.
 * « same-origin » garde la confidentialité vis-à-vis des sites externes
 * tout en laissant passer les formulaires de même origine.
 */
describe('en-têtes de sécurité (hooks.server)', () => {
  it('envoie referrer-policy: same-origin et jamais no-referrer', async () => {
    const event = {
      locals: {},
      cookies: { get: () => undefined },
      url: new URL('http://127.0.0.1:4173/clientes')
    };
    const reponse = await handle({
      event: event as never,
      resolve: (async () => new Response('ok')) as never
    });
    expect(reponse.headers.get('referrer-policy')).toBe('same-origin');
    expect(reponse.headers.get('referrer-policy')).not.toBe('no-referrer');
    expect(reponse.headers.get('x-content-type-options')).toBe('nosniff');
    expect(reponse.headers.get('x-frame-options')).toBe('DENY');
  });

  it('init refuse le démarrage sans secrets valides, même en dépôt mémoire', async () => {
    const avant = { ...process.env };
    try {
      delete process.env.STUDIO_COUTURE_SESSION_SECRET;
      delete process.env.STUDIO_COUTURE_PHOTO_ENCRYPTION_KEY_BASE64;
      process.env.STUDIO_COUTURE_REPOSITORY = 'memoire';
      await expect(init()).rejects.toThrow(/Démarrage refusé/);
      process.env.STUDIO_COUTURE_SESSION_SECRET = 'secret-de-test-hooks-32-octets-minimum';
      process.env.STUDIO_COUTURE_PHOTO_ENCRYPTION_KEY_BASE64 = Buffer.alloc(32, 5).toString('base64');
      await expect(init()).resolves.toBeUndefined();
    } finally {
      process.env = avant;
    }
  });
});
