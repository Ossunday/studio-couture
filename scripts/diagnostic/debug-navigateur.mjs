/**
 * Diagnostic navigateur E2E — ne pas utiliser en production.
 * Même principe que debug-e2e.mjs (serveur enfant, toujours arrêté), mais avec
 * Chromium : on journalise les en-têtes Origin/Host/Sec-Fetch du POST réel du
 * navigateur (jamais les valeurs de cookies) pour comparer avec fetch.
 *
 * Usage : npm run build && node scripts/diagnostic/debug-navigateur.mjs
 */
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const PORT = '4176';
const HOST = process.env.DEBUG_HOTE ?? '127.0.0.1';
const ORIGIN = `http://${HOST}:${PORT}`;

const enfant = spawn(process.execPath, ['build/index.js'], {
  env: {
    ...process.env,
    PORT,
    HOST,
    ORIGIN,
    STUDIO_COUTURE_REPOSITORY: 'memoire',
    STUDIO_COUTURE_SESSION_SECRET: 'secret-de-diagnostic-32-octets-minimum-local',
    STUDIO_COUTURE_PHOTO_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 7).toString('base64')
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
enfant.stdout.on('data', () => {});
enfant.stderr.on('data', (d) => process.stderr.write(d));

async function attendreServeur() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${ORIGIN}/connexion`);
      if (r.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Le serveur enfant ne répond pas.');
}

let navigateur;
try {
  await attendreServeur();
  navigateur = await chromium.launch({ headless: process.env.DEBUG_AVEC_FENETRE !== '1' });
  console.log(`Chromium lancé (headless : ${process.env.DEBUG_AVEC_FENETRE !== '1'})`);
  const page = await navigateur.newPage();
  // En-têtes réellement émis sur le réseau (y compris ceux ajoutés après le renderer).
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSentExtraInfo', (ev) => {
    const h = ev.headers ?? {};
    const origine = h['Origin'] ?? h['origin'];
    if (origine !== undefined) console.log(`Réseau (extraInfo) Origin émis : ${origine}`);
  });
  page.on('request', (req) => {
    if (req.method() === 'POST') {
      const h = req.headers();
      console.log(
        `POST navigateur -> ${req.url()} | origin=${h['origin'] ?? '(absent)'} | host=${h['host'] ?? '(absent)'} | sec-fetch-site=${h['sec-fetch-site'] ?? '(absent)'} | content-type=${h['content-type'] ?? '(absent)'}`
      );
    }
  });
  page.on('response', async (res) => {
    if (res.request().isNavigationRequest()) {
      const h = res.headers();
      console.log(
        `Navigation ${res.url()} -> ${res.status()} | content-security-policy=${h['content-security-policy'] ?? '(absent)'} | cross-origin-opener-policy=${h['cross-origin-opener-policy'] ?? '(absent)'}`
      );
    }
    if (res.request().method() === 'POST') {
      const texte = await res.text().catch(() => '');
      console.log(`Réponse POST -> ${res.status()} | corps: ${texte.slice(0, 160).replace(/\s+/g, ' ')}`);
    }
  });

  await page.goto(`${ORIGIN}/installation`);
  console.log(`URL après GET : ${page.url()}`);
  console.log(`Origines vues par la page : location.origin=${await page.evaluate(() => location.origin)} | document.origin=${await page.evaluate(() => document.origin)}`);
  await page.locator('input[name="nom_atelier"]').fill('Atelier Debug');
  await page.locator('input[name="nom"]').fill('Awa Debug');
  await page.locator('input[name="identifiant"]').fill('nav@exemple.bj');
  await page.locator('input[name="mot_de_passe"]').fill('mot-de-passe-long');
  await page.getByRole('button', { name: /Créer l’atelier/ }).click();
  await page.waitForTimeout(1500);
  console.log(`URL après clic : ${page.url()}`);
  const contenu = (await page.locator('body').innerText()).slice(0, 300).replace(/\s+/g, ' ');
  console.log(`Contenu visible : ${contenu}`);

  // Comparaison : même parcours avec JavaScript désactivé (formulaire natif SSR pur).
  const contexteSansJs = await navigateur.newContext({ javaScriptEnabled: false });
  const pageSansJs = await contexteSansJs.newPage();
  pageSansJs.on('request', (req) => {
    if (req.method() === 'POST') console.log(`POST navigateur (JS désactivé) -> ${req.url()}`);
  });
  pageSansJs.on('response', async (res) => {
    if (res.request().method() === 'POST') console.log(`Réponse POST (JS désactivé) -> ${res.status()}`);
  });
  await pageSansJs.goto(`${ORIGIN}/installation`);
  const texteSansJs = await pageSansJs.locator('body').innerText();
  console.log(`JS désactivé, page installation affichée : ${texteSansJs.includes('Créer l’atelier')}`);
  await pageSansJs.locator('input[name="nom_atelier"]').fill('Atelier Debug Sans JS');
  await pageSansJs.locator('input[name="nom"]').fill('Awa Sans JS');
  await pageSansJs.locator('input[name="identifiant"]').fill('sansjs@exemple.bj');
  await pageSansJs.locator('input[name="mot_de_passe"]').fill('mot-de-passe-long');
  await pageSansJs.getByRole('button', { name: /Créer l’atelier/ }).click();
  await pageSansJs.waitForTimeout(1500);
  console.log(`JS désactivé, URL après clic : ${pageSansJs.url()}`);
  console.log(`JS désactivé, contenu : ${(await pageSansJs.locator('body').innerText()).slice(0, 200).replace(/\s+/g, ' ')}`);
  await contexteSansJs.close();
} catch (e) {
  console.error(`Échec du diagnostic navigateur : ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  await navigateur?.close().catch(() => {});
  enfant.kill('SIGTERM');
  await Promise.race([
    new Promise((r) => enfant.once('exit', r)),
    new Promise((r) => setTimeout(r, 3000))
  ]);
  console.log('Navigateur fermé, serveur enfant arrêté.');
}
