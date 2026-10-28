import { describe, expect, it } from 'vitest';
import { assertConsentementPhoto, calculerExpiration, estExpiree } from './retention';

describe('vie privée — règle n°8', () => {
  it('expiration = création + 7 jours par défaut', () => {
    const creee = new Date('2026-10-01T10:00:00Z');
    expect(calculerExpiration(creee).toISOString()).toBe('2026-10-08T10:00:00.000Z');
  });
  it('photo expirée après 7 jours', () => {
    const expireLe = new Date('2026-10-08T10:00:00Z');
    expect(estExpiree({ expireLe }, new Date('2026-10-09T00:00:00Z'))).toBe(true);
    expect(estExpiree({ expireLe }, new Date('2026-10-07T00:00:00Z'))).toBe(false);
  });
  it('refuse absence de consentement et consentement révoqué', () => {
    expect(() => assertConsentementPhoto(undefined)).toThrow(/requis/);
    expect(() =>
      assertConsentementPhoto({ id: '1', clienteId: 'c', donneLe: new Date(), revoqueLe: new Date(), usageRenduIa: true, usageEntrainementIa: false })
    ).toThrow(/révoqué/);
  });
});
