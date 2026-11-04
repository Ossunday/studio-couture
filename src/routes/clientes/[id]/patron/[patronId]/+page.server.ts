import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { estModelePatron, type ModelePatron } from '$lib/patterns/saisie-patron';
import { assertCsrf, exigerConnexion } from '$lib/server/garde';
import { validerPatronEnregistre } from '$lib/server/patron-cliente';
import { getRepository } from '$lib/server/repository';
import { t, traduireErreur, type TranslationKey } from '$lib/i18n';

/** Clé pas encore dans fr.ts/en.ts : proposée dans le rapport du lot (clé=FR=EN). */
const cle = (k: string) => k as TranslationKey;

/** Ouvrir un patron enregistré dans la salle d'essayage (instantané de la fiche). */
export const load: PageServerLoad = async ({ locals, params }) => {
  const lang = locals.lang;
  const u = exigerConnexion(locals.utilisatrice);
  const repo = getRepository();
  const cliente = await repo.trouverCliente(u.atelierId, params.id);
  if (!cliente) throw error(404, t(lang, cle('erreur.clienteIntrouvable')));
  const patron = await repo.trouverPatron(u.atelierId, params.patronId);
  if (!patron || patron.clienteId !== cliente.id) throw error(404, t(lang, cle('erreur.patronIntrouvable')));
  if (!estModelePatron(patron.modele)) throw error(404, t(lang, 'erreur.modeleIndisponible'));
  const modele: ModelePatron = patron.modele;
  const prenom = cliente.nom.trim().split(/\s+/)[0] ?? cliente.nom;
  return {
    lang,
    cliente: { id: cliente.id, nom: cliente.nom, prenom },
    patron: {
      id: patron.id,
      modele,
      nom: patron.nom,
      mesures: patron.mesures,
      options: patron.options,
      tissu: patron.tissu,
      creeLe: patron.createdAt.toISOString()
    },
    csrfToken: locals.csrfToken
  };
};

export const actions: Actions = {
  modifierPatron: async ({ request, locals, params }) => {
    const lang = locals.lang;
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const repo = getRepository();
    const cliente = await repo.trouverCliente(u.atelierId, params.id);
    if (!cliente) throw error(404, t(lang, cle('erreur.clienteIntrouvable')));
    const patron = await repo.trouverPatron(u.atelierId, params.patronId);
    if (!patron || patron.clienteId !== cliente.id) throw error(404, t(lang, cle('erreur.patronIntrouvable')));
    if (!estModelePatron(patron.modele)) throw error(404, t(lang, 'erreur.modeleIndisponible'));
    try {
      const valide = validerPatronEnregistre(patron.modele, (code) => data.get(code)?.toString());
      await repo.modifierPatron(u.atelierId, patron.id, valide);
    } catch (e) {
      return fail(400, { erreur: traduireErreur(lang, e, cle('fiche.patronEnregistrementImpossible')) });
    }
    throw redirect(303, `/clientes/${cliente.id}?onglet=patrons&patron=modifie`);
  }
};
