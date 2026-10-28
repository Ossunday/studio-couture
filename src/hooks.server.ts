import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, hacherJeton, jetonCsrf } from '$lib/server/auth';
import { getRepository } from '$lib/server/repository';
import { ENV_SESSION_SECRET } from '$lib/brand';

/** SSR uniquement, français d'abord. Session serveur + en-têtes vie privée. */
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.locale = 'fr';

  const jeton = event.cookies.get(SESSION_COOKIE);
  if (jeton) {
    try {
      const session = await getRepository().trouverSession(hacherJeton(jeton));
      if (session) {
        event.locals.utilisatrice = session.utilisatrice;
        event.locals.csrfToken = jetonCsrf(jeton, process.env[ENV_SESSION_SECRET]);
      }
    } catch {
      // Base indisponible : on reste anonyme, les gardes redirigeront vers /connexion.
      event.locals.utilisatrice = undefined;
    }
  }

  const response = await resolve(event);
  response.headers.set('x-content-type-options', 'nosniff');
  // « same-origin » et non « no-referrer » : avec no-referrer, Chromium envoie
  // « Origin: null » sur les POST de formulaire, ce que le contrôle CSRF/Origin
  // de SvelteKit rejette (vérifié par scripts/diagnostic/debug-proxy.mjs). same-origin
  // ne divulgue toujours aucune URL aux sites externes.
  response.headers.set('referrer-policy', 'same-origin');
  response.headers.set('x-frame-options', 'DENY');
  // Les photos clientes ne doivent jamais transiter par un cache partagé.
  if (event.url.pathname.startsWith('/photos-clientes') || event.url.pathname.includes('/photos/')) {
    response.headers.set('cache-control', 'private, no-store');
  }
  return response;
};
