import { Pool } from 'pg';
import { ENV_DATABASE_URL } from '../brand';

let pool: Pool | undefined;

/** PostgreSQL — serveur uniquement (jamais importé côté client). Petit budget : un pool minimal. */
export function getPool(): Pool {
  if (!pool) {
    // Préfixé produit (STUDIO_COUTURE_DATABASE_URL) prioritaire, DATABASE_URL standard en repli.
    const connectionString = process.env[ENV_DATABASE_URL] ?? process.env.DATABASE_URL;
    if (!connectionString) throw new Error(`${ENV_DATABASE_URL} manquante (voir .env.example).`);
    pool = new Pool({ connectionString, max: 5 });
  }
  return pool;
}
