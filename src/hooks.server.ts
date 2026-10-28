import type { Handle } from '@sveltejs/kit';

/** SSR uniquement, français d'abord. En-têtes sobres pour petit budget et vie privée. */
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.locale = 'fr';
  const response = await resolve(event);
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'no-referrer');
  // Les photos clientes ne doivent jamais transiter par un cache partagé.
  if (event.url.pathname.startsWith('/photos-clientes')) {
    response.headers.set('cache-control', 'private, no-store');
  }
  return response;
};
