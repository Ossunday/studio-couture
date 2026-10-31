import type { PageServerLoad } from './$types';
import { exigerConnexion } from '$lib/server/garde';
import { getRepository } from '$lib/server/repository';

export const load: PageServerLoad = async ({ locals, url }) => {
  const u = exigerConnexion(locals.utilisatrice);
  const recherche = url.searchParams.get('q') ?? '';
  const clientes = await getRepository().listerClientes(u.atelierId, recherche);
  return {
    clientes: clientes.map((c) => ({
      id: c.id,
      nom: c.nom,
      telephone: c.telephone ?? null,
      creeeLe: c.createdAt.toISOString()
    })),
    recherche,
    peutSupprimer: u.role === 'admin'
  };
};
