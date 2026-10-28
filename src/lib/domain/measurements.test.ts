import { describe, expect, it } from 'vitest';
import { assertMensurationsPretesPourPatron } from './measurements';
import type { Mensuration } from './types';

const base = { clienteId: 'c1', valeurCm: 80 };

describe('mensurations — règle n°4', () => {
  it('refuse une estimation photo non validée par la couturière', () => {
    const m: Mensuration = { ...base, id: '1', code: 'tour_taille_cm', source: 'estimation_photo', margeErreurCm: 3, valideeParCouturiere: false };
    expect(() => assertMensurationsPretesPourPatron([m])).toThrow(/non validée/);
  });
  it('refuse une estimation photo sans marge d’erreur', () => {
    const m: Mensuration = { ...base, id: '1', code: 'tour_taille_cm', source: 'estimation_photo', valideeParCouturiere: true };
    expect(() => assertMensurationsPretesPourPatron([m])).toThrow(/Marge d'erreur/);
  });
  it('accepte une saisie couturière', () => {
    const m: Mensuration = { ...base, id: '1', code: 'tour_taille_cm', source: 'saisie_couturiere', valideeParCouturiere: true };
    expect(() => assertMensurationsPretesPourPatron([m])).not.toThrow();
  });
});
