import type { PageServerLoad } from './$types';

/** Accueil public (visiteur) / tableau de bord (utilisatrice connectée, refondu en phase 4). */
export const load: PageServerLoad = async ({ locals, url }) => {
  return {
    connectee: Boolean(locals.utilisatrice),
    bienvenue: url.searchParams.get('bienvenue') === 'atelier'
  };
};
