import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function verifierLargeur(page: import('@playwright/test').Page, etiquette: string) {
  const m = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(m.scrollWidth, `${etiquette} : ${m.scrollWidth} > ${m.innerWidth}`).toBeLessThanOrEqual(m.innerWidth);
}

test('démo guidée publique : 4 étapes sans compte, patron zoomable et PDF %PDF', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Votre patron sur mesure, en 2 minutes' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voir la démo guidée' })).toBeVisible();
  await verifierLargeur(page, 'accueil 360');

  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Démo guidée' })).toBeVisible();
  await expect(page.getByText('Brouillon non validé.')).toBeVisible();
  // Étape 1 — modèle
  await expect(page.getByRole('heading', { name: '1. Choisir le modèle' })).toBeVisible();
  await verifierLargeur(page, 'démo étape 1');
  await page.getByRole('button', { name: 'Fermer l’aide' }).click();
  await page.getByRole('button', { name: 'Aide' }).click();
  await expect(page.getByLabel('Bulle de guidage')).toBeVisible();
  await page.getByRole('button', { name: 'Choisir le pantalon large' }).click();

  // Étape 2 — mesures préremplies Moyenne
  await expect(page.getByRole('heading', { name: '2. Mesures' })).toBeVisible();
  await page.getByRole('button', { name: 'Moyenne', exact: true }).click();
  await expect(page.locator('input[name="tour_taille_cm"]')).toHaveValue('82');
  await expect(page.locator('input[name="tour_hanches_cm"]')).toHaveValue('100');
  await expect(page.locator('input[name="hauteur_fourche_cm"]')).toHaveValue('27');
  await expect(page.locator('input[name="longueur_pantalon_cm"]')).toHaveValue('105');
  await verifierLargeur(page, 'démo étape 2');
  await page.getByRole('button', { name: 'Voir mon patron' }).click();

  // Étape 3 — patron, onglets et zoom
  await expect(page.getByRole('heading', { name: /3\. Salle d.essayage/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /Aperçu du patron brouillon/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Dos' }).click();
  await expect(page.getByRole('tab', { name: 'Dos' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Tout' }).click();
  await page.getByRole('button', { name: 'Zoomer', exact: true }).click();
  await expect(page.getByText(/Zoom : 125 %/)).toBeVisible();
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await verifierLargeur(page, 'démo étape 3');
  await page.getByRole('button', { name: 'Voir le résultat et le PDF' }).click();

  // Étape 4 — résultat et PDF réel
  await expect(page.getByRole('heading', { name: '4. Résultat' })).toBeVisible();
  await expect(page.getByText('carré de contrôle de 10 cm', { exact: true })).toBeVisible();
  await verifierLargeur(page, 'démo étape 4');
  const telechargement = page.waitForEvent('download');
  await page.getByRole('link', { name: /Télécharger le PDF/ }).click();
  const fichier = await telechargement;
  expect(fichier.suggestedFilename()).toContain('demo');
  const chemin = await fichier.path();
  expect(chemin).toBeTruthy();
  const octets = await readFile(chemin!);
  expect(octets.subarray(0, 4).toString('latin1')).toBe('%PDF');
});

test('démo : mesures hors bornes refusées avec un message en français', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Choisir le pantalon large' }).click();
  await page.getByRole('button', { name: 'Moyenne', exact: true }).click();
  await page.locator('input[name="tour_taille_cm"]').fill('300');
  await page.getByRole('button', { name: 'Voir mon patron' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Vérifiez : tour de taille' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '2. Mesures' })).toBeVisible();
});

async function allerSalle(page: import('@playwright/test').Page) {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Choisir le pantalon large' }).click();
  await page.getByRole('button', { name: 'Moyenne', exact: true }).click();
  await page.getByRole('button', { name: 'Voir mon patron' }).click();
  await expect(page.getByRole('heading', { name: /3\. Salle d.essayage/ })).toBeVisible();
}

test('salle d’essayage : changer une mesure met à jour le patron en direct', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await allerSalle(page);
  const patron = page.locator('section[aria-label="Votre patron"]');
  await expect(patron.getByText('20,5 cm').first()).toBeVisible();
  await page.locator('input[name="live-tour_taille_cm"]').fill('90');
  await expect(patron.getByText('22,5 cm').first()).toBeVisible({ timeout: 5000 });
  // Curseur synchronisé avec le champ
  await expect(page.getByLabel('Curseur Tour de taille (cm)')).toHaveValue('90');
  await verifierLargeur(page, 'salle 1280');
});

test('salle d’essayage : mesure hors plage, message français et dernier patron conservé', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await allerSalle(page);
  await page.locator('input[name="live-tour_taille_cm"]').fill('90');
  const patron = page.locator('section[aria-label="Votre patron"]');
  await expect(patron.getByText('22,5 cm').first()).toBeVisible({ timeout: 5000 });
  await page.locator('input[name="live-tour_taille_cm"]').fill('300');
  await expect(page.locator('#err-tour_taille_cm')).toContainText('entre 40 et 200 cm', { timeout: 5000 });
  await expect(patron.getByText('22,5 cm').first()).toBeVisible();
});

test('salle d’essayage : changer de tissu change le remplissage des pièces', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await allerSalle(page);
  const svg = page.locator('svg.patron');
  await expect(svg).toHaveAttribute('data-tissu-couleur', '#33536e');
  const avant = await svg.locator('polygon').first().getAttribute('fill');
  await page.getByRole('button', { name: 'Couleur Noir' }).click();
  await page.getByRole('button', { name: 'Satin', exact: true }).click();
  await expect(svg).toHaveAttribute('data-tissu-couleur', '#23201d');
  await expect(svg).toHaveAttribute('data-tissu-matiere', 'satin');
  expect(await svg.locator('polygon').first().getAttribute('fill')).toBe(avant); // motif svg (url), couleur portée par le motif
  await expect(svg.locator('#motif-tissu rect')).toHaveAttribute('fill', '#23201d');
});

test('salle d’essayage : aucun débordement à 360, 768 et 1280 px, captures étape 3', async ({ page }) => {
  for (const largeur of [360, 768, 1280]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await allerSalle(page);
    await verifierLargeur(page, `salle ${largeur}`);
    await page.screenshot({ path: `test-results/demo-3-salle-${largeur}.png`, fullPage: true });
  }
});

test('captures démo 360 px et 768 px : accueil et chaque étape (test-results/, non commitées)', async ({ page }) => {
  for (const largeur of [360, 768]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Votre patron sur mesure, en 2 minutes' })).toBeVisible();
    await page.screenshot({ path: `test-results/demo-accueil-${largeur}.png`, fullPage: true });
    await verifierLargeur(page, `accueil ${largeur}`);
    await page.goto('/demo');
    await expect(page.getByRole('heading', { name: '1. Choisir le modèle' })).toBeVisible();
    await page.screenshot({ path: `test-results/demo-1-modele-${largeur}.png`, fullPage: true });
    await verifierLargeur(page, `démo 1 ${largeur}`);
    await page.getByRole('button', { name: 'Choisir le pantalon large' }).click();
    await page.getByRole('button', { name: 'Moyenne', exact: true }).click();
    await page.screenshot({ path: `test-results/demo-2-mesures-${largeur}.png`, fullPage: true });
    await verifierLargeur(page, `démo 2 ${largeur}`);
    await page.getByRole('button', { name: 'Voir mon patron' }).click();
    await expect(page.getByRole('heading', { name: /3\. Salle d.essayage/ })).toBeVisible();
    await page.screenshot({ path: `test-results/demo-3-patron-${largeur}.png`, fullPage: true });
    await verifierLargeur(page, `démo 3 ${largeur}`);
    await page.getByRole('button', { name: 'Voir le résultat et le PDF' }).click();
    await expect(page.getByRole('heading', { name: '4. Résultat' })).toBeVisible();
    await page.screenshot({ path: `test-results/demo-4-resultat-${largeur}.png`, fullPage: true });
    await verifierLargeur(page, `démo 4 ${largeur}`);
  }
});
