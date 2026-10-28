import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { peut } from '$lib/domain/permissions';
import { assertCsrf, exigerConnexion } from '$lib/server/garde';
import { getRepository } from '$lib/server/repository';

export const load: PageServerLoad = async ({ locals, params }) => {
  const u = exigerConnexion(locals.utilisatrice);
  const repo = getRepository();
  const cliente = await repo.trouverCliente(u.atelierId, params.id);
  if (!cliente) throw error(404, 'Cliente introuvable.');
  const consentement = await repo.consentementActif(cliente.id);
  return {
    cliente: { id: cliente.id, nom: cliente.nom, telephone: cliente.telephone ?? null },
    consentement: consentement
      ? { donneLe: consentement.donneLe.toISOString(), usageRenduIa: consentement.usageRenduIa }
      : null,
    peutSupprimer: peut(u.role, 'cliente.supprimer'),
    csrfToken: locals.csrfToken
  };
};

export const actions: Actions = {
  consentement: async ({ request, locals, params }) => {
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const repo = getRepository();
    const cliente = await repo.trouverCliente(u.atelierId, params.id);
    if (!cliente) throw error(404, 'Cliente introuvable.');
    const signature = String(data.get('signature_nom') ?? '').trim();
    if (signature.length < 2) return fail(400, { erreur: 'Le nom signé de la cliente est requis pour le consentement photo.' });
    if (data.get('accord_photo') !== 'on') return fail(400, { erreur: 'Cochez l’accord explicite de la cliente avant d’enregistrer le consentement.' });
    await repo.donnerConsentement(cliente.id, signature, data.get('usage_rendu_ia') === 'on');
    return { consentementEnregistre: true };
  },
  revoquer: async ({ request, locals, params }) => {
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const repo = getRepository();
    const cliente = await repo.trouverCliente(u.atelierId, params.id);
    if (!cliente) throw error(404, 'Cliente introuvable.');
    await repo.revoquerConsentement(cliente.id);
    return { consentementRevoque: true };
  },
  supprimer: async ({ request, locals, params }) => {
    const u = exigerConnexion(locals.utilisatrice);
    if (!peut(u.role, 'cliente.supprimer')) throw error(403, 'Seule l’administratrice peut supprimer une cliente.');
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    await getRepository().supprimerCliente(u.atelierId, params.id);
    throw redirect(303, '/clientes');
  }
};
