import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { validerNomCliente } from '$lib/domain/cliente';
import { traduireErreur } from '$lib/i18n';
import { assertCsrf, exigerConnexion } from '$lib/server/garde';
import { getRepository } from '$lib/server/repository';

export const load: PageServerLoad = async ({ locals }) => {
  exigerConnexion(locals.utilisatrice);
  return { csrfToken: locals.csrfToken, lang: locals.lang };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    let clienteId: string;
    try {
      const nom = validerNomCliente(String(data.get('nom') ?? ''));
      const telephone = String(data.get('telephone') ?? '').trim() || undefined;
      clienteId = (await getRepository().creerCliente(u.atelierId, nom, telephone)).id;
    } catch (e) {
      return fail(400, { erreur: traduireErreur(locals.lang, e, 'validation.creationImpossible') });
    }
    throw redirect(303, `/clientes/${clienteId}`);
  }
};
