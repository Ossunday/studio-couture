export type RoleAtelier = 'admin' | 'couturiere';

export interface Atelier {
  id: string;
  nom: string;
  createdAt: Date;
}

export interface Utilisatrice {
  id: string;
  atelierId: string;
  nom: string;
  role: RoleAtelier;
}

export interface Cliente {
  id: string;
  atelierId: string;
  nom: string;
  telephone?: string;
  createdAt: Date;
}

export interface Consentement {
  id: string;
  clienteId: string;
  /** Consentement explicite, horodaté, révocable — règle produit n°8. */
  donneLe: Date;
  revoqueLe?: Date;
  usageRenduIa: boolean;
  /** Toujours false en V1 : jamais d'entraînement sur les photos clientes. */
  usageEntrainementIa: false;
}

export type SourceMensuration = 'estimation_photo' | 'saisie_couturiere';

export interface Mensuration {
  id: string;
  clienteId: string;
  /** ex. tour_taille_cm, tour_hanches_cm, longueur_jupe_cm */
  code: string;
  valeurCm: number;
  source: SourceMensuration;
  /** Obligatoire si source = estimation_photo (règle n°4). */
  margeErreurCm?: number;
  /** Une estimation photo n'est jamais utilisable pour un patron sans ceci. */
  valideeParCouturiere: boolean;
  valideePar?: string;
  valideeLe?: Date;
}

export type TypePhoto = 'modele' | 'cliente_complete' | 'tissu';

export interface PhotoCliente {
  id: string;
  clienteId: string;
  type: TypePhoto;
  /** Référence vers le stockage chiffré côté serveur — jamais d'URL publique. */
  storageKeyChiffre: string;
  consentementId: string;
  creeeLe: Date;
  /** Suppression automatique : creeeLe + PHOTO_RETENTION_DAYS (défaut 7 j). */
  expireLe: Date;
  supprimeeLe?: Date;
}

/**
 * Patron enregistré sur une fiche cliente (salle d'essayage connectée).
 * Instantané autonome : mesures, options et tissu sont copiés au moment de
 * l'enregistrement — modifier la fiche ensuite ne réécrit pas le patron.
 * Statut toujours « brouillon » : les formules restent a_valider.
 */
export interface PatronCliente {
  id: string;
  clienteId: string;
  /** Modèle de patron : identifiant du registre ('pantalon_large', 'jupe_droite', …). */
  modele: string;
  nom: string;
  /** Instantané des mesures du patron, ex. { tour_taille_cm: 82 }. */
  mesures: Record<string, number>;
  /** Options du modèle (nombres ou choix textuels du registre) — {} si aucune. */
  options: Record<string, number | string>;
  tissu: { couleurId: string; matiereId: string };
  statut: 'brouillon';
  creePar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EtapeProjet =  | 'modele'
  | 'cliente'
  | 'tissu'
  | 'rendu'
  | 'mensurations'
  | 'patron'
  | 'tutoriel'
  | 'montage'
  | 'devis';

export interface ProjetCouture {
  id: string;
  atelierId: string;
  clienteId: string;
  etape: EtapeProjet;
  garmentId: 'jupe_droite' | 'pantalon_classique';
  createdAt: Date;
}
