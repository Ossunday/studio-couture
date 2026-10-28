/**
 * Purge des photos clientes expirées (suppression automatique après 7 jours).
 * Cron quotidien recommandé, ex. : 15 3 * * * node scripts/purger-photos-expirees.mjs
 * Requiert STUDIO_COUTURE_DATABASE_URL (ou DATABASE_URL) et les migrations 0001 + 0002.
 * Les données chiffrées sont dans la ligne : supprimer la ligne supprime la photo.
 */
import pg from 'pg';

const url = process.env.STUDIO_COUTURE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('STUDIO_COUTURE_DATABASE_URL manquante.');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  const r = await pool.query('delete from photos_clientes where expire_le <= now()');
  console.log(`Photos expirées supprimées : ${r.rowCount ?? 0}`);
} finally {
  await pool.end();
}
