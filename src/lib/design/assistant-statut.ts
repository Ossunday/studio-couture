import type { TranslationKey } from '$lib/i18n';

/**
 * Correspondance statut serveur → message de l'assistant (phase 11).
 *
 * Fonction pure utilisée par AssistantFlottant.svelte, testée ici :
 * chaque statut a SON message, et le cas par défaut (statut absent ou
 * inconnu) est le message « réponse non conforme » — jamais le message
 * « hors catalogue », réservé au seul statut explicite `hors_catalogue`.
 */
export interface ResolutionMessageAssistant {
  /** Clé i18n du message à afficher dans la bulle assistant. */
  cleMessage: TranslationKey;
  /** Vrai si l'assistant doit en plus se marquer indisponible (repli manuel seul). */
  rendIndisponible: boolean;
}

const RESOLUTIONS: Readonly<Record<string, ResolutionMessageAssistant>> = {
  hors_catalogue: { cleMessage: 'assistant.horsCatalogue', rendIndisponible: false },
  illisible: { cleMessage: 'assistant.illisible', rendIndisponible: false },
  invalide: { cleMessage: 'assistant.reponseInvalide', rendIndisponible: false },
  indisponible: { cleMessage: 'assistant.bientot', rendIndisponible: true },
  echec: { cleMessage: 'assistant.bientot', rendIndisponible: true },
  non_configuree: { cleMessage: 'assistant.bientot', rendIndisponible: true },
  refuse: { cleMessage: 'assistant.bientot', rendIndisponible: true },
  limite: { cleMessage: 'assistant.limite', rendIndisponible: false },
  consentement_requis: { cleMessage: 'assistant.consentementRequis', rendIndisponible: false },
  photo_trop_grande: { cleMessage: 'assistant.photoTropGrande', rendIndisponible: false },
  photo_invalide: { cleMessage: 'assistant.photoTypeRefuse', rendIndisponible: false },
  photo_illisible: { cleMessage: 'assistant.photoIllisible', rendIndisponible: false }
};

/**
 * Résout le message d'un statut de réponse de `/api/suggestion-modele`.
 * Renvoie `null` pour `ok` (la carte résultat est construite à part, à
 * partir du modèle validé) ; tout statut absent ou inconnu retombe sur
 * `assistant.reponseInvalide`, jamais sur `assistant.horsCatalogue`.
 * Seule nuance portée par `cle` : un `invalide` venu du flux photo avec la
 * clé `assistant.photoIllisible` garde son message photo.
 */
export function resoudreMessageAssistant(
  statut: string | undefined | null,
  cle?: string | undefined | null
): ResolutionMessageAssistant | null {
  if (statut === 'ok') return null;
  if (statut === 'invalide' && cle === 'assistant.photoIllisible') {
    return { cleMessage: 'assistant.photoIllisible', rendIndisponible: false };
  }
  if (statut && statut in RESOLUTIONS) return RESOLUTIONS[statut]!;
  return { cleMessage: 'assistant.reponseInvalide', rendIndisponible: false };
}
