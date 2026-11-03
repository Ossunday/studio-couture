import { expect, test, type Page } from '@playwright/test';

/** Design v3 : captures 1280 px comparées aux PNG de docs/maquette (test-results/, non commitées). */
async function verifierLargeur(page: import('@playwright/test').Page, etiquette: string) {
  const m = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(m.scrollWidth, `${etiquette} : ${m.scrollWidth} > ${m.innerWidth}`).toBeLessThanOrEqual(m.innerWidth);
}

async function connecter(page: Page) {
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
  await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
}

test('design v3 atelier et fiche : reproduction maquettes Atelier et Fiche à 1280 px', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await connecter(page);

  // Cliente de capture : mesures du pantalon complètes (82/100/27/105), fiche à 4 mesures sur 9.
  await page.getByRole('link', { name: 'Nouvelle cliente' }).click();
  await page.locator('input[name="nom"]').fill('Awa Design');
  await page.locator('input[name="telephone"]').fill('+225 07 10 50 49');
  await page.getByRole('button', { name: 'Créer la fiche cliente' }).click();
  await expect(page.getByRole('heading', { name: 'Awa Design' })).toBeVisible();
  await expect(page.getByText('cliente depuis', { exact: false })).toBeVisible();
  await expect(page.getByText('4 mesures sur 9')).toHaveCount(0); // pas encore de mesures

  const navFiche = page.getByRole('navigation', { name: 'Sections de la fiche cliente' });
  await navFiche.getByRole('link', { name: 'Mesures' }).click();
  await page.locator('input[name="tour_taille_cm"]').fill('82');
  await page.locator('input[name="tour_hanches_cm"]').fill('100');
  await page.locator('input[name="hauteur_fourche_cm"]').fill('27');
  await page.locator('input[name="longueur_pantalon_cm"]').fill('105');
  await page.getByRole('button', { name: 'Enregistrer les mensurations' }).click();
  await expect(page.getByText('Mensurations enregistrées et validées par la couturière.')).toBeVisible();
  await expect(page.getByText('4 mesures sur 9')).toBeVisible();

  // Patron enregistré depuis la fiche (mesures préremplies, rien à ressaisir).
  await page.getByRole('link', { name: 'Créer un patron pour Awa' }).first().click();
  await page.getByRole('link', { name: /Pantalon large/ }).click();
  await expect(page.getByRole('heading', { name: 'Salle d’essayage — Awa' })).toBeVisible();
  await page.locator('input[name="nom_patron"]').fill('Lin sable');
  await page.getByRole('button', { name: 'Enregistrer ce patron' }).click();
  await expect(page.getByText('Patron enregistré sur la fiche.')).toBeVisible();

  // Fiche, onglet Patrons (maquette Fiche).
  const carte = page.locator('.carte-patron', { hasText: 'Lin sable' });
  await expect(carte).toHaveCount(1);
  await expect(carte.getByText('Brouillon à valider', { exact: true })).toBeVisible();
  await expect(carte.getByText('Taille 82 · Hanches 100 · Fourche 27 · Long. 105')).toBeVisible();
  await expect(carte.locator('svg.miniature polygon').first()).toBeAttached();
  await expect(carte.getByRole('link', { name: 'Ouvrir dans la salle d’essayage' })).toBeVisible();
  await expect(carte.getByRole('link', { name: 'Télécharger le PDF A4 1:1' })).toBeVisible();
  await expect(page.getByText('Nouveau patron pour Awa')).toBeVisible();
  await expect(page.getByText('Ses mesures sont déjà enregistrées, rien à ressaisir.')).toBeVisible();
  // Capture sans le bandeau de confirmation transitoire.
  const urlFiche = new URL(page.url());
  urlFiche.search = '?onglet=patrons';
  await page.goto(urlFiche.toString());
  await expect(page.locator('.carte-patron', { hasText: 'Lin sable' })).toHaveCount(1);
  await verifierLargeur(page, 'fiche v3 1280');
  await page.screenshot({ path: 'test-results/design-v3-fiche-1280.png', fullPage: true });

  // Tableau de bord (maquette Atelier).
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Bonjour,/ })).toBeVisible();
  await expect(page.getByText('À faire en priorité')).toBeVisible();
  await expect(page.getByText('4 mesures sur 9').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Clientes récentes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Derniers patrons' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Patrons à valider/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Dernier patron — Awa/ })).toBeVisible();
  const dernier = page.getByRole('img', { name: /Patron du pantalon, brouillon à valider/ }).last();
  await expect(dernier.getByText('Ceinture 89 cm', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Créer un patron/ }).first()).toBeVisible();
  await verifierLargeur(page, 'atelier v3 1280');
  await page.screenshot({ path: 'test-results/design-v3-atelier-1280.png', fullPage: true });
});

