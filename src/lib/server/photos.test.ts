import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { TAILLE_PHOTO_MAX_OCTETS, chiffrer, dechiffrer, validerPhoto } from './crypto';
import { calculerExpiration, estExpiree } from '../privacy/retention';
import { RepositoryMemoire } from './repository-memory';

describe('validation des photos clientes', () => {
  it('accepte JPEG/PNG/WebP sous 5 Mo et refuse le reste', () => {
    expect(() => validerPhoto('image/jpeg', 1024)).not.toThrow();
    expect(() => validerPhoto('image/gif', 1024)).toThrow(/JPEG, PNG ou WebP/);
    expect(() => validerPhoto('image/png', TAILLE_PHOTO_MAX_OCTETS + 1)).toThrow(/5 Mo/);
    expect(() => validerPhoto('image/png', 0)).toThrow(/5 Mo/);
  });
  it('expire exactement 7 jours après création par défaut', () => {
    const creee = new Date('2026-10-28T10:00:00Z');
    expect(calculerExpiration(creee).toISOString()).toBe('2026-11-04T10:00:00.000Z');
    expect(estExpiree({ expireLe: calculerExpiration(creee) }, new Date('2026-11-04T10:00:01Z'))).toBe(true);
    expect(estExpiree({ expireLe: calculerExpiration(creee) }, new Date('2026-11-03T10:00:00Z'))).toBe(false);
  });
});

describe('stockage chiffré + purge à 7 jours (dépôt mémoire)', () => {
  it('stocke uniquement le chiffré et purge les photos expirées', async () => {
    const repo = new RepositoryMemoire();
    const cle = randomBytes(32);
    const blob = chiffrer(Buffer.from('image-fictive'), cle);
    const passee = await repo.creerPhoto({
      clienteId: 'c1',
      consentementId: 'co1',
      type: 'cliente_complete',
      typeMime: 'image/jpeg',
      tailleOctets: 13,
      iv: blob.iv,
      authTag: blob.authTag,
      donneesChiffrees: blob.donnees,
      expireLe: new Date('2026-10-01T00:00:00Z')
    });
    expect(passee.donneesChiffrees?.toString()).not.toContain('image-fictive');
    const stockee = await repo.trouverPhoto('c1', passee.id);
    expect(stockee && dechiffrer({ iv: stockee.iv, authTag: stockee.authTag, donnees: stockee.donneesChiffrees }, cle).toString()).toBe('image-fictive');
    expect(await repo.purgerPhotosExpirees(new Date('2026-10-28T00:00:00Z'))).toBe(1);
    expect(await repo.listerPhotos('c1')).toHaveLength(0);
  });
});
