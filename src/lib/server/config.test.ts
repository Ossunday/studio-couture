import { describe, expect, it } from 'vitest';
import { ENV_PHOTO_ENCRYPTION_KEY, ENV_SESSION_SECRET } from '../brand';
import { exigerClePhoto, exigerSecretSession, validerConfigurationDemarrage } from './config';

const envValide = {
  [ENV_SESSION_SECRET]: 'secret-de-demarrage-32-octets-minimum-ok',
  [ENV_PHOTO_ENCRYPTION_KEY]: Buffer.alloc(32, 3).toString('base64')
} as NodeJS.ProcessEnv;

describe('secrets obligatoires au démarrage', () => {
  it('accepte un secret ≥ 32 octets et une clé photo de exactement 32 octets', () => {
    expect(() => validerConfigurationDemarrage(envValide)).not.toThrow();
    expect(exigerSecretSession(envValide)).toContain('secret-de-demarrage');
    expect(exigerClePhoto(envValide)).toHaveLength(32);
  });
  it('refuse le démarrage sans secret de session ou avec un secret trop court', () => {
    expect(() => exigerSecretSession({} as NodeJS.ProcessEnv)).toThrow(/Démarrage refusé/);
    expect(() => exigerSecretSession({ [ENV_SESSION_SECRET]: 'trop-court' } as NodeJS.ProcessEnv)).toThrow(/32 octets/);
    expect(() => validerConfigurationDemarrage({ [ENV_PHOTO_ENCRYPTION_KEY]: envValide[ENV_PHOTO_ENCRYPTION_KEY] } as NodeJS.ProcessEnv)).toThrow(
      /Démarrage refusé/
    );
  });
  it('refuse le démarrage sans clé photo ou avec une clé ≠ 32 octets', () => {
    expect(() => exigerClePhoto({} as NodeJS.ProcessEnv)).toThrow(/Démarrage refusé/);
    expect(() => exigerClePhoto({ [ENV_PHOTO_ENCRYPTION_KEY]: Buffer.alloc(16, 1).toString('base64') } as NodeJS.ProcessEnv)).toThrow(
      /32 octets/
    );
    expect(() => exigerClePhoto({ [ENV_PHOTO_ENCRYPTION_KEY]: Buffer.alloc(64, 1).toString('base64') } as NodeJS.ProcessEnv)).toThrow(
      /32 octets/
    );
  });
  it('compte le secret en octets UTF-8, pas en caractères', () => {
    // 16 caractères accentués = 32 octets UTF-8 : accepté.
    expect(() => exigerSecretSession({ [ENV_SESSION_SECRET]: 'é'.repeat(16) } as NodeJS.ProcessEnv)).not.toThrow();
    expect(() => exigerSecretSession({ [ENV_SESSION_SECRET]: 'é'.repeat(15) } as NodeJS.ProcessEnv)).toThrow(/32 octets/);
  });
});
