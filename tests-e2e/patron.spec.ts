import { expect, test, type Page } from '@playwright/test';

async function connecter(page: Page) {
  // Installation si nécessaire, sinon connexion (atelier partagé avec l’autre parcours).
  await page.goto('/installation');
  if (await page.locator('input[name="nom_atelier"]').isVisible().catch(() => false)) {
    await page.locator('input[name="nom_atelier"]').fill('Atelier E2E');
    await page.locator('input[name="nom"]').fill('Awa Admin');
    await page.locator('input[name="identifiant"]').fill('awa@exemple.bj');
    await page.locator('input[name="mot_de_passe"]').fill('mot-de-passe-long');
    await page.getByRole('button', { name: /Créer l’atelier/ }).click();
  }
  if (await page.getByRole('heading', { name: 'Connexion à l’atelier' }).isVisible().catch(() => false)) {
    await page.locator('input[name="identifiant"]').fill('awa@exemple.bj');
    await page.locator('input[name="mot_de_passe"]').fill('mot-de-passe-long');
    await page.getByRole('button', { name: 'Se connecter' }).click();
  }
}

/**
 * Parcours « patron d'abord » : modèle → mesures → patron brouillon + PDF.
 * Moins de 8 actions après connexion ; aucun nom de cliente obligatoire.
 * Captures 360 px déposées dans test-results/ (non commitées).
 */
test('patron pantalon large en 3 écrans, sans cliente obligatoire', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });

  await connecter(page);

  // Écran 1 — choisir le modèle (action 1).
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Quel patron voulez-vous faire ?' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Illustration : pantalon large/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/patron-1-modele-360.png' });
  await page.getByRole('link', { name: /Pantalon large/ }).click();

  // Écran 2 — seulement les mesures du pantalon (actions 2 à 5 : 4 champs, nom laissé vide).
  await expect(page.getByRole('heading', { name: 'Pantalon large — vos mesures' })).toBeVisible();
  await expect(page.locator('input[name="tour_taille_cm"]')).toBeVisible();
  await expect(page.locator('input[name="longueur_jupe_cm"]')).toHaveCount(0); // aucun champ inutile
  await expect(page.getByRole('img', { name: /mesurer le tour de taille/ })).toBeVisible();
  await page.locator('input[name="tour_taille_cm"]').fill('82');
  await page.locator('input[name="tour_hanches_cm"]').fill('100');
  await page.locator('input[name="hauteur_fourche_cm"]').fill('27');
  await page.locator('input[name="longueur_pantalon_cm"]').fill('105');
  await page.screenshot({ path: 'test-results/patron-2-mesures-360.png' });

  // Écran 3 — patron immédiat, bannière brouillon, PDF (actions 6 et 7).
  await page.getByRole('button', { name: 'Voir mon patron' }).click();
  await expect(page.getByRole('heading', { name: 'Pantalon large — sans nom' })).toBeVisible();
  await expect(page.getByText('Brouillon non validé.')).toBeVisible();
  await expect(page.getByRole('img', { name: /Aperçu du patron brouillon/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/patron-3-apercu-360.png', fullPage: true });
  const telechargement = page.waitForEvent('download');
  await page.getByRole('link', { name: /Télécharger le PDF/ }).click();
  const fichier = await telechargement;
  expect(fichier.suggestedFilename()).toContain('pantalon_large');
  const chemin = await fichier.path();
  expect(chemin).toBeTruthy();
});

test('mesure hors bornes : message qui nomme la mesure à vérifier', async ({ page }) => {
  await connecter(page);
  await page.goto('/patron/mesures?modele=pantalon_large');
  await page.locator('input[name="tour_taille_cm"]').fill('300');
  await page.locator('input[name="tour_hanches_cm"]').fill('100');
  await page.locator('input[name="hauteur_fourche_cm"]').fill('27');
  await page.locator('input[name="longueur_pantalon_cm"]').fill('105');
  await page.getByRole('button', { name: 'Voir mon patron' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Vérifiez : tour de taille' })).toBeVisible();
});
