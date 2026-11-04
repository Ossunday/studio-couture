import { expect, test } from '@playwright/test';

test('inscription : créer mon atelier → tableau de bord → ajout d’une cliente', async ({ page }) => {
  const email = `atelier-${Date.now()}@exemple.bj`;

  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/inscription');
  await expect(page.getByRole('heading', { name: 'Ouvrez votre atelier en 2 minutes' })).toBeVisible();
  await expect(page.getByText('Brouillon à valider par un maître tailleur avant toute coupe réelle.')).toBeVisible();
  const largeur = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, i: window.innerWidth }));
  expect(largeur.s).toBeLessThanOrEqual(largeur.i);

  await page.locator('input[name="nom_atelier"]').fill('Atelier Inscription E2E');
  await page.locator('input[name="nom"]').fill('Awa Inscription');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="mot_de_passe"]').fill('une phrase longue e2e');
  await page.locator('input[name="mot_de_passe_confirmation"]').fill('une phrase longue e2e');
  await page.locator('input[name="consentement"]').check();
  await page.getByRole('button', { name: 'Créer mon atelier' }).click();

  // Tableau de bord (accueil connecté pour l’instant, refondu en phase 4).
  await expect(page.getByText('Votre atelier est prêt. Ajoutez votre première cliente.')).toBeVisible();
  // Pastille de langue en haut à droite, à côté de l’avatar : FR par défaut.
  await expect(page.locator('.barre-haut .langue-bascule')).toContainText('FR');
  await expect(page.locator('.barre-haut .langue-bascule')).toBeVisible();

  await page.getByRole('link', { name: 'Créer une fiche cliente' }).first().click();
  await expect(page.getByRole('heading', { name: 'Nouvelle cliente' })).toBeVisible();
  await page.locator('input[name="nom"]').fill('Cliente Inscription E2E');
  await page.getByRole('button', { name: 'Créer la fiche cliente' }).click();
  await expect(page.getByRole('heading', { name: 'Cliente Inscription E2E' })).toBeVisible();
});

test('inscription : mot de passe de moins de 12 caractères refusé', async ({ page }) => {
  await page.goto('/inscription');
  await page.locator('input[name="nom_atelier"]').fill('Atelier Court');
  await page.locator('input[name="nom"]').fill('Awa Court');
  await page.locator('input[name="email"]').fill(`court-${Date.now()}@exemple.bj`);
  await page.locator('input[name="mot_de_passe"]').fill('court');
  await page.locator('input[name="mot_de_passe_confirmation"]').fill('court');
  await page.locator('input[name="consentement"]').check();
  await page.getByRole('button', { name: 'Créer mon atelier' }).click();
  await expect(page.getByText(/12 caractères minimum/)).toBeVisible();
  await expect(page).toHaveURL(/\/inscription/);
});
