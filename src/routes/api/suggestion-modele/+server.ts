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
const MESSAGE_INDISPONIBLE = 'Assistant indisponible pour le moment : réglez les options manuellement, le patron reste calculé par le moteur.';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  if (!locals.utilisatrice) {
    return json({ statut: 'refuse', message: 'Connectez-vous pour utiliser l’assistant.' }, { status: 401 });
  }
  const jetonSession = cookies.get(SESSION_COOKIE);
  if (!verifierCsrf(jetonSession, request.headers.get('x-csrf-token'), process.env[ENV_SESSION_SECRET])) {
    return json({ statut: 'refuse', message: 'Jeton CSRF invalide. Rechargez la page et réessayez.' }, { status: 403 });
  }

  const corps: unknown = await request.json().catch(() => null);
  const texte = (corps as { texte?: unknown } | null)?.texte;
  if (typeof texte !== 'string' || texte.trim().length < 3 || texte.trim().length > LONGUEUR_MAX_TEXTE_MODELE) {
    return json({ statut: 'invalide', message: `Décrivez le modèle en quelques mots (3 à ${LONGUEUR_MAX_TEXTE_MODELE} caractères).` }, { status: 400 });
  }

  // Mode démo mémoire (tests, démonstration locale) : IA désactivée, sans erreur.
  if ((process.env.STUDIO_COUTURE_REPOSITORY ?? '').trim().toLowerCase() === 'memoire') {
    return json({ statut: 'indisponible', message: 'Assistant désactivé en mode démo : réglez les options manuellement ci-dessous.' });
  }
  if (!lireConfigIa()) {
    return json({ statut: 'indisponible', message: 'Assistant non configuré sur ce serveur : réglez les options manuellement ci-dessous.' });
  }
  if (!limiteurSuggestionsIa.autoriser(locals.utilisatrice.atelierId)) {
    return json({ statut: 'limite', message: 'Limite de suggestions atteinte pour votre atelier : réglez les options manuellement, ou réessayez plus tard.' }, { status: 429 });
  }

  const resultat = await suggererOptionsModele(texte);
  if (resultat.statut === 'ok') {
    return json({ statut: 'ok', options: resultat.options });
  }
  if (resultat.statut === 'invalide') {
    return json({ statut: 'invalide', message: 'La suggestion reçue n’était pas conforme : réglez les options manuellement, ou reformulez la description.' });
  }
  return json({ statut: 'indisponible', message: MESSAGE_INDISPONIBLE });
};
