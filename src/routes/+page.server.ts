import type { PageServerLoad } from './$types';
import { FORMULES_JUPE_DROITE } from '$lib/patterns/jupe-droite/formulas';
import { tenterGenerationPatron } from '$lib/patterns/engine';
import { t } from '$lib/i18n';

/** Parcours vide Phase 0 : on prouve côté serveur que le patron est bloqué tant que non validé. */
export const load: PageServerLoad = async ({ locals }) => {
  const tentative = tenterGenerationPatron('jupe_droite', FORMULES_JUPE_DROITE, []);
  return {
    etapes: [
      t('fr', 'parcours.etape.modele'),
      t('fr', 'parcours.etape.cliente'),
      t('fr', 'parcours.etape.tissu'),
      t('fr', 'parcours.etape.rendu'),
      t('fr', 'parcours.etape.mensurations'),
      t('fr', 'parcours.etape.patron'),
      t('fr', 'parcours.etape.tutoriel'),
      t('fr', 'parcours.etape.montage'),
      t('fr', 'parcours.etape.devis')
    ],
    patronBloque: !tentative.ok,
    raisonsBlocage: tentative.ok ? [] : tentative.raisons,
    connectee: Boolean(locals.utilisatrice)
  };
};
