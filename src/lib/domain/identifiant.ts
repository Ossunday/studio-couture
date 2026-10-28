/** Identifiant de connexion atelier : e-mail OU téléphone, normalisé avant stockage/recherche. */

export type IdentifiantNormalise =
  | { type: 'email'; valeur: string }
  | { type: 'telephone'; valeur: string };

export function normaliserIdentifiant(brut: string): IdentifiantNormalise {
  const valeur = brut.trim().toLowerCase();
  if (valeur.includes('@')) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valeur)) {
      throw new Error('Adresse e-mail invalide.');
    }
    return { type: 'email', valeur };
  }
  // Téléphone : chiffres, « + » initial et séparateurs courants acceptés (Bénin et international).
  const compact = valeur.replace(/[\s.\-()]/g, '');
  if (!/^\+?\d{8,15}$/.test(compact)) {
    throw new Error('Numéro de téléphone invalide (8 à 15 chiffres).');
  }
  return { type: 'telephone', valeur: compact };
}

export function validerMotDePasse(motDePasse: string): void {
  if (motDePasse.length < 10) {
    throw new Error('Mot de passe trop court : 10 caractères minimum.');
  }
}
