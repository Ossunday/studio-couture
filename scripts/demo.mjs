/**
 * Démonstration locale pour les juges et les curieux — AUCUNE base de
 * données, AUCUNE clé, AUCUN secret sur disque.
 *
 *   npm install
 *   npm run demo        → http://127.0.0.1:3000
 *
 * Ce script :
 * 1. construit l’application (dossier STUDIO_COUTURE_BUILD_OUT si défini,
 *    sinon « build », ignoré par Git) ;
 * 2. génère des secrets temporaires EN MÉMOIRE (jamais écrits, jamais
 *    journalisés) et lance le serveur avec le dépôt mémoire
 *    (STUDIO_COUTURE_REPOSITORY=memoire : tout disparaît à l’arrêt) ;
 * 3. crée un atelier de démonstration fictif et une cliente fictive avec
 *    des mesures complètes, via les vrais formulaires de l’application ;
 * 4. reste au premier plan — Ctrl+C arrête tout.
 *
 * Compte de démonstration (fictif, local uniquement) :
 *   identifiant : demo@exemple.bj
 *   mot de passe : demo-studio-couture
 *
 * L’assistant IA est volontairement NON configuré en démo : le bouton « AI »
 * est visible et la boîte annonce « Assistant bientôt disponible ». Aucun
 * appel réseau à un modèle n’est fait dans ce mode.
 */
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';

const PORT = process.env.PORT ?? '3000';
const HOST = '127.0.0.1';
const ORIGIN = `http://${HOST}:${PORT}`;
const BUILD_OUT = process.env.STUDIO_COUTURE_BUILD_OUT ?? 'build';
const DEMO_ID = 'demo@exemple.bj';
const DEMO_MDP = 'demo-studio-couture';
const MESURES_DEMO = {
  tour_poitrine_cm: '92',
  tour_taille_cm: '76',
  tour_hanches_cm: '100',
  longueur_dos_cm: '40',
  largeur_epaules_cm: '38',
  longueur_manche_cm: '58',
  longueur_jupe_cm: '60',
  longueur_robe_cm: '100',
  hauteur_fourche_cm: '27',
  longueur_pantalon_cm: '105'
};

function etape(texte) {
  console.log(`\n[demo] ${texte}`);
}

// --- 1. Construction -------------------------------------------------------
etape(`Construction de l’application (dossier : ${BUILD_OUT})…`);
const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, STUDIO_COUTURE_BUILD_OUT: BUILD_OUT }
});
if (build.status !== 0 || !existsSync(path.join(BUILD_OUT, 'index.js'))) {
  console.error('[demo] La construction a échoué. Lancez d’abord « npm install ».');
  process.exit(1);
}

// --- 2. Serveur en mémoire, secrets éphémères -------------------------------
etape('Démarrage du serveur (dépôt mémoire, secrets temporaires en mémoire)…');
const serveur = spawn(process.execPath, [path.join(BUILD_OUT, 'index.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT,
    HOST,
    ORIGIN,
    BODY_SIZE_LIMIT: '6M',
    STUDIO_COUTURE_REPOSITORY: 'memoire',
    STUDIO_COUTURE_SESSION_SECRET: randomBytes(32).toString('base64'),
    STUDIO_COUTURE_PHOTO_ENCRYPTION_KEY_BASE64: randomBytes(32).toString('base64')
    // Volontairement AUCUNE variable STUDIO_COUTURE_IA_* : assistant désactivé.
  }
});

let cookies = '';
function garderCookies(reponse) {
  const bruts = typeof reponse.headers.getSetCookie === 'function' ? reponse.headers.getSetCookie() : [];
  for (const c of bruts) {
    const paire = c.split(';')[0];
    const nom = paire.split('=')[0];
    cookies = cookies
      .split('; ')
      .filter((p) => p && !p.startsWith(`${nom}=`))
      .concat(paire)
      .join('; ');
  }
}

