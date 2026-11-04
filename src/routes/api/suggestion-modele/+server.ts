import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ENV_SESSION_SECRET } from '$lib/brand';
import { SESSION_COOKIE, verifierCsrf } from '$lib/server/auth';
import {
  LONGUEUR_MAX_TEXTE_MODELE,
  limiteurSuggestionsIa,
  lireConfigIa,
  suggererOptionsModele
} from '$lib/server/ia/suggestion-modele';

/**
 * Assistant de modèle (phase 8) : traduit le texte du modèle en OPTIONS du
 * pantalon large. Connectée uniquement, CSRF exigé, limite par atelier.
 * Aucune donnée cliente n'est acceptée ni transmise : seul le champ `texte`
 * est lu. Toute indisponibilité renvoie un statut explicite (jamais une
 * erreur bloquante) pour que le formulaire manuel prenne le relais.
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  if (!locals.utilisatrice) {
    return json({ statut: 'refuse', cle: 'ia.connectez' }, { status: 401 });
  }
  const jetonSession = cookies.get(SESSION_COOKIE);
  if (!verifierCsrf(jetonSession, request.headers.get('x-csrf-token'), process.env[ENV_SESSION_SECRET])) {
    return json({ statut: 'refuse', cle: 'erreur.csrf' }, { status: 403 });
  }

  const corps: unknown = await request.json().catch(() => null);
  const texte = (corps as { texte?: unknown } | null)?.texte;
  if (typeof texte !== 'string' || texte.trim().length < 3 || texte.trim().length > LONGUEUR_MAX_TEXTE_MODELE) {
    return json({ statut: 'invalide', cle: 'ia.decrivez' }, { status: 400 });
  }

  // Mode démo mémoire (tests, démonstration locale) : IA désactivée, sans erreur.
  if ((process.env.STUDIO_COUTURE_REPOSITORY ?? '').trim().toLowerCase() === 'memoire') {
    return json({ statut: 'indisponible', cle: 'ia.desactiveDemo' });
  }
  if (!lireConfigIa()) {
    return json({ statut: 'indisponible', cle: 'ia.nonConfigure' });
  }
  if (!limiteurSuggestionsIa.autoriser(locals.utilisatrice.atelierId)) {
    return json({ statut: 'limite', cle: 'ia.limite' }, { status: 429 });
  }

  const resultat = await suggererOptionsModele(texte);
  if (resultat.statut === 'ok') {
    return json({ statut: 'ok', options: resultat.options });
  }
  if (resultat.statut === 'invalide') {
    return json({ statut: 'invalide', cle: 'ia.invalide' });
  }
  return json({ statut: 'indisponible', cle: 'ia.indisponible' });
};
