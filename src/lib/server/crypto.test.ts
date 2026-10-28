import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { chiffrer, cleDepuisBase64, dechiffrer } from './crypto';

describe('chiffrement photos AES-256-GCM', () => {
  it('aller-retour chiffrer/déchiffrer', () => {
    const cle = randomBytes(32);
    const blob = chiffrer(Buffer.from('photo-cliente-fictive'), cle);
    expect(dechiffrer(blob, cle).toString()).toBe('photo-cliente-fictive');
    expect(blob.donnees.toString()).not.toContain('photo-cliente');
  });
  it('rejette une clé qui ne fait pas 32 octets', () => {
    expect(() => cleDepuisBase64(Buffer.from('trop-court').toString('base64'))).toThrow(/32 octets/);
  });
});
