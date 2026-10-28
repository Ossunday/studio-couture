import { describe, expect, it } from 'vitest';
import { ManualMeasurementProvider, ManualTryOnProvider } from './manual';

describe('fournisseurs IA factices V1 — règle n°9', () => {
  it('try-on manuel : en attente, toujours étiqueté « rendu indicatif »', async () => {
    const r = await new ManualTryOnProvider().rendre({ photoModeleRef: 'm', photoClienteRef: 'c' });
    expect(r).toEqual({ statut: 'en_attente_manuel', etiquette: 'rendu indicatif' });
  });
  it('mesure manuelle : aucune estimation inventée', async () => {
    expect(await new ManualMeasurementProvider().estimer('photo')).toEqual([]);
  });
});
