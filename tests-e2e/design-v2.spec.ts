import { expect, test, type Page } from '@playwright/test';

async function connecter(page: Page) {
  // Installation si nécessaire, sinon connexion (atelier partagé entre parcours).
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

async function verifierLargeur(page: Page, etiquette: string) {
  const m = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(m.scrollWidth, `${etiquette} : ${m.scrollWidth} > ${m.innerWidth}`).toBeLessThanOrEqual(m.innerWidth);
}

test('design v2 : captures accueil public, liste clientes et fiche cliente à 360/768/1280', async ({ page }) => {
  for (const largeur of [360, 768, 1280]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Mesurez-la une fois/ })).toBeVisible();
    await verifierLargeur(page, `accueil design ${largeur}`);
    await page.screenshot({ path: `test-results/design-accueil-${largeur}.png`, fullPage: true });
  }

  await connecter(page);
  for (const largeur of [360, 768, 1280]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/clientes');
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nouvelle cliente' })).toBeVisible();
    await verifierLargeur(page, `clientes design ${largeur}`);
    await page.screenshot({ path: `test-results/design-clientes-${largeur}.png`, fullPage: true });
    const carte = page.locator('.carte-cliente').first();
    if (await carte.isVisible().catch(() => false)) {
      await carte.click();
      await expect(page.getByRole('heading', { name: /.+/ }).nth(1)).toBeVisible();
      await verifierLargeur(page, `fiche design ${largeur}`);
      await page.screenshot({ path: `test-results/design-fiche-${largeur}.png`, fullPage: true });
    }
  }
});
