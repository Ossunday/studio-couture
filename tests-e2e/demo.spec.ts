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
  await expect(page.getByRole('heading', { name: '3. Patron brouillon coté' })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: '3. Patron brouillon coté' })).toBeVisible();
    await page.screenshot({ path: `test-results/demo-3-patron-${largeur}.png`, fullPage: true });
    await verifierLargeur(page, `démo 3 ${largeur}`);
    await page.getByRole('button', { name: 'Voir le résultat et le PDF' }).click();
    await expect(page.getByRole('heading', { name: '4. Résultat' })).toBeVisible();
    await page.screenshot({ path: `test-results/demo-4-resultat-${largeur}.png`, fullPage: true });
    await verifierLargeur(page, `démo 4 ${largeur}`);
  }
});
