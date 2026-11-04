import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LANG_COOKIE, cheminInterneSur, lireLangue, t } from '$lib/i18n';
import { COOKIE_CSRF_LANGUE, verifierJetonLangue } from '$lib/server/langue';
import { SESSION_COOKIE, verifierCsrf } from '$lib/server/auth';
import { ENV_SESSION_SECRET } from '$lib/brand';

/**
 * Changement de langue : POST uniquement, jeton CSRF exigé (anonyme dédié
 * ou jeton de session si connectée), cookie « lang » d'un an sans donnée
 * personnelle, redirection uniquement vers un chemin interne.
 */
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
  const data = await request.formData().catch(() => null);
  const fourni = data?.get('_csrf')?.toString() ?? null;
  const secret = process.env[ENV_SESSION_SECRET];
  const okAnonyme = verifierJetonLangue(cookies.get(COOKIE_CSRF_LANGUE), fourni, secret);
  const okSession = verifierCsrf(cookies.get(SESSION_COOKIE), fourni, secret);
  // Le jeton exposé par le layout (session si connectée, sinon anonyme) est aussi accepté.
  const okLocal = !!fourni && (fourni === locals.csrfLangue || fourni === locals.csrfToken);
  if (!okAnonyme && !okSession && !okLocal) {
    throw error(403, t(locals.lang, 'erreur.csrf'));
  }
  const lang = lireLangue(data?.get('lang')?.toString());
  cookies.set(LANG_COOKIE, lang, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 365 * 24 * 60 * 60
  });
  throw redirect(303, cheminInterneSur(data?.get('retour')?.toString()));
};
