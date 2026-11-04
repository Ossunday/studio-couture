/**
 * Captures d’écran publiques du README — Playwright, mode démo uniquement.
 *
 * Prérequis : la démo tourne déjà (aucune clé, aucune base) :
 *   npm run demo            (dans un autre terminal)
 *   node scripts/captures.mjs
 *
 * Variable optionnelle : CAPTURES_BASE_URL (défaut ci-dessous, port 3100 pour
 * ne jamais toucher un serveur de production local sur 3000).
 * Les captures montrent ce qui est RÉEL en démo : l’assistant IA n’y est pas
 * configuré, la boîte affiche donc « Assistant bientôt disponible » — aucun
 * faux résultat n’est mis en scène.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.CAPTURES_BASE_URL ?? 'http://127.0.0.1:3100';
const SORTIE = 'docs/captures';
mkdirSync(SORTIE, { recursive: true });

const navigateur = await chromium.launch();
try {
  // 1. Accueil public (non connecté).
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${SORTIE}/01-accueil.png`, fullPage: false });
  console.log('01-accueil.png');

  // Connexion avec le compte de démonstration fictif amorcé par scripts/demo.mjs.
  await page.goto(BASE + '/connexion');
  await page.locator('input[name="identifiant"]').fill('demo@exemple.bj');
  await page.locator('input[name="mot_de_passe"]').fill('demo-studio-couture');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForLoadState('networkidle');

  // 2. Tableau de bord connecté, bouton « AI » visible.
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Assistant IA' }).waitFor({ state: 'visible' });
  await page.screenshot({ path: `${SORTIE}/02-tableau-de-bord.png` });
  console.log('02-tableau-de-bord.png');

  // 3. Boîte de chat ouverte (état réel en démo : assistant bientôt disponible).
  await page.getByRole('button', { name: 'Assistant IA' }).click();
  const boite = page.getByRole('dialog', { name: 'Assistant IA' });
  await boite.waitFor({ state: 'visible' });
  await boite.getByText(/Assistant bientôt disponible/).first().waitFor({ state: 'visible' });
  await page.screenshot({ path: `${SORTIE}/03-boite-chat.png` });
  console.log('03-boite-chat.png');
  await page.keyboard.press('Escape');

  // 4. Formulaire de mesures (Cliente Démo, mesures complètes).
  await page.goto(BASE + '/clientes');
  await page.waitForLoadState('networkidle');
  const lienCliente = page.locator('a[href^="/clientes/"]').filter({ hasText: 'Cliente Démo' }).first();
  const hrefCliente = await lienCliente.getAttribute('href');
  const idCliente = hrefCliente?.split('/').filter(Boolean).pop();
  if (!idCliente) throw new Error('Cliente Démo introuvable dans la liste des clientes.');
  await page.goto(`${BASE}/clientes/${idCliente}?onglet=mesures`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${SORTIE}/04-formulaire-mesures.png` });
  console.log('04-formulaire-mesures.png');

  // 5. Patron à plat calculé (salle d’essayage, cliente aux mesures complètes).
  await page.goto(`${BASE}/clientes/${idCliente}/patron/nouveau?modele=pantalon_large`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${SORTIE}/05-patron.png` });
  console.log('05-patron.png');

  console.log(`Captures écrites dans ${SORTIE}/ (base : ${BASE})`);
} finally {
  await navigateur.close();
}
