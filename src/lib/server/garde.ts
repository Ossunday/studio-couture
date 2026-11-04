import { error, redirect } from '@sveltejs/kit';
import type { RoleAtelier } from '../domain/types';

export type UtilisatriceSession = { id: string; atelierId: string; nom: string; role: RoleAtelier };

export function exigerConnexion(utilisatrice: UtilisatriceSession | undefined): UtilisatriceSession {
  if (!utilisatrice) throw redirect(303, '/connexion');
  return utilisatrice;
}

export function exigerAdmin(utilisatrice: UtilisatriceSession | undefined): UtilisatriceSession {
  const u = exigerConnexion(utilisatrice);
  if (u.role !== 'admin') throw error(403, 'erreur.adminSeule');
  return u;
}

/**
 * Protection CSRF : SvelteKit vérifie déjà l’origine des actions de formulaire ;
 * ce jeton par session (dérivé du cookie HttpOnly, voir auth.ts) est exigé en plus
 * sur chaque écriture, y compris les points d’entrée hors actions.
 */
export function assertCsrf(attendu: string | undefined, fourni: FormDataEntryValue | null): void {
  if (!attendu || !fourni || fourni.toString() !== attendu) {
    throw error(403, 'erreur.csrf');
  }
}
