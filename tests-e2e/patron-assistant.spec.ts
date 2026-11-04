import { expect, test, type Page } from '@playwright/test';

/**
 * Assistant IA flottant (phases 11 et 12) en mode démo mémoire — aucun
 * réseau, aucune clé : le bouton rond « AI » est visible sur toutes les
 * pages connectées (tableau de bord compris), la boîte de chat blanche
 * s’ouvre et se ferme (croix, Échap, re-clic), annonce « Assistant bientôt
 * disponible », l’Audio est désactivé, et le choix manuel reste intact.
 * Les options et mesures estimées préremplies par l’URL arrivent dans les
 * formulaires, modifiables et étiquetées « estimation IA ».
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

test('assistant IA flottant — bouton partout, boîte blanche ouverture/fermeture, choix manuel intact, préremplissages', async ({ page }) => {
  await connecter(page);

  // Bouton rond « AI » visible sur le tableau de bord.
  const bouton = page.getByRole('button', { name: 'Assistant IA' });
  await expect(bouton).toBeVisible();

  // Ouverture : boîte de chat blanche, salutation, bientôt disponible en mode mémoire.
  await bouton.click();
  const boite = page.getByRole('dialog', { name: 'Assistant IA' });
  await expect(boite).toBeVisible();
  await expect(boite.getByText(/Décrivez le vêtement voulu/)).toBeVisible();
  await expect(boite.getByText(/Assistant bientôt disponible/)).toBeVisible();
  await expect(boite.getByRole('button', { name: /Audio/ })).toBeDisabled();
  // Hors page cliente : le sélecteur de cliente est proposé.
  await expect(boite.getByText('Pour quelle cliente ?')).toBeVisible();
  await expect(boite.getByRole('option', { name: 'Patron rapide sans cliente' })).toBeAttached();

  // Fermeture par Échap, puis réouverture et fermeture par la croix, puis re-clic.
  await page.keyboard.press('Escape');
  await expect(boite).toBeHidden();
  await bouton.click();
  await expect(boite).toBeVisible();
  await boite.getByRole('button', { name: 'Fermer l’assistant' }).click();
  await expect(boite).toBeHidden();
  await bouton.click();
  await expect(boite).toBeVisible();
  await bouton.click();
  await expect(boite).toBeHidden();

  await creerClienteAvecMesures(page, 'Cliente Assistant E2E');
  const idCliente = new URL(page.url()).pathname.split('/').filter(Boolean).pop() ?? '';

  await page.getByRole('link', { name: 'Créer un patron pour Cliente' }).first().click();
  await expect(page.getByRole('heading', { name: 'Créer un patron pour Cliente' })).toBeVisible();

  // La grande carte a disparu ; le bouton flottant reste, sans sélecteur sur la page d’une cliente.
  await expect(page.locator('.assistant')).toHaveCount(0);
  await expect(bouton).toBeVisible();
  await bouton.click();
  await expect(boite).toBeVisible();
  await expect(boite.getByText('Pour quelle cliente ?')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(boite).toBeHidden();

  // Le choix manuel garde l’ordre du registre et fonctionne.
  await expect(page.locator('.carte-modele strong')).toHaveText(['Pantalon large', 'Robe fourreau', 'Jupe droite']);
  await page.locator('a.carte-modele[href$="modele=jupe_droite"]').click();
  await expect(page.getByRole('heading', { name: /Salle d’essayage — Cliente/ })).toBeVisible();

  // Options préremplies par l’URL : arrivent en salle, modifiables.
  await page.goto(`/clientes/${idCliente}/patron/nouveau?modele=pantalon_large&largeur_bas_cm=36&profondeur_pli_cm=5`);
  await expect(page.getByRole('heading', { name: /Salle d’essayage — Cliente/ })).toBeVisible();
  await expect(page.locator('input[name="largeur_bas_cm"]')).toHaveValue('36');
  await expect(page.locator('input[name="profondeur_pli_cm"]')).toHaveValue('5');

  await page.goto(`/clientes/${idCliente}/patron/nouveau?modele=robe_fourreau&encolure=fendue_v&manches=manche_courte`);
  await expect(page.locator('input[name="encolure"][value="fendue_v"]')).toBeChecked();
  await expect(page.locator('input[name="manches"][value="manche_courte"]')).toBeChecked();

  // Mesures estimées par l’assistant : note « estimation IA » sur le formulaire cliente.
  await page.goto(
    `/clientes/${idCliente}/patron/nouveau?modele=pantalon_large&tour_taille_cm=78&tour_hanches_cm=101&hauteur_fourche_cm=27&longueur_pantalon_cm=104&estimation_ia=1`
  );
  await expect(page.getByText(/estimations de l’assistant/)).toBeVisible();

  // Patron rapide : les mesures estimées préremplissent le formulaire, étiquetées.
  await page.goto('/patron/mesures?modele=pantalon_large&tour_taille_cm=78&tour_hanches_cm=101&hauteur_fourche_cm=27&longueur_pantalon_cm=104&estimation_ia=1');
  await expect(page.locator('input[name="tour_taille_cm"]')).toHaveValue('78');
  await expect(page.locator('input[name="longueur_pantalon_cm"]')).toHaveValue('104');
  await expect(page.getByText('estimation IA').first()).toBeVisible();
});

test('assistant flottant — champ large aux trois largeurs et « Retirer la photo » visible', async ({ page }) => {
  await connecter(page);
  const bouton = page.getByRole('button', { name: 'Assistant IA' });
  await bouton.click();
  const boite = page.getByRole('dialog', { name: 'Assistant IA' });
  await expect(boite).toBeVisible();

  const champ = boite.locator('.pilule > input');
  await expect(champ).toHaveAttribute('placeholder', /Décrivez un modèle/);

  for (const largeur of [360, 390, 1280]) {
    await page.setViewportSize({ width: largeur, height: 800 });
    const boiteBox = await boite.boundingBox();
    const champBox = await champ.boundingBox();
    expect(boiteBox).not.toBeNull();
    expect(champBox).not.toBeNull();
    // Le champ prend au moins 60 % de la largeur de la boîte, sans débordement.
    expect(champBox!.width / boiteBox!.width).toBeGreaterThanOrEqual(0.6);
    expect(champBox!.x + champBox!.width).toBeLessThanOrEqual(boiteBox!.x + boiteBox!.width + 1);
    const defilement = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(defilement).toBeLessThanOrEqual(0);
  }

  // Photo jointe (mode mémoire : l’envoi est désactivé, on réactive juste le
  // champ fichier pour vérifier l’aperçu) — « Retirer la photo » doit être
  // visible, en texte foncé sur fond clair, nom tronqué sans débordement.
  await page.setViewportSize({ width: 390, height: 800 });
  const inputPhoto = boite.locator('input[type="file"]');
  await inputPhoto.evaluate((el) => {
    (el as HTMLInputElement).disabled = false;
  });
  await inputPhoto.setInputFiles({
    name: 'photo-pantalon-tres-long-nom-de-fichier-exemple-123456789.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9])
  });
  const retirer = boite.getByRole('button', { name: 'Retirer la photo' });
  await expect(retirer).toBeVisible();
  const contraste = await retirer.evaluate((el) => {
    const s = getComputedStyle(el);
    return { couleur: s.color, fond: s.backgroundColor, bordure: s.borderStyle };
  });
  expect(contraste.couleur).toBe('rgb(31, 31, 35)');
  expect(contraste.fond).toBe('rgb(255, 255, 255)');
  expect(contraste.bordure).not.toBe('none');
  const nom = boite.locator('.photo-nom');
  await expect(nom).toBeVisible();
  const deborde = await nom.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(deborde).toBe(true); // nom long tronqué par ellipsis, pas de débordement de la boîte
  const boiteBox = await boite.boundingBox();
  const nomBox = await nom.boundingBox();
  expect(nomBox!.x + nomBox!.width).toBeLessThanOrEqual(boiteBox!.x + boiteBox!.width + 1);
  await expect(boite.getByText(/accord de la personne photographiée/)).toBeVisible();
});
