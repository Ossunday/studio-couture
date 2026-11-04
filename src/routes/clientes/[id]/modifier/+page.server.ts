import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { validerNomCliente } from '$lib/domain/cliente';
import { t, traduireErreur } from '$lib/i18n';
import { assertCsrf, exigerConnexion } from '$lib/server/garde';
import { getRepository } from '$lib/server/repository';

export const load: PageServerLoad = async ({ locals, params }) => {
  const u = exigerConnexion(locals.utilisatrice);
  const cliente = await getRepository().trouverCliente(u.atelierId, params.id);
  if (!cliente) throw error(404, t(locals.lang, 'erreur.404.titre'));
  return {
    cliente: { id: cliente.id, nom: cliente.nom, telephone: cliente.telephone ?? '' },
    csrfToken: locals.csrfToken,
    lang: locals.lang
  };
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    try {
      const nom = validerNomCliente(String(data.get('nom') ?? ''));
      const telephone = String(data.get('telephone') ?? '').trim() || undefined;
      await getRepository().modifierCliente(u.atelierId, params.id, nom, telephone);
    } catch (e) {
      return fail(400, { erreur: traduireErreur(locals.lang, e, 'validation.modificationClienteImpossible') });
    }
    throw redirect(303, `/clientes/${params.id}`);
  }
};
