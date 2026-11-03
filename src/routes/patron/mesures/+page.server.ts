import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { definitionMensuration } from '$lib/domain/mensurations-saisie';
import { exigerEntreeModele, parametresOptionsModele, type OptionsModele } from '$lib/patterns/registre';
import { estModelePatron, parametresPatron, validerMesuresPatron } from '$lib/patterns/saisie-patron';
import { assertCsrf, exigerConnexion } from '$lib/server/garde';

export const load: PageServerLoad = async ({ locals, url }) => {
  exigerConnexion(locals.utilisatrice);
  const modele = url.searchParams.get('modele');
  if (!estModelePatron(modele)) throw error(404, 'Modèle indisponible.');
  const entree = exigerEntreeModele(modele);
  return {
    modele,
    titre: entree.titre,
    champs: entree.champs.map((code) => {
      const def = definitionMensuration(code);
      return { code, libelle: def.libelle, minCm: def.minCm, maxCm: def.maxCm };
    }),
    options: entree.options,
    csrfToken: locals.csrfToken
  };
};

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    exigerConnexion(locals.utilisatrice);
    const modele = url.searchParams.get('modele');
    if (!estModelePatron(modele)) throw error(404, 'Modèle indisponible.');
    const entree = exigerEntreeModele(modele);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const nom = String(data.get('nom') ?? '').trim().slice(0, 60) || 'sans nom';
    let mesures: Record<string, number>;
    let suffixeOptions = '';
    try {
      mesures = validerMesuresPatron(modele, (code) => String(data.get(code) ?? ''));
      const options: OptionsModele = entree.lireOptions((code) => String(data.get(code) ?? ''));
      const params = new URLSearchParams();
      parametresOptionsModele(params, entree, options);
      suffixeOptions = params.toString() ? `&${params.toString()}` : '';
    } catch (e) {
      return fail(400, { erreur: e instanceof Error ? e.message : 'Mesures à vérifier.' });
    }
    throw redirect(303, `/patron/apercu?${parametresPatron(modele, nom, mesures).toString()}${suffixeOptions}`);
  }
};
