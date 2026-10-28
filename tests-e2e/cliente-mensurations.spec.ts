import { expect, test } from '@playwright/test';

/** Parcours Phase 1 : installation → connexion → cliente → consentement → mensurations. */
test('cliente puis mensurations validées par la couturière', async ({ page }) => {
  // Installation de l’atelier (premier compte, rôle admin).
  await page.goto('/installation');
  await page.locator('input[name="nom_atelier"]').fill('Atelier E2E');
  await page.locator('input[name="nom"]').fill('Awa Admin');
  await page.locator('input[name="identifiant"]').fill('awa@exemple.bj');
  await page.locator('input[name="mot_de_passe"]').fill('mot-de-passe-long');
  await page.getByRole('button', { name: /Créer l’atelier/ }).click();

  // Connexion.
  await expect(page.getByRole('heading', { name: 'Connexion à l’atelier' })).toBeVisible();
  await page.locator('input[name="identifiant"]').fill('awa@exemple.bj');
  await page.locator('input[name="mot_de_passe"]').fill('mot-de-passe-long');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  // Création d’une cliente.
  await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
  await page.getByRole('link', { name: 'Nouvelle cliente' }).click();
  await page.locator('input[name="nom"]').fill('Cliente Test E2E');
  await page.locator('input[name="telephone"]').fill('+22996000000');
  await page.getByRole('button', { name: 'Créer la fiche cliente' }).click();
  await expect(page.getByRole('heading', { name: 'Cliente Test E2E' })).toBeVisible();

  // Consentement photo signé.
  await page.locator('input[name="accord_photo"]').check();
  await page.locator('input[name="signature_nom"]').fill('Cliente Test E2E');
  await page.getByRole('button', { name: 'Enregistrer le consentement signé' }).click();
  await expect(page.getByText('Consentement photo enregistré.')).toBeVisible();

  // Mensurations manuelles en cm (virgule acceptée).
  await page.locator('input[name="tour_taille_cm"]').fill('82,5');
  await page.locator('input[name="tour_hanches_cm"]').fill('100');
  await page.locator('input[name="longueur_jupe_cm"]').fill('60');
  await page.getByRole('button', { name: 'Enregistrer les mensurations' }).click();
  await expect(page.getByText('Mensurations enregistrées et validées par la couturière.')).toBeVisible();
  await expect(page.locator('input[name="tour_taille_cm"]')).toHaveValue('82.5');
});
