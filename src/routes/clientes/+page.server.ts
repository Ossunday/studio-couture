import type { PageServerLoad } from './$types';
import { exigerConnexion } from '$lib/server/garde';
import { getRepository } from '$lib/server/repository';

export const load: PageServerLoad = async ({ locals, url }) => {
  const u = exigerConnexion(locals.utilisatrice);
  const recherche = url.searchParams.get('q') ?? '';
  const repo = getRepository();
  const clientes = await repo.listerClientes(u.atelierId, recherche);
  const resumes = await repo.resumerPatronsParCliente(u.atelierId);
  return {
    clientes: clientes.map((c) => ({
      id: c.id,
      nom: c.nom,
      telephone: c.telephone ?? null,
      creeeLe: c.createdAt.toISOString(),
      nbPatrons: resumes[c.id]?.nombre ?? 0,
      dernierPatronLe: resumes[c.id]?.dernierLe?.toISOString() ?? null
    })),
    recherche,
    peutSupprimer: u.role === 'admin'
  };
};
