import type { PageServerLoad } from './$types';
import { exigerConnexion } from '$lib/server/garde';

export const load: PageServerLoad = async ({ locals }) => {
  const u = exigerConnexion(locals.utilisatrice);
  return { nom: u.nom, role: u.role, csrfToken: locals.csrfToken };
};
