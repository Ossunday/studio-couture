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

  // Écran 1 — accueil public, puis modèle dans l'espace atelier connecté.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Votre patron sur mesure, en 2 minutes' })).toBeVisible();
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

test('captures patron 360 px et 768 px pour les 3 morphologies (test-results/, non commitées)', async ({ page }) => {
  await connecter(page);
  const jeux = [
    { nom: 'petite', taille: 64, hanches: 88, fourche: 24, longueur: 96 },
    { nom: 'moyenne', taille: 82, hanches: 100, fourche: 27, longueur: 105 },
    { nom: 'forte', taille: 110, hanches: 128, fourche: 31, longueur: 108 }
  ];
  for (const j of jeux) {
    const url = `/patron/apercu?modele=pantalon_large&nom=${j.nom}&tour_taille_cm=${j.taille}&tour_hanches_cm=${j.hanches}&hauteur_fourche_cm=${j.fourche}&longueur_pantalon_cm=${j.longueur}`;
    for (const largeur of [360, 768]) {
      await page.setViewportSize({ width: largeur, height: 900 });
      await page.goto(url);
      await expect(page.getByRole('heading', { name: 'Mesures du patron' })).toBeVisible();
      await expect(page.getByText('Entrejambe', { exact: false }).first()).toBeVisible();
      await page.screenshot({ path: `test-results/patron-apercu-${j.nom}-${largeur}.png`, fullPage: true });
    }
  }
});

test('360 px : aucun débordement horizontal de page (accueil, mesures, aperçu)', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await connecter(page);
  const urls = [
    '/',
    '/patron/mesures?modele=pantalon_large',
    '/patron/apercu?modele=pantalon_large&nom=moyenne&tour_taille_cm=82&tour_hanches_cm=100&hauteur_fourche_cm=27&longueur_pantalon_cm=105'
  ];
  for (const url of urls) {
    await page.goto(url);
    const mesure = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    expect(mesure.scrollWidth, `${url} : ${mesure.scrollWidth} > ${mesure.innerWidth}`).toBeLessThanOrEqual(mesure.innerWidth);
  }
  // Le dessin reste lisible : son cadre fait environ 700 px dans un conteneur défilant.
  const cadre = page.locator('.patron-cadre');
  await expect(cadre).toBeVisible();
  const largeurCadre = await cadre.evaluate((el) => el.clientWidth);
  expect(largeurCadre).toBeGreaterThanOrEqual(690);
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
