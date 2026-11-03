import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function verifierLargeur(page: import('@playwright/test').Page, etiquette: string) {
  const m = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(m.scrollWidth, `${etiquette} : ${m.scrollWidth} > ${m.innerWidth}`).toBeLessThanOrEqual(m.innerWidth);
}

test('démo guidée publique : 4 étapes sans compte, patron zoomable et PDF %PDF', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Mesurez-la une fois/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Voir mon premier patron/ })).toBeVisible();
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

test('3D : canvas présent et non vide, étiquette honnête, captures 360/768/1280', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); // vue de face stable pour les captures (rotation auto coupée)
  for (const largeur of [360, 768, 1280]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await allerSalle(page);
    await page.getByRole('button', { name: 'Vue 3D' }).click();
    const canvas = page.getByTestId('scene-3d-canvas');
    await expect(canvas).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Volume généré à partir des cotes du patron — pas une simulation de drapé.')).toBeVisible();
    await page.waitForTimeout(600);
    const pixels = await canvas.evaluate((c: HTMLCanvasElement) => {
      const copie = document.createElement('canvas');
      copie.width = 64; copie.height = 64;
      const contexte = copie.getContext('2d')!;
      contexte.drawImage(c, 0, 0, 64, 64);
      const donnees = contexte.getImageData(0, 0, 64, 64).data;
      let nonTransparents = 0;
      const couleurs = new Set<string>();
      for (let i = 0; i < donnees.length; i += 4) {
        if (donnees[i + 3]! > 0) {
          nonTransparents++;
          couleurs.add(`${donnees[i]! >> 4},${donnees[i + 1]! >> 4},${donnees[i + 2]! >> 4}`);
        }
      }
      return { nonTransparents, url: c.toDataURL().length, couleurs: couleurs.size };
    });
    expect(pixels.nonTransparents, `canvas 3D vide à ${largeur} px`).toBeGreaterThan(100);
    expect(pixels.couleurs, `capture 3D trop pauvre en couleurs à ${largeur} px`).toBeGreaterThanOrEqual(12);
    expect(pixels.url).toBeGreaterThan(1000);
    await verifierLargeur(page, `3D ${largeur}`);
    await page.screenshot({ path: `test-results/demo-3-3d-${largeur}.png`, fullPage: true });
    await canvas.screenshot({ path: `test-results/demo-3-3d-element-${largeur}.png` });
  }
});

test('3D : repli propre sur le patron à plat quand WebGL est désactivé', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error simulation WebGL absent pour le test de repli
    HTMLCanvasElement.prototype.getContext = function (type: string, ...reste: unknown[]) {
      if (type === 'webgl2' || type === 'webgl') return null;
      // @ts-expect-error délégation au contexte d'origine
      return original.call(this, type, ...reste);
    };
  });
  await page.setViewportSize({ width: 360, height: 900 });
  await allerSalle(page);
  await page.getByRole('button', { name: 'Vue 3D' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'WebGL absent' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('img', { name: /Aperçu du patron brouillon/ })).toBeVisible();
  await expect(page.locator('img[data-vue]')).toHaveCount(0);
  await expect(page.getByText(/Aperçu en 3 images indisponible/)).toBeVisible();
  await verifierLargeur(page, 'repli 3D 360');
});

test('aperçu en 3 images : vignettes non uniformes, dialogue, PNG signé, régénération aux mesures, planche étape 4', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await allerSalle(page);
  await page.getByRole('button', { name: 'Vue 3D' }).click();
  await expect(page.getByTestId('scene-3d-canvas')).toBeVisible({ timeout: 20000 });
  const vignettes = page.locator('img[data-vue]');
  await expect(vignettes).toHaveCount(3, { timeout: 20000 });
  for (const cle of ['face', 'perspective', 'dos']) {
    const infos = await page.locator(`img[data-vue="${cle}"]`).evaluate(async (img: HTMLImageElement) => {
      await img.decode();
      const copie = document.createElement('canvas');
      copie.width = 32; copie.height = 40;
      const contexte = copie.getContext('2d')!;
      contexte.drawImage(img, 0, 0, 32, 40);
      const donnees = contexte.getImageData(0, 0, 32, 40).data;
      const couleurs = new Set<string>();
      for (let i = 0; i < donnees.length; i += 4) couleurs.add(`${donnees[i]! >> 4},${donnees[i + 1]! >> 4},${donnees[i + 2]! >> 4}`);
      return { largeur: img.naturalWidth, couleurs: couleurs.size };
    });
    expect(infos.largeur, `vignette ${cle} non décodée`).toBeGreaterThan(0);
    expect(infos.couleurs, `vignette ${cle} uniforme`).toBeGreaterThan(4);
  }
  // Dialogue accessible : ouverture, flèche droite, Échap
  const faceAvant = await page.locator('img[data-vue="face"]').getAttribute('src');
  await page.getByRole('button', { name: 'Agrandir la vue Face' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Vue suivante' }).click();
  await expect(page.locator('#titre-vue-agrandie')).toHaveText('Perspective');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  // PNG téléchargé : signature PNG
  const telechargement = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger l’aperçu (PNG)' }).first().click();
  const fichier = await telechargement;
  const chemin = await fichier.path();
  const octets = await readFile(chemin!);
  expect([...octets.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  // Changer une mesure régénère les images (débattement inclus)
  await page.locator('input[name="live-tour_taille_cm"]').fill('96');
  await expect.poll(async () => page.locator('img[data-vue="face"]').getAttribute('src'), { timeout: 15000 }).not.toBe(faceAvant);
  // Étape 4 : la planche en tête, capture dans test-results/
  await page.getByRole('button', { name: 'Voir le résultat et le PDF' }).click();
  await expect(page.getByRole('heading', { name: '4. Résultat' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Planche de l’aperçu/ })).toBeVisible({ timeout: 10000 });
  await verifierLargeur(page, 'planche étape 4 1280');
  await page.screenshot({ path: 'test-results/demo-4-planche-1280.png', fullPage: true });
});

test('aperçu en 3 images : vignettes en défilement interne à 360 px, document sans débordement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 360, height: 900 });
  await allerSalle(page);
  await page.getByRole('button', { name: 'Vue 3D' }).click();
  await expect(page.locator('img[data-vue]')).toHaveCount(3, { timeout: 20000 });
  await verifierLargeur(page, 'vignettes 360');
  await page.screenshot({ path: 'test-results/demo-3-vignettes-360.png', fullPage: true });
});

test('captures démo 360 px et 768 px : accueil et chaque étape (test-results/, non commitées)', async ({ page }) => {
  for (const largeur of [360, 768]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Mesurez-la une fois/ })).toBeVisible();
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
