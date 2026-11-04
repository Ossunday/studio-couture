import { MessageError } from '../i18n';

/** Identifiant de connexion atelier : e-mail OU téléphone, normalisé avant stockage/recherche. */

export type IdentifiantNormalise =
  | { type: 'email'; valeur: string }
  | { type: 'telephone'; valeur: string };

export function normaliserIdentifiant(brut: string): IdentifiantNormalise {
  const valeur = brut.trim().toLowerCase();
  if (valeur.includes('@')) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valeur)) {
      throw new MessageError('validation.identifiantEmail');
    }
    return { type: 'email', valeur };
  }
  // Téléphone : chiffres, « + » initial et séparateurs courants acceptés (Bénin et international).
  const compact = valeur.replace(/[\s.\-()]/g, '');
  if (!/^\+?\d{8,15}$/.test(compact)) {
    throw new MessageError('validation.identifiantTel');
  }
  return { type: 'telephone', valeur: compact };
}

export function validerMotDePasse(motDePasse: string): void {
  if (motDePasse.length < 10) {
    throw new MessageError('validation.motDePasse10');
  }
}
