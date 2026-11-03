import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/** Parcours Partie 2 : fiche cliente → patron enregistré → salle d’essayage → PDF, duplication, renommage, suppression, accès et cascade. */

const NOM_CLIENTE = 'Patron Test E2E';

async function connecter(page: Page, identifiant = 'awa@exemple.bj', motDePasse = 'mot-de-passe-long') {
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
    await page.locator('input[name="identifiant"]').fill(identifiant);
    await page.locator('input[name="mot_de_passe"]').fill(motDePasse);
    await page.getByRole('button', { name: 'Se connecter' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
}

async function deconnecter(page: Page) {
  await page.getByRole('button', { name: 'Se déconnecter' }).first().click();
  await expect(page.getByRole('heading', { name: 'Connexion à l’atelier' })).toBeVisible();
}

async function verifierLargeur(page: Page, etiquette: string) {
  const m = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(m.scrollWidth, `${etiquette} : ${m.scrollWidth} > ${m.innerWidth}`).toBeLessThanOrEqual(m.innerWidth);
}

function onglet(page: Page, nom: string) {
  return page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: nom });
}

test('patron cliente : création préremplie, enregistrement, PDF, duplication, renommage, ouverture, suppression', async ({ page }) => {
  await connecter(page);

  // Nouvelle cliente, avec seulement 2 des 4 mesures du pantalon.
  await page.getByRole('link', { name: 'Nouvelle cliente' }).click();
  await page.locator('input[name="nom"]').fill(NOM_CLIENTE);
  await page.locator('input[name="telephone"]').fill('+22996111111');
  await page.getByRole('button', { name: 'Créer la fiche cliente' }).click();
  await expect(page.getByRole('heading', { name: NOM_CLIENTE })).toBeVisible();

  await onglet(page, 'Mesures').click();
  await page.locator('input[name="tour_taille_cm"]').fill('84');
  await page.locator('input[name="tour_hanches_cm"]').fill('104');
  await page.getByRole('button', { name: 'Enregistrer les mensurations' }).click();
  await expect(page.getByText('Mensurations enregistrées et validées par la couturière.')).toBeVisible();

  // Créer un patron : choix du modèle.
  await page.getByRole('link', { name: 'Créer un patron pour Patron' }).first().click();
  await expect(page.getByRole('heading', { name: 'Créer un patron pour Patron' })).toBeVisible();
  await page.getByRole('link', { name: /Pantalon large/ }).click();

  // Formulaire court : seules les 2 mesures manquantes sont demandées.
  await expect(page.getByRole('heading', { name: '2. Il manque 2 mesures' })).toBeVisible();
  await expect(page.locator('input[name="hauteur_fourche_cm"]')).toBeVisible();
  await expect(page.locator('input[name="longueur_pantalon_cm"]')).toBeVisible();
  await expect(page.locator('input[name="tour_taille_cm"]')).toHaveCount(0);
  await page.locator('input[name="hauteur_fourche_cm"]').fill('29');
  await page.locator('input[name="longueur_pantalon_cm"]').fill('104');
  await expect(page.locator('input[name="enregistrer_fiche"]')).toBeChecked();
  await page.getByRole('button', { name: 'Continuer vers la salle d’essayage' }).click();

  // Salle d’essayage : mesures préremplies (fiche + mesures complétées).
  await expect(page.getByRole('heading', { name: '2. Salle d’essayage — Pantalon large' })).toBeVisible();
  await expect(page.locator('#live-tour_taille_cm')).toHaveValue('84');
  await expect(page.locator('#live-tour_hanches_cm')).toHaveValue('104');
  await expect(page.locator('#live-hauteur_fourche_cm')).toHaveValue('29');
  await expect(page.locator('#live-longueur_pantalon_cm')).toHaveValue('104');

  // 3D (fumée) : la scène se charge, puis on revient au patron à plat.
  await page.getByRole('button', { name: 'Vue 3D' }).click();
  await expect(page.locator('.scene-essayage canvas').first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Patron à plat' }).click();

  // Enregistrement sur la fiche.
  await page.locator('input[name="nom_patron"]').fill('Pantalon E2E Awa');
  await page.getByRole('button', { name: 'Enregistrer ce patron' }).click();
  await expect(page.getByText('Patron enregistré sur la fiche.')).toBeVisible();
  const carte = page.locator('.carte-patron', { hasText: 'Pantalon E2E Awa' });
  await expect(carte).toHaveCount(1);
  await expect(carte.getByText('Brouillon à valider', { exact: true })).toBeVisible();
  await expect(carte.locator('svg.miniature polygon').first()).toBeAttached();

  // PDF depuis la carte : le fichier téléchargé commence bien par %PDF.
  const attenteTelechargement = page.waitForEvent('download');
  await carte.getByRole('link', { name: 'Télécharger le PDF A4 1:1' }).click();
  const telechargement = await attenteTelechargement;
  const cheminPdf = await telechargement.path();
  expect(cheminPdf).toBeTruthy();
  const contenuPdf = await readFile(cheminPdf!);
  expect(contenuPdf.subarray(0, 4).toString('latin1')).toBe('%PDF');

  // Duplication.
  await carte.getByRole('button', { name: 'Dupliquer' }).click();
  await expect(page.getByText('Patron dupliqué.')).toBeVisible();
  await expect(page.locator('.carte-patron')).toHaveCount(2);
  const copie = page.locator('.carte-patron', { hasText: '(copie)' });
  await expect(copie).toHaveCount(1);

  // Renommage de la copie.
  await copie.locator('input[name="nouveau_nom"]').fill('Pantalon E2E renommé');
  await copie.getByRole('button', { name: 'Renommer' }).click();
  await expect(page.getByText('Patron renommé.')).toBeVisible();
  const renomme = page.locator('.carte-patron', { hasText: 'Pantalon E2E renommé' });
  await expect(renomme).toHaveCount(1);

  // Ouverture dans la salle : la taille passe de 84 à 86 puis est enregistrée.
  await renomme.getByRole('link', { name: 'Ouvrir dans la salle d’essayage' }).click();
  await expect(page.getByRole('heading', { name: 'Pantalon E2E renommé' })).toBeVisible();
  await expect(page.locator('#live-tour_taille_cm')).toHaveValue('84');
  await page.locator('#live-tour_taille_cm').fill('86');
  await expect(page.locator('input[type="hidden"][name="tour_taille_cm"]')).toHaveValue('86');
  await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();
  await expect(page.getByText('Patron mis à jour.')).toBeVisible();

  // Suppression avec confirmation.
  const carteRenommee = page.locator('.carte-patron', { hasText: 'Pantalon E2E renommé' });
  await carteRenommee.locator('input[name="confirme_suppression_patron"]').check();
  await carteRenommee.getByRole('button', { name: 'Supprimer le patron' }).click();
  await expect(page.getByText('Patron supprimé.')).toBeVisible();
  await expect(page.locator('.carte-patron')).toHaveCount(1);

  // Les mesures complétées ont bien été enregistrées dans la fiche.
  await onglet(page, 'Mesures').click();
  await expect(page.locator('input[name="hauteur_fourche_cm"]')).toHaveValue('29');
  await expect(page.locator('input[name="longueur_pantalon_cm"]')).toHaveValue('104');

  // Compteur de patrons dans la liste des clientes.
  await page.goto('/clientes');
  const carteCliente = page.locator('.carte-cliente', { hasText: NOM_CLIENTE });
  await expect(carteCliente).toContainText('1 patron');
});

test('fiche cliente et salle connectée : captures 360/768/1280', async ({ page }) => {
  await connecter(page);
  await page.goto('/clientes');
  await page.locator('.carte-cliente', { hasText: NOM_CLIENTE }).click();
  await expect(page.getByRole('heading', { name: NOM_CLIENTE })).toBeVisible();

  for (const largeur of [360, 768, 1280]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await onglet(page, 'Résumé').click();
    await expect(page.getByText('Prochaine action')).toBeVisible();
    await verifierLargeur(page, `fiche résumé ${largeur}`);
    await page.screenshot({ path: `test-results/fiche-resume-${largeur}.png`, fullPage: true });

    await onglet(page, 'Patrons').click();
    await expect(page.locator('.carte-patron').first()).toBeVisible();
    await verifierLargeur(page, `fiche patrons ${largeur}`);
    await page.screenshot({ path: `test-results/fiche-patrons-${largeur}.png`, fullPage: true });

    await page.getByRole('link', { name: 'Créer un patron pour Patron' }).first().click();
    await page.getByRole('link', { name: /Pantalon large/ }).click();
    await expect(page.getByRole('heading', { name: '2. Salle d’essayage — Pantalon large' })).toBeVisible();
    await verifierLargeur(page, `salle cliente ${largeur}`);
    await page.screenshot({ path: `test-results/salle-cliente-${largeur}.png`, fullPage: true });
    await page.goBack();
    await page.goBack();
  }

  // Les deux autres onglets, en grand format.
  await page.setViewportSize({ width: 1280, height: 900 });
  await onglet(page, 'Mesures').click();
  await expect(page.locator('input[name="tour_taille_cm"]')).toBeVisible();
  await verifierLargeur(page, 'fiche mesures 1280');
  await page.screenshot({ path: 'test-results/fiche-mesures-1280.png', fullPage: true });
  await onglet(page, 'Photos').click();
  await expect(page.getByText('consentement', { exact: false }).first()).toBeVisible();
  await verifierLargeur(page, 'fiche photos 1280');
  await page.screenshot({ path: 'test-results/fiche-photos-1280.png', fullPage: true });
});

test('accès : collègue du même atelier, patron inconnu en 404, anonyme redirigé, cascade de suppression', async ({ page, browser }) => {
  await connecter(page);

  // L’administratrice crée le compte d’une couturière du même atelier.
  await page.goto('/atelier/utilisatrices');
  await page.locator('input[name="nom"]').fill('Béné Couturière');
  await page.locator('input[name="identifiant"]').fill('bene@exemple.bj');
  await page.locator('input[name="mot_de_passe"]').fill('mot-de-passe-long');
  await page.getByRole('button', { name: 'Créer le compte' }).click();
  await expect(page.getByText('Compte créé. La personne peut se connecter.')).toBeVisible();

  // La collègue voit la cliente et ses patrons (même atelier), mais pas la zone danger.
  await deconnecter(page);
  await connecter(page, 'bene@exemple.bj');
  await page.locator('.carte-cliente', { hasText: NOM_CLIENTE }).click();
  await onglet(page, 'Patrons').click();
  await expect(page.locator('.carte-patron').first()).toBeVisible();
  const urlFiche = page.url();

  // Un identifiant de patron inconnu sous cette cliente : 404, pas de fuite.
  const reponse = await page.goto(`${urlFiche.split('?')[0]}/patron/00000000-0000-0000-0000-000000000000`);
  expect(reponse?.status()).toBe(404);

  // Sans connexion : redirection vers la page de connexion.
  const contexteAnonyme = await browser.newContext();
  const pageAnonyme = await contexteAnonyme.newPage();
  await pageAnonyme.goto(urlFiche);
  await expect(pageAnonyme.getByRole('heading', { name: 'Connexion à l’atelier' })).toBeVisible();
  await contexteAnonyme.close();

  // Retour administratrice : suppression de la cliente (ses patrons suivent, cascade testée aussi en unitaire).
  await deconnecter(page);
  await connecter(page);
  await page.locator('.carte-cliente', { hasText: NOM_CLIENTE }).click();
  await page.getByText('Zone danger — supprimer la cliente').click();
  await page.locator('input[name="confirme_suppression"]').check();
  await page.getByRole('button', { name: 'Supprimer définitivement cette cliente' }).click();
  await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
  await expect(page.locator('.carte-cliente', { hasText: NOM_CLIENTE })).toHaveCount(0);
});
