import { expect, test, type Page } from '@playwright/test';

/**
 * Assistant IA (phase 11) en mode démo mémoire — aucun réseau, aucune clé :
 * la carte est visible dès « Créer un patron pour <cliente> », annonce
 * « Assistant bientôt disponible », l’Audio est désactivé « Bientôt
 * disponible », et le choix manuel juste dessous fonctionne normalement.
 * Les options préremplies par l’URL (lien « Utiliser ces réglages ») arrivent
 * dans la salle, modifiables.
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

async function creerClienteAvecMesures(page: Page, nom: string) {
  await page.getByRole('link', { name: 'Nouvelle cliente' }).click();
  await page.locator('input[name="nom"]').fill(nom);
  await page.locator('input[name="telephone"]').fill('+22996222222');
  await page.getByRole('button', { name: 'Créer la fiche cliente' }).click();
  await expect(page.getByRole('heading', { name: nom })).toBeVisible();
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Mesures' }).click();
  for (const [code, valeur] of Object.entries(MESURES_COMMUNES)) {
    await page.locator(`input[name="${code}"]`).fill(valeur);
  }
  await page.getByRole('button', { name: 'Enregistrer les mensurations' }).click();
  await expect(page.getByText('Mensurations enregistrées et validées par la couturière.')).toBeVisible();
}

test('assistant IA — carte visible, bientôt disponible en mode mémoire, choix manuel intact, options préremplies', async ({ page }) => {
  await connecter(page);
  await creerClienteAvecMesures(page, 'Cliente Assistant E2E');
  const idCliente = new URL(page.url()).pathname.split('/').filter(Boolean).pop() ?? '';

  await page.getByRole('link', { name: 'Créer un patron pour Cliente' }).first().click();
  await expect(page.getByRole('heading', { name: 'Créer un patron pour Cliente' })).toBeVisible();

  // La carte Assistant est au-dessus du choix de modèle.
  const carte = page.locator('.assistant');
  await expect(carte.getByRole('heading', { name: 'Assistant' })).toBeVisible();
  await expect(carte.getByText('Assistant bientôt disponible')).toBeVisible();
  await expect(carte.getByRole('button', { name: 'Décrire' })).toBeVisible();
  await expect(carte.getByRole('button', { name: 'Photo' })).toBeVisible();
  const audio = carte.getByRole('button', { name: /Audio/ });
  await expect(audio).toBeDisabled();
  await expect(audio).toContainText('Bientôt disponible');

  // Onglet Photo : le consentement est affiché, l’envoi reste désactivé.
  await carte.getByRole('button', { name: 'Photo' }).click();
  await expect(carte.getByText(/envoyée à un modèle d’IA de Meta/)).toBeVisible();
  await expect(carte.getByText(/N’envoyez pas de photo d’une cliente/)).toBeVisible();
  await expect(carte.getByRole('button', { name: 'Analyser la photo' })).toBeDisabled();

  // Le choix manuel, juste dessous, garde l’ordre du registre et fonctionne.
  await expect(page.locator('.carte-modele strong')).toHaveText(['Pantalon large', 'Robe fourreau', 'Jupe droite']);
  await page.locator('a.carte-modele[href$="modele=jupe_droite"]').click();
  await expect(page.getByRole('heading', { name: /Salle d’essayage — Cliente/ })).toBeVisible();

  // « Utiliser ces réglages » : les options d’URL arrivent préremplies en salle.
  await page.goto(`/clientes/${idCliente}/patron/nouveau?modele=pantalon_large&largeur_bas_cm=36&profondeur_pli_cm=5`);
  await expect(page.getByRole('heading', { name: /Salle d’essayage — Cliente/ })).toBeVisible();
  await expect(page.locator('input[name="largeur_bas_cm"]')).toHaveValue('36');
  await expect(page.locator('input[name="profondeur_pli_cm"]')).toHaveValue('5');

  await page.goto(`/clientes/${idCliente}/patron/nouveau?modele=robe_fourreau&encolure=fendue_v&manches=manche_courte`);
  await expect(page.locator('input[name="encolure"][value="fendue_v"]')).toBeChecked();
  await expect(page.locator('input[name="manches"][value="manche_courte"]')).toBeChecked();
});
