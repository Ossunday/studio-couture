/**
 * Diagnostic proxy E2E — ne pas utiliser en production.
 * Serveur construit en processus enfant (4178) + proxy Node de diagnostic (4179)
 * qui journalise l’en-tête Origin tel qu’il arrive sur le réseau pour les POST,
 * puis Chromium soumet le formulaire d’installation via le proxy.
 * Tout est arrêté dans le bloc finally. Aucune valeur de cookie affichée.
 *
 * Usage : npm run build && node scripts/diagnostic/debug-proxy.mjs
 */
import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { chromium } from '@playwright/test';

const PORT_SERVEUR = '4178';
const PORT_PROXY = '4179';
const ORIGIN_SERVEUR = `http://127.0.0.1:${PORT_SERVEUR}`;
const ORIGIN_PROXY = `http://127.0.0.1:${PORT_PROXY}`;

const enfant = spawn(process.execPath, ['build/index.js'], {
  env: {
    ...process.env,
    PORT: PORT_SERVEUR,
    HOST: '127.0.0.1',
    ORIGIN: ORIGIN_PROXY,
    STUDIO_COUTURE_REPOSITORY: 'memoire',
    STUDIO_COUTURE_SESSION_SECRET: 'secret-debug-local',
    STUDIO_COUTURE_PHOTO_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 7).toString('base64')
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
enfant.stderr.on('data', (d) => process.stderr.write(d));

const proxy = createServer((req, res) => {
  if (req.method === 'POST') {
    console.log(
      `Proxy reçoit POST ${req.url} | origin=${req.headers.origin ?? '(absent)'} | host=${req.headers.host ?? '(absent)'} | referer=${req.headers.referer ?? '(absent)'} | sec-fetch-site=${req.headers['sec-fetch-site'] ?? '(absent)'}`
    );
  }
  const aller = httpRequest(
    { host: '127.0.0.1', port: Number(PORT_SERVEUR), path: req.url, method: req.method, headers: req.headers },
    (reponse) => {
      res.writeHead(reponse.statusCode ?? 502, reponse.headers);
      reponse.pipe(res);
    }
  );
  aller.on('error', (e) => {
    res.writeHead(502);
    res.end(String(e));
  });
  req.pipe(aller);
});

async function attendre(url) {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Pas de réponse sur ${url}`);
}

let navigateur;
try {
  await new Promise((r) => proxy.listen(Number(PORT_PROXY), '127.0.0.1', r));
  await attendre(`${ORIGIN_SERVEUR}/connexion`);
  navigateur = await chromium.launch();
  const page = await navigateur.newPage();
  await page.goto(`${ORIGIN_PROXY}/installation`);
  console.log(`Page via proxy : ${page.url()} | location.origin=${await page.evaluate(() => location.origin)}`);
  await page.locator('input[name="nom_atelier"]').fill('Atelier Proxy');
  await page.locator('input[name="nom"]').fill('Awa Proxy');
  await page.locator('input[name="identifiant"]').fill('proxy@exemple.bj');
  await page.locator('input[name="mot_de_passe"]').fill('mot-de-passe-long');
  await page.getByRole('button', { name: /Créer l’atelier/ }).click();
  await page.waitForTimeout(1500);
  console.log(`URL après clic : ${page.url()}`);
  console.log(`Contenu : ${(await page.locator('body').innerText()).slice(0, 200).replace(/\s+/g, ' ')}`);
} catch (e) {
  console.error(`Échec du diagnostic proxy : ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  await navigateur?.close().catch(() => {});
  proxy.close();
  enfant.kill('SIGTERM');
  await Promise.race([new Promise((r) => enfant.once('exit', r)), new Promise((r) => setTimeout(r, 3000))]);
  console.log('Proxy fermé, serveur enfant arrêté.');
}
