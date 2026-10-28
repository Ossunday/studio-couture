import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { definitionMensuration } from '$lib/domain/mensurations-saisie';
import { estModelePatron, MODELES, parametresPatron, validerMesuresPatron } from '$lib/patterns/saisie-patron';
import { assertCsrf, exigerConnexion } from '$lib/server/garde';

export const load: PageServerLoad = async ({ locals, url }) => {
  exigerConnexion(locals.utilisatrice);
  const modele = url.searchParams.get('modele');
  if (!estModelePatron(modele)) throw redirect(303, '/');
  return {
    modele,
    titre: MODELES[modele].titre,
    champs: MODELES[modele].champs.map((code) => {
      const def = definitionMensuration(code);
      return { code, libelle: def.libelle, minCm: def.minCm, maxCm: def.maxCm };
    }),
    csrfToken: locals.csrfToken
  };
};

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    exigerConnexion(locals.utilisatrice);
    const modele = url.searchParams.get('modele');
    if (!estModelePatron(modele)) throw redirect(303, '/');
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const nom = String(data.get('nom') ?? '').trim().slice(0, 60) || 'sans nom';
    let mesures: Record<string, number>;
    try {
      mesures = validerMesuresPatron(modele, (code) => String(data.get(code) ?? ''));
    } catch (e) {
      return fail(400, { erreur: e instanceof Error ? e.message : 'Mesures à vérifier.' });
    }
    throw redirect(303, `/patron/apercu?${parametresPatron(modele, nom, mesures).toString()}`);
  }
};
