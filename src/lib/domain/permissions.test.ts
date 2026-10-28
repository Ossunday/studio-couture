import { describe, expect, it } from 'vitest';
import { peut } from './permissions';

describe('permissions atelier', () => {
  it('admin gère les utilisatrices, pas la couturière', () => {
    expect(peut('admin', 'atelier.gerer_utilisatrices')).toBe(true);
    expect(peut('couturiere', 'atelier.gerer_utilisatrices')).toBe(false);
  });
  it('couturière peut générer un patron et supprimer une photo', () => {
    expect(peut('couturiere', 'patron.generer')).toBe(true);
    expect(peut('couturiere', 'photo.supprimer')).toBe(true);
    expect(peut('couturiere', 'devis.valider')).toBe(false);
  });
});
