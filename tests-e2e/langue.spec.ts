import { expect, test, type Page } from '@playwright/test';

/** Phase 10 : site bilingue FR/EN. Français par défaut, pastille drapeau + code (FR ⇄ ENG), aucun texte français résiduel en anglais. */

const TEMOINS_FRANCAIS = [
  'Mesurez-la une fois',
  'Brouillon non validé',
  'Choisir le modèle',
  'Voir mon patron',
  'Salle d’essayage',
  'Se connecter',
  'Mot de passe',
  'Télécharger le PDF',
  'Mesures préremplies'
];

async function sansDebordement(page: Page, etiquette: string) {
  const m = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  expect(m.scrollWidth, `${etiquette} : ${m.scrollWidth} > ${m.innerWidth}`).toBeLessThanOrEqual(m.innerWidth);
}

async function aucunFrancais(page: Page, etiquette: string) {
  const texte = await page.locator('body').innerText();
  for (const temoin of TEMOINS_FRANCAIS) {
    expect(texte, `${etiquette} : texte français résiduel « ${temoin} »`).not.toContain(temoin);
  }
}

async function passerEnAnglais(page: Page) {
  const pastille = page.locator('.langue-bascule').first();
  await expect(pastille).toContainText('FR');
  await page.getByRole('button', { name: 'English' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.langue-bascule').first()).toContainText('ENG');
}

test('langue : français par défaut, passage en anglais sans rechargement parasite, persistance, retour au français', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByRole('heading', { name: /Mesurez-la une fois/ })).toBeVisible();

  await passerEnAnglais(page);
  await expect(page.getByRole('heading', { name: /Measure her once/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'See my first pattern' })).toBeVisible();
  await aucunFrancais(page, 'accueil EN');
  await sansDebordement(page, 'accueil EN 1280');

  // Persistance après rechargement complet.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: /Measure her once/ })).toBeVisible();

  // Retour au français : même pastille, elle réaffiche FR.
  await page.getByRole('button', { name: 'Français' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('.langue-bascule').first()).toContainText('FR');
  await expect(page.getByRole('heading', { name: /Mesurez-la une fois/ })).toBeVisible();
});

test('langue : accueil, démo, connexion, inscription et salle d’essayage entièrement en anglais', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await passerEnAnglais(page);

  // Connexion
  await page.goto('/connexion');
  await expect(page.locator('.langue-bascule').first()).toContainText('ENG');
  await expect(page.getByRole('heading', { name: 'Log in to your workshop' })).toBeVisible();
  await aucunFrancais(page, 'connexion EN');
  await sansDebordement(page, 'connexion EN 1280');
  await page.screenshot({ path: 'test-results/langue-connexion-1280-en.png', fullPage: true });

  // Inscription
  await page.goto('/inscription');
  await expect(page.locator('.langue-bascule').first()).toContainText('ENG');
  await expect(page.getByRole('heading', { name: 'Open your workshop in 2 minutes' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create my workshop' })).toBeVisible();
  await aucunFrancais(page, 'inscription EN');
  await sansDebordement(page, 'inscription EN 1280');
  await page.screenshot({ path: 'test-results/langue-inscription-1280-en.png', fullPage: true });

  // Démo guidée jusqu’à la salle d’essayage
  await page.goto('/demo');
  await expect(page.locator('.langue-bascule').first()).toContainText('ENG');
  await expect(page.getByRole('heading', { name: 'Guided demo' })).toBeVisible();
  await expect(page.getByText('Unvalidated draft')).toBeVisible();
  await page.getByRole('button', { name: 'Choose the wide-leg trousers' }).click();
  await page.getByRole('button', { name: 'Medium', exact: true }).click();
  await expect(page.locator('input[name="tour_taille_cm"]')).toHaveValue('82');
  await page.getByRole('button', { name: 'See my pattern' }).click();
  await expect(page.locator('section[aria-label="Your pattern"]')).toBeVisible();
  await aucunFrancais(page, 'salle d’essayage EN');
  await sansDebordement(page, 'salle EN 1280');
  await page.screenshot({ path: 'test-results/langue-salle-1280-en.png', fullPage: true });
});

test('langue : captures 1280 et 390 px dans les deux langues, aucun débordement horizontal', async ({ page }) => {
  const pages: Array<[string, string]> = [
    ['accueil', '/'],
    ['demo', '/demo'],
    ['connexion', '/connexion'],
    ['inscription', '/inscription']
  ];
  for (const largeur of [1280, 390]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    // Français d’abord
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    for (const [nom, chemin] of pages) {
      await page.goto(chemin);
      await sansDebordement(page, `${nom} FR ${largeur}`);
      await page.screenshot({ path: `test-results/langue-${nom}-${largeur}-fr.png`, fullPage: true });
    }
    // Puis anglais
    await page.goto('/');
    await passerEnAnglais(page);
    for (const [nom, chemin] of pages) {
      await page.goto(chemin);
      await sansDebordement(page, `${nom} EN ${largeur}`);
      await aucunFrancais(page, `${nom} EN ${largeur}`);
      await page.screenshot({ path: `test-results/langue-${nom}-${largeur}-en.png`, fullPage: true });
    }
    // Retour au français pour la largeur suivante
    await page.goto('/');
    await page.getByRole('button', { name: 'Français' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  }
});
