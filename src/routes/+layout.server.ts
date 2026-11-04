import type { LayoutServerLoad } from './$types';
import { lireConfigIa } from '$lib/server/ia/suggestion-modele';
import { getRepository } from '$lib/server/repository';

export const load: LayoutServerLoad = async ({ locals }) => {
  const base = {
    locale: locals.locale,
    lang: locals.lang,
    utilisatrice: locals.utilisatrice,
    csrfToken: locals.csrfToken,
    csrfLangue: locals.csrfLangue,
    clientesAssistant: [] as { id: string; nom: string }[],
    assistantIaDisponible: false
  };
  if (!locals.utilisatrice) return base;
  // Assistant flottant (phase 12) : visible sur toutes les pages connectées.
  // Mode démo mémoire ou IA non configurée → le bouton reste visible mais
  // annonce « Assistant bientôt disponible », sans erreur.
  base.assistantIaDisponible =
    (process.env.STUDIO_COUTURE_REPOSITORY ?? '').trim().toLowerCase() !== 'memoire' && lireConfigIa() !== null;
  try {
    const clientes = await getRepository().listerClientes(locals.utilisatrice.atelierId);
    base.clientesAssistant = clientes.map((c) => ({ id: c.id, nom: c.nom }));
  } catch {
    base.clientesAssistant = [];
  }
  return base;
};
