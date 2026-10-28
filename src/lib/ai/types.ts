/**
 * Règle n°9 : toute dépendance IA est derrière une interface.
 * En V1, seuls des fournisseurs factices/manuels sont branchés.
 */

export interface EntreeTryOn {
  photoModeleRef: string;
  photoClienteRef: string;
  photoTissuRef?: string;
}

export interface ResultatTryOn {
  statut: 'en_attente_manuel' | 'pret';
  imageRef?: string;
  /** Règle n°5 : toujours exactement cette étiquette côté UI. */
  etiquette: 'rendu indicatif';
}

export interface TryOnProvider {
  readonly nom: string;
  rendre(e: EntreeTryOn): Promise<ResultatTryOn>;
}

export interface ResultatSegmentation {
  statut: 'en_attente_manuel' | 'pret';
  masqueRef?: string;
}

export interface SegmentationProvider {
  readonly nom: string;
  segmenter(photoRef: string): Promise<ResultatSegmentation>;
}

export interface EstimationMensuration {
  code: string;
  valeurCm: number;
  /** Règle n°4 : marge d'erreur obligatoire, affichée, éditable ensuite. */
  margeErreurCm: number;
  source: 'estimation_photo';
  valideeParCouturiere: false;
}

export interface MeasurementProvider {
  readonly nom: string;
  estimer(photoClienteRef: string): Promise<EstimationMensuration[]>;
}
