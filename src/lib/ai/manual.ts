import type {
  EntreeTryOn,
  EstimationMensuration,
  MeasurementProvider,
  ResultatSegmentation,
  ResultatTryOn,
  SegmentationProvider,
  TryOnProvider
} from './types';

/** V1 : aucun appel IA réel. L'atelier fait le rendu à la main / attend un fournisseur. */
export class ManualTryOnProvider implements TryOnProvider {
  readonly nom = 'manuel-v1';
  async rendre(e: EntreeTryOn): Promise<ResultatTryOn> {
    void e;
    return { statut: 'en_attente_manuel', etiquette: 'rendu indicatif' };
  }
}

export class ManualSegmentationProvider implements SegmentationProvider {
  readonly nom = 'manuel-v1';
  async segmenter(photoRef: string): Promise<ResultatSegmentation> {
    void photoRef;
    return { statut: 'en_attente_manuel' };
  }
}

/** V1 : aucune estimation inventée — la couturière saisit les mensurations. */
export class ManualMeasurementProvider implements MeasurementProvider {
  readonly nom = 'manuel-v1';
  async estimer(photoClienteRef: string): Promise<EstimationMensuration[]> {
    void photoClienteRef;
    return [];
  }
}
