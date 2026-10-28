import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE, hacherJeton, verifierCsrf } from '$lib/server/auth';
import { getRepository } from '$lib/server/repository';
import { ENV_SESSION_SECRET } from '$lib/brand';

export const POST: RequestHandler = async ({ cookies, request }) => {
  const jeton = cookies.get(SESSION_COOKIE);
  const data = await request.formData().catch(() => null);
  if (!verifierCsrf(jeton, data?.get('_csrf')?.toString() ?? null, process.env[ENV_SESSION_SECRET])) {
    return new Response('Jeton CSRF invalide.', { status: 403 });
  }
  if (jeton) await getRepository().supprimerSession(hacherJeton(jeton));
  cookies.delete(SESSION_COOKIE, { path: '/' });
  throw redirect(303, '/connexion');
};
