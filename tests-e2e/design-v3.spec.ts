import { expect, test } from '@playwright/test';

/** Design v3 : captures 1280 px comparées aux PNG de docs/maquette (test-results/, non commitées). */
async function verifierLargeur(page: import('@playwright/test').Page, etiquette: string) {
  const m = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(m.scrollWidth, `${etiquette} : ${m.scrollWidth} > ${m.innerWidth}`).toBeLessThanOrEqual(m.innerWidth);
}

test('design v3 accueil : reproduction maquette Accueil à 1280 px', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Mesurez-la une fois/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /Pantalon de tailleur bleu roi/ })).toBeVisible();
  await expect(page.getByText('Le vêtement', { exact: true })).toBeVisible();
  // PatronCote : valeurs du moteur pour les mesures de démonstration (82/100/27/105).
  const patron = page.getByRole('img', { name: /Patron du pantalon, brouillon à valider/ }).first();
  await expect(patron).toBeVisible();
  await expect(patron.getByText('Ceinture 89 cm', { exact: true })).toBeVisible();
  await expect(patron.getByText('Taille 82 cm', { exact: true }).first()).toBeVisible();
  await expect(patron.getByText('Hanches 100 cm', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ce que vous faisiez en une journée, en dix minutes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Devant, dos et ceinture/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Trois gestes, et la cliente/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Nous ne vous promettons pas la magie/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Votre prochaine cliente mérite mieux/ })).toBeVisible();
  await verifierLargeur(page, 'accueil v3 1280');
  await page.screenshot({ path: 'test-results/design-v3-accueil-1280.png', fullPage: true });
});