async function requete(chemin, init = {}) {
  const reponse = await fetch(`${ORIGIN}${chemin}`, {
    redirect: 'manual',
    ...init,
    headers: { ...(cookies ? { cookie: cookies } : {}), ...(init.headers ?? {}) }
  });
  garderCookies(reponse);
  return reponse;
}

async function attendreServeur() {
  for (let i = 0; i < 75; i++) {
    try {
      const r = await requete('/connexion');
      if (r.status < 500) return;
    } catch {
      // pas encore prêt
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Le serveur ne répond pas.');
}

function jetonCsrf(html) {
  return html.match(/name="_csrf" value="([^"]+)"/)?.[1] ?? '';
}

/** POST de formulaire SvelteKit : la redirection arrive en JSON (HTTP 200). */
async function poster(chemin, champs) {
  const reponse = await requete(chemin, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: ORIGIN },
    body: new URLSearchParams(champs)
  });
  const texte = await reponse.text();
  let location = reponse.headers.get('location');
  try {
    const j = JSON.parse(texte);
    if (j?.type === 'redirect' && typeof j.location === 'string') location = j.location;
  } catch {
    // Réponse HTML classique : l’en-tête Location suffit.
  }
  return { status: reponse.status, location, texte };
}

async function amorcerCompteDemo() {
  // Atelier fictif via le formulaire d’installation (vierge en mémoire).
  const installation = await poster('/installation', {
    nom_atelier: 'Atelier Démo',
    nom: 'Demo Couturière',
    identifiant: DEMO_ID,
    mot_de_passe: DEMO_MDP
  });
  if (!installation.location?.includes('/connexion')) return false;

  const connexion = await poster('/connexion', { identifiant: DEMO_ID, mot_de_passe: DEMO_MDP });
  if (!connexion.location?.includes('/clientes')) return false;

  // Cliente fictive avec mesures complètes, via les vrais formulaires.
  const pageNouvelle = await (await requete('/clientes/nouvelle')).text();
  const creation = await poster('/clientes/nouvelle', { _csrf: jetonCsrf(pageNouvelle), nom: 'Cliente Démo' });
  const idCliente = creation.location?.split('/').filter(Boolean).pop();
  if (!idCliente) return false;

  const pageCliente = await (await requete(`/clientes/${idCliente}?onglet=mesures`)).text();
  const mesures = await poster(`/clientes/${idCliente}?/mensurations`, { _csrf: jetonCsrf(pageCliente), ...MESURES_DEMO });
  return mesures.status < 400;
}

// --- 3. Amorçage + premier plan ----------------------------------------------
try {
  await attendreServeur();
  const ok = await amorcerCompteDemo().catch(() => false);
  console.log('\n============================================================');
  console.log(`  Studio Couture — démo locale : ${ORIGIN}`);
  console.log('  Aucune base de données, aucune clé IA, rien sur disque.');
  console.log('  Tout est en mémoire : Ctrl+C efface tout.');
  if (ok) {
    console.log('\n  Compte de démonstration (fictif) :');
    console.log(`    identifiant : ${DEMO_ID}`);
    console.log(`    mot de passe : ${DEMO_MDP}`);
    console.log('  Une « Cliente Démo » avec mesures complètes est déjà créée.');
  } else {
    console.log('\n  Ouvrez /installation pour créer votre atelier de démonstration,');
    console.log('  ou essayez le parcours public /demo sans compte.');
  }
  console.log('\n  Assistant IA : non configuré en démo — le bouton « AI » est');
  console.log('  visible et annonce « Assistant bientôt disponible », sans appel réseau.');
  console.log('============================================================\n');
} catch (e) {
  console.error(`[demo] Échec du démarrage : ${e instanceof Error ? e.message : String(e)}`);
  serveur.kill('SIGTERM');
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    serveur.kill('SIGTERM');
    process.exit(0);
  });
}
serveur.on('exit', (code) => process.exit(code ?? 0));
