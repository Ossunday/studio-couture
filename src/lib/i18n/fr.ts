import { BRAND_DESCRIPTION, BRAND_NAME } from '../brand';

export const fr = {
  'app.nom': BRAND_NAME,
  'app.tagline': BRAND_DESCRIPTION,
  'parcours.titre': 'Nouveau projet cliente',
  'parcours.etape.modele': 'Photo du modèle choisi',
  'parcours.etape.cliente': 'Photo complète de la cliente',
  'parcours.etape.tissu': 'Tissu',
  'parcours.etape.rendu': 'Rendu de la cliente habillée',
  'parcours.etape.mensurations': 'Mensurations validées par la couturière',
  'parcours.etape.patron': 'Patron à l’échelle avec cotes et marges',
  'parcours.etape.tutoriel': 'Tutoriel animé de tracé',
  'parcours.etape.montage': 'Fiche de montage',
  'parcours.etape.devis': 'Métrage et devis',
  'rendu.etiquette': 'rendu indicatif',
  'mensuration.estimation': 'Estimation d’après photo — à vérifier',
  'mensuration.marge_erreur': 'Marge d’erreur estimée',
  'patron.bloque_non_valide':
    'Patron non généré : les formules ne sont pas encore validées par un maître tailleur.',
  'privacy.consentement_requis': 'Consentement explicite de la cliente requis avant toute photo.',
  'privacy.retention': 'Suppression automatique après 7 jours',
  'commun.bientot': 'Disponible à la phase suivante, après votre accord.'
} as const;

export type TranslationKey = keyof typeof fr;