test('design v3 salle : reproduction maquettes Salle et Salle3d à 1280 px et 390 px', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await connecter(page);

  // Cliente de capture (82/100/27/105, comme la maquette).
  await page.getByRole('link', { name: 'Nouvelle cliente' }).click();
  await page.locator('input[name="nom"]').fill('Awa Salle');
  await page.locator('input[name="telephone"]').fill('+225 07 10 50 50');
  await page.getByRole('button', { name: 'Créer la fiche cliente' }).click();
  await expect(page.getByRole('heading', { name: 'Awa Salle' })).toBeVisible();
  const navFiche = page.getByRole('navigation', { name: 'Sections de la fiche cliente' });
  await navFiche.getByRole('link', { name: 'Mesures' }).click();
  await page.locator('input[name="tour_taille_cm"]').fill('82');
  await page.locator('input[name="tour_hanches_cm"]').fill('100');
  await page.locator('input[name="hauteur_fourche_cm"]').fill('27');
  await page.locator('input[name="longueur_pantalon_cm"]').fill('105');
  await page.getByRole('button', { name: 'Enregistrer les mensurations' }).click();
  await expect(page.getByText('Mensurations enregistrées et validées par la couturière.')).toBeVisible();

  await page.getByRole('link', { name: 'Créer un patron pour Awa' }).first().click();
  await page.getByRole('link', { name: /Pantalon large/ }).click();
  await expect(page.getByRole('heading', { name: 'Salle d’essayage — Awa' })).toBeVisible();

  // Vue 1 (défaut) : onglets, chip brouillon, PatronCote coté, encart « fait foi ».
  await expect(page.getByRole('tab', { name: '1 · Patron à plat' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: '2 · Vue 3D (aperçu)' })).toHaveAttribute('aria-selected', 'false');
  await expect(page.getByText('Brouillon non validé', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vos mesures' })).toBeVisible();
  await expect(page.getByText('Fiche d’Awa', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tissu' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Votre patron' })).toBeVisible();
  const patron = page.getByRole('img', { name: /Patron du pantalon, brouillon à valider/ });
  await expect(patron).toBeVisible();
  await expect(patron.getByText('Ceinture 89 cm', { exact: true })).toBeVisible();
  await expect(patron.getByText('Taille 82 cm', { exact: true }).first()).toBeVisible();
  await expect(patron.getByText('Hanches 100 cm', { exact: true }).first()).toBeVisible();
  await expect(patron.getByText('Bas 35,8 cm', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Le patron à plat fait foi')).toBeVisible();
  await expect(page.getByText('Imprimez-le à l’échelle 1:1 et vérifiez le carré de 10 cm avant de couper.')).toBeVisible();
  await expect(page.getByText('Devant ×2 · bas 35,8')).toBeVisible();
  await expect(page.getByText('Dos ×2 · bas 35,8')).toBeVisible();
  await expect(page.getByText('Ceinture ×1 · 89 cm')).toBeVisible();
  await verifierLargeur(page, 'salle v3 1280');
  await page.screenshot({ path: 'test-results/design-v3-salle-1280.png', fullPage: true });

  // Le curseur de taille met à jour le patron à plat en direct (89 cm → autre ceinture).
  await page.getByLabel('Curseur Tour de taille').fill('90');
  await expect(patron.getByText(/Ceinture 9\d cm/).first()).toBeVisible();
  await expect(page.locator('#live-tour_taille_cm')).toHaveValue('90');
  await page.getByLabel('Curseur Tour de taille').fill('82');
  await expect(patron.getByText('Ceinture 89 cm', { exact: true })).toBeVisible();

  // Vue 2 : 3D indicative, loupe du tissu, planche 3 images.
  await page.getByRole('tab', { name: '2 · Vue 3D (aperçu)' }).click();
  await expect(page.getByText('Aperçu indicatif · le patron à plat fait foi')).toBeVisible();
  await expect(page.locator('.scene-essayage canvas').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Denim · Bleu denim')).toBeVisible();
  await expect(page.locator('img[data-vue]')).toHaveCount(3, { timeout: 20_000 });
  await expect(page.getByText('Volume généré à partir des cotes du patron, pas une simulation de drapé.')).toBeVisible();
  await page.screenshot({ path: 'test-results/design-v3-salle3d-1280.png', fullPage: true });

  // Retour à la vue 1, puis captures mobiles des deux vues.
  await page.getByRole('tab', { name: '1 · Patron à plat' }).click();
  await expect(page.getByText('Le patron à plat fait foi')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await verifierLargeur(page, 'salle v3 390');
  await page.screenshot({ path: 'test-results/design-v3-salle-390.png', fullPage: true });
  await page.getByRole('tab', { name: '2 · Vue 3D (aperçu)' }).click();
  await expect(page.getByText('Aperçu indicatif · le patron à plat fait foi')).toBeVisible();
  await verifierLargeur(page, 'salle3d v3 390');
  await page.screenshot({ path: 'test-results/design-v3-salle3d-390.png', fullPage: true });
});

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
