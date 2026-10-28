import type { PageServerLoad } from './$types';

/** Écran 1 du parcours « patron d'abord » : choisir le modèle. */
export const load: PageServerLoad = async ({ locals }) => {
  return { connectee: Boolean(locals.utilisatrice) };
};
