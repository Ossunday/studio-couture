import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { normaliserIdentifiant, validerMotDePasse } from '$lib/domain/identifiant';
import { hacherMotDePasse } from '$lib/server/auth';
import { assertCsrf, exigerAdmin } from '$lib/server/garde';
import { getRepository } from '$lib/server/repository';
import type { RoleAtelier } from '$lib/domain/types';

export const load: PageServerLoad = async ({ locals }) => {
  exigerAdmin(locals.utilisatrice);
  return { csrfToken: locals.csrfToken };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const admin = exigerAdmin(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const nom = String(data.get('nom') ?? '').trim();
    const role = String(data.get('role') ?? 'couturiere') as RoleAtelier;
    try {
      if (!nom) throw new Error('Le nom est requis.');
      if (role !== 'admin' && role !== 'couturiere') throw new Error('Rôle invalide.');
      const identifiant = normaliserIdentifiant(String(data.get('identifiant') ?? '')).valeur;
      const motDePasse = String(data.get('mot_de_passe') ?? '');
      validerMotDePasse(motDePasse);
      await getRepository().creerUtilisatrice({
        atelierId: admin.atelierId,
        nom,
        identifiant,
        motDePasseHash: hacherMotDePasse(motDePasse),
        role
      });
    } catch (e) {
      return fail(400, { erreur: e instanceof Error ? e.message : 'Création impossible (identifiant peut-être déjà utilisé).' });
    }
    return { cree: true };
  }
};
