import { describe, expect, it } from 'vitest';
import { FORMULES_JUPE_DROITE } from './jupe-droite/formulas';
import { tenterGenerationPatron } from './engine';

describe('moteur patron — règles n°2 et n°3', () => {
  it('toutes les formules jupe droite sont a_valider, sans source inventée', () => {
    for (const f of FORMULES_JUPE_DROITE) {
      expect(f.statut).toBe('a_valider');
      expect(f.source).toBeNull();
      expect(f.aisanceCm).toEqual({});
    }
  });
  it('refuse de générer un patron de production en Phase 0', () => {
    const r = tenterGenerationPatron('jupe_droite', FORMULES_JUPE_DROITE, []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.raisons.length).toBeGreaterThan(0);
  });
});
