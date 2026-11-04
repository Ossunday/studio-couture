import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { normaliserIdentifiant, validerMotDePasse } from '$lib/domain/identifiant';
import { hacherMotDePasse } from '$lib/server/auth';
import { assertCsrf, exigerAdmin } from '$lib/server/garde';
import { getRepository } from '$lib/server/repository';
import type { RoleAtelier } from '$lib/domain/types';
import { MessageError, traduireErreur, type TranslationKey } from '$lib/i18n';

/** Clé pas encore dans fr.ts/en.ts : proposée dans le rapport du lot (clé=FR=EN). */
const cle = (k: string) => k as TranslationKey;

export const load: PageServerLoad = async ({ locals }) => {
  exigerAdmin(locals.utilisatrice);
  return { lang: locals.lang, csrfToken: locals.csrfToken };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const lang = locals.lang;
    const admin = exigerAdmin(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const nom = String(data.get('nom') ?? '').trim();
    const role = String(data.get('role') ?? 'couturiere') as RoleAtelier;
    try {
      if (!nom) throw new MessageError(cle('equipe.nomRequis'));
      if (role !== 'admin' && role !== 'couturiere') throw new MessageError(cle('equipe.roleInvalide'));
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
      return fail(400, { erreur: traduireErreur(lang, e, 'validation.creationImpossible') });
    }
    return { cree: true };
  }
};
