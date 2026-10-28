/**
 * Diagnostic E2E local — ne pas utiliser en production.
 * Lance build/index.js comme processus enfant (dépôt mémoire), fait un GET puis
 * un POST /installation avec fetch, affiche statut / Location / noms des cookies
 * (jamais les valeurs), puis arrête toujours le serveur enfant.
 *
 * Usage : npm run build && node scripts/diagnostic/debug-e2e.mjs
 */
import { spawn } from 'node:child_process';

const PORT = '4175';
const HOST = '127.0.0.1';
const ORIGIN = `http://${HOST}:${PORT}`;
// Mode comparaison : DEBUG_SANS_ORIGIN=1 lance le serveur enfant sans ORIGIN,
// pour vérifier ce que adapter-node déduit seul (Host) si l’env Playwright était perdu.
const SANS_ORIGIN = process.env.DEBUG_SANS_ORIGIN === '1';

const envEnfant = {
  ...process.env,
  PORT,
  HOST,
  STUDIO_COUTURE_REPOSITORY: 'memoire',
  STUDIO_COUTURE_SESSION_SECRET: 'secret-debug-local',
  STUDIO_COUTURE_PHOTO_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 7).toString('base64')
};
if (SANS_ORIGIN) delete envEnfant.ORIGIN;
else envEnfant.ORIGIN = ORIGIN;

const enfant = spawn(process.execPath, ['build/index.js'], {
  env: envEnfant,
  stdio: ['ignore', 'pipe', 'pipe']
});

let sortieServeur = '';
enfant.stdout.on('data', (d) => (sortieServeur += d.toString()));
enfant.stderr.on('data', (d) => (sortieServeur += d.toString()));

function nomsCookies(reponse) {
  const bruts = typeof reponse.headers.getSetCookie === 'function' ? reponse.headers.getSetCookie() : [];
  return bruts.map((c) => {
    const [paire, ...attributs] = c.split(';');
    const nom = paire.split('=')[0];
    return `${nom}=<masqué> ;${attributs.join(' ;')}`;
  });
}

async function attendreServeur() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${ORIGIN}/connexion`);
      if (r.status < 500) return;
    } catch {
      // pas encore prêt
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Le serveur enfant ne répond pas.');
}

try {
  await attendreServeur();
  console.log(`Serveur enfant prêt sur ${ORIGIN} (ORIGIN ${SANS_ORIGIN ? 'non transmis au serveur' : `transmis : ${ORIGIN}`})`);

  const get = await fetch(`${ORIGIN}/installation`, { redirect: 'manual' });
  const getTexte = await get.text();
  console.log(`GET /installation -> ${get.status}, Location=${get.headers.get('location') ?? '(aucune)'}`);
  console.log(`GET contient le formulaire d’installation : ${getTexte.includes('Créer l’atelier')}`);
  const baliseForm = getTexte.match(/<form[^>]*>/i)?.[0] ?? '(aucune balise form trouvée)';
  console.log(`Balise form rendue : ${baliseForm}`);
  const enTetes = [...get.headers.entries()].filter(([k]) => k !== 'set-cookie').map(([k, v]) => `${k}: ${v}`);
  console.log(`En-têtes GET /installation :\n${enTetes.join('\n')}`);

  const corps = new URLSearchParams({
    nom_atelier: 'Atelier Debug',
    nom: 'Awa Debug',
    identifiant: 'debug@exemple.bj',
    mot_de_passe: 'mot-de-passe-long'
  });
  const post = await fetch(`${ORIGIN}/installation`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin: ORIGIN
    },
    body: corps
  });
  const postTexte = await post.text();
  console.log(`POST /installation (Origin: ${ORIGIN}) -> ${post.status}, Location=${post.headers.get('location') ?? '(aucune)'}`);
  console.log(`Set-Cookie : ${nomsCookies(post).join(' | ') || '(aucun)'}`);
  console.log(`Corps (200 premiers caractères) : ${postTexte.slice(0, 200).replace(/\s+/g, ' ')}`);

  const postSansOrigin = await fetch(`${ORIGIN}/installation`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: corps
  });
  console.log(`POST /installation (sans Origin) -> ${postSansOrigin.status} (contrôle de comparaison)`);
  await postSansOrigin.text();

  if (sortieServeur.trim()) console.log(`Sortie du serveur enfant :\n${sortieServeur.trim().slice(0, 1000)}`);
} catch (e) {
  console.error(`Échec du diagnostic : ${e instanceof Error ? e.message : String(e)}`);
  if (sortieServeur.trim()) console.error(`Sortie du serveur enfant :\n${sortieServeur.trim().slice(0, 1000)}`);
  process.exitCode = 1;
} finally {
  enfant.kill('SIGTERM');
  // Laisser le temps au processus de s’arrêter, sans bloquer indéfiniment.
  await Promise.race([
    new Promise((r) => enfant.once('exit', r)),
    new Promise((r) => setTimeout(r, 3000))
  ]);
  if (!enfant.killed) enfant.kill('SIGKILL');
  console.log('Serveur enfant arrêté.');
}
