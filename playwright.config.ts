import { defineConfig } from '@playwright/test';

/**
 * E2E contre le dépôt mémoire (STUDIO_COUTURE_REPOSITORY=memoire) :
 * aucun PostgreSQL requis, aucune donnée réelle. Ne jamais lancer contre la production.
 * La clé photo ci-dessous est une clé de test publique (32 octets), sans valeur hors E2E.
 */
export default defineConfig({
  testDir: './tests-e2e',
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'npm run build && node build/index.js',
    url: 'http://127.0.0.1:4173/connexion',
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      PORT: '4173',
      HOST: '127.0.0.1',
      ORIGIN: 'http://127.0.0.1:4173',
      STUDIO_COUTURE_REPOSITORY: 'memoire',
      STUDIO_COUTURE_PHOTO_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 7).toString('base64'),
      STUDIO_COUTURE_SESSION_SECRET: 'secret-de-test-e2e-32-octets-minimum-non-production'
    }
  }
});
