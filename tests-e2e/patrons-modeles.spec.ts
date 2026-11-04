import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * Parcours « Créer un patron pour une cliente » paramétré par modèle :
 * les trois modèles du registre (pantalon large, robe fourreau, jupe droite)
 * ont exactement le même parcours — choix, salle d’essayage avec aperçu,
 * enregistrement sur la fiche, PDF — et un refus de génération (formules
 * « à valider ») réaffiche un formulaire de correction, jamais un écran vide.
 */

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

/** Mesures compatibles avec les trois modèles (morphologie « Moyenne »). */
const MESURES_COMMUNES: Record<string, string> = {
  tour_poitrine_cm: '92',
  tour_taille_cm: '76',
  tour_hanches_cm: '100',
  longueur_dos_cm: '40',
  largeur_epaules_cm: '38',
  longueur_jupe_cm: '60',
  longueur_robe_cm: '100',
  hauteur_fourche_cm: '27',
  longueur_pantalon_cm: '105'
};

async function creerClienteAvecMesures(page: Page, nom: string, mesures: Record<string, string>) {
  await page.getByRole('link', { name: 'Nouvelle cliente' }).click();
  await page.locator('input[name="nom"]').fill(nom);
  await page.locator('input[name="telephone"]').fill('+22996222222');
  await page.getByRole('button', { name: 'Créer la fiche cliente' }).click();
  await expect(page.getByRole('heading', { name: nom })).toBeVisible();
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Mesures' }).click();
  for (const [code, valeur] of Object.entries(mesures)) {
    await page.locator(`input[name="${code}"]`).fill(valeur);
  }
  await page.getByRole('button', { name: 'Enregistrer les mensurations' }).click();
  await expect(page.getByText('Mensurations enregistrées et validées par la couturière.')).toBeVisible();
}

const MODELES = [
  { id: 'pantalon_large', titre: 'Pantalon large', nomPatron: 'Pantalon trois modeles E2E' },
  { id: 'robe_fourreau', titre: 'Robe fourreau', nomPatron: 'Robe trois modeles E2E' },
  { id: 'jupe_droite', titre: 'Jupe droite', nomPatron: 'Jupe trois modeles E2E' }
] as const;

for (const modele of MODELES) {
  test(`créer un patron cliente — ${modele.titre} : choix, salle, enregistrement, PDF`, async ({ page }) => {
    await connecter(page);
    await creerClienteAvecMesures(page, `Cliente ${modele.titre} E2E`, MESURES_COMMUNES);

    // Choix du modèle : ordre du registre — pantalon, robe, jupe.
    await page.getByRole('link', { name: 'Créer un patron pour Cliente' }).first().click();
    await expect(page.getByRole('heading', { name: 'Créer un patron pour Cliente' })).toBeVisible();
    await expect(page.locator('.carte-modele strong')).toHaveText(['Pantalon large', 'Robe fourreau', 'Jupe droite']);
    await page.locator(`a.carte-modele[href$="modele=${modele.id}"]`).click();

    // Mesures complètes dans la fiche : la salle s’ouvre directement, avec l’aperçu du patron.
    await expect(page.getByRole('heading', { name: /Salle d’essayage — Cliente/ })).toBeVisible();
    await expect(page.getByRole('img', { name: /patron/i }).first()).toBeVisible();
    await expect(page.locator('#live-tour_taille_cm')).toHaveValue('76');
    await expect(page.locator('#live-tour_hanches_cm')).toHaveValue('100');

    // Enregistrement sur la fiche.
    await page.locator('input[name="nom_patron"]').fill(modele.nomPatron);
    await page.getByRole('button', { name: 'Enregistrer ce patron' }).click();
    await expect(page.getByText('Patron enregistré sur la fiche.')).toBeVisible();
    const carte = page.locator('.carte-patron', { hasText: modele.nomPatron });
    await expect(carte).toHaveCount(1);
    await expect(carte.locator('strong').first()).toContainText(modele.titre);
    await expect(carte.locator('svg').first()).toBeAttached();

    // PDF du patron enregistré : le fichier commence bien par %PDF.
    const attenteTelechargement = page.waitForEvent('download');
    await carte.getByRole('link', { name: 'Télécharger le PDF A4 1:1' }).click();
    const telechargement = await attenteTelechargement;
    const cheminPdf = await telechargement.path();
    expect(cheminPdf).toBeTruthy();
    const contenuPdf = await readFile(cheminPdf!);
    expect(contenuPdf.subarray(0, 4).toString('latin1')).toBe('%PDF');
  });
}

test('créer un patron cliente — mesures refusées par la génération : formulaire de correction, jamais un écran vide', async ({ page }) => {
  await connecter(page);
  // Hanches très inférieures à la taille : la jupe (comme la robe) refuse de
  // générer. Avant correction, la page n’affichait que le bandeau et le pied.
  await creerClienteAvecMesures(page, 'Cliente Correction E2E', {
    ...MESURES_COMMUNES,
    tour_taille_cm: '120',
    tour_hanches_cm: '90'
  });

  await page.getByRole('link', { name: 'Créer un patron pour Cliente' }).first().click();
  await page.getByRole('link', { name: /Jupe droite/ }).click();

  // Le formulaire COMPLET du modèle est réaffiché, prérempli, avec l’erreur.
  await expect(page.locator('main form[action="?/completerMesures"]')).toBeVisible();
  await expect(page.locator('main [role="alert"]').first()).toBeVisible();
  await expect(page.locator('input[name="tour_taille_cm"]')).toHaveValue('120');
  await expect(page.locator('input[name="tour_hanches_cm"]')).toHaveValue('90');
  await expect(page.locator('input[name="longueur_jupe_cm"]')).toHaveValue('60');

  // Correction puis continuation : la salle s’ouvre, comme pour le pantalon.
  await page.locator('input[name="tour_hanches_cm"]').fill('130');
  await page.getByRole('button', { name: 'Continuer vers la salle d’essayage' }).click();
  await expect(page.getByRole('heading', { name: /Salle d’essayage — Cliente/ })).toBeVisible();
  await expect(page.locator('#live-tour_hanches_cm')).toHaveValue('130');
});

test('ordre des modèles sur la démo publique : pantalon, robe, jupe', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.locator('article h3')).toHaveText(['Pantalon large', 'Robe fourreau', 'Jupe droite']);
});
