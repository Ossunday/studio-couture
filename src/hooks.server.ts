import { randomBytes } from 'node:crypto';
import type { Handle, ServerInit } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { SESSION_COOKIE, hacherJeton, jetonCsrf } from '$lib/server/auth';
import { validerConfigurationDemarrage } from '$lib/server/config';
import { getRepository } from '$lib/server/repository';
import { ENV_SESSION_SECRET } from '$lib/brand';
import { LANG_COOKIE, lireLangue, t } from '$lib/i18n';
import { COOKIE_CSRF_LANGUE, jetonLangue } from '$lib/server/langue';

export { COOKIE_CSRF_LANGUE };

export const init: ServerInit = async () => {
  // `dev` est figé au build : en production, prévient si ORIGIN manque (CSRF).
  validerConfigurationDemarrage(process.env, !dev);
};

/** SSR uniquement. Langue (cookie « lang »), session serveur + en-têtes vie privée. */
export const handle: Handle = async ({ event, resolve }) => {
  const lang = lireLangue(event.cookies.get(LANG_COOKIE));
  event.locals.lang = lang;
  event.locals.locale = lang;

  // Jeton CSRF anonyme pour le seul formulaire public POST /langue.
  try {
    let valeur = event.cookies.get(COOKIE_CSRF_LANGUE);
    if (!valeur) {
      valeur = randomBytes(24).toString('base64url');
      if (typeof event.cookies.set === 'function') {
        event.cookies.set(COOKIE_CSRF_LANGUE, valeur, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 365 * 24 * 60 * 60
        });
      }
    }
    event.locals.csrfLangue = jetonLangue(valeur, process.env[ENV_SESSION_SECRET]);
  } catch {
    event.locals.csrfLangue = undefined;
  }

  const jeton = event.cookies.get(SESSION_COOKIE);
  if (jeton) {
    try {
      const session = await getRepository().trouverSession(hacherJeton(jeton));
      if (session) {
        event.locals.utilisatrice = session.utilisatrice;
        event.locals.csrfToken = jetonCsrf(jeton, process.env[ENV_SESSION_SECRET]);
      }
    } catch {
      event.locals.utilisatrice = undefined;
    }
  }

  const description = t(lang, 'app.descriptionLongue').replace(/"/g, '&quot;');
  const response = await resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%lang%', lang).replace('%description%', description)
  });
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'same-origin');
  response.headers.set('x-frame-options', 'DENY');
  if (event.url.pathname.startsWith('/photos-clientes') || event.url.pathname.includes('/photos/')) {
    response.headers.set('cache-control', 'private, no-store');
  }
  return response;
};
