import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { peut } from '$lib/domain/permissions';
import { DEFINITIONS_MENSURATIONS, validerMensurationSaisie } from '$lib/domain/mensurations-saisie';
import { preparerPiece } from '$lib/patterns/apercu-rendu';
import { estModelePatron, genererPiecesPlacees, MODELES } from '$lib/patterns/saisie-patron';
import { couleurTissu } from '$lib/demo/tissus';
import { assertConsentementPhoto, calculerExpiration } from '$lib/privacy/retention';
import { chiffrer, clePhotoDepuisEnv, validerPhoto } from '$lib/server/crypto';
import { assertCsrf, exigerConnexion } from '$lib/server/garde';
import { parametresDepuisPatron } from '$lib/server/patron-cliente';
import { getRepository } from '$lib/server/repository';

const ONGLETS = ['resume', 'mesures', 'photos', 'patrons'] as const;

export const load: PageServerLoad = async ({ locals, params, url }) => {
  const u = exigerConnexion(locals.utilisatrice);
  const repo = getRepository();
  const cliente = await repo.trouverCliente(u.atelierId, params.id);
  if (!cliente) throw error(404, 'Cliente introuvable.');
  const consentement = await repo.consentementActif(cliente.id);
  // Suppression automatique à échéance : purge opportuniste à chaque ouverture de fiche.
  await repo.purgerPhotosExpirees(new Date());
  const photos = await repo.listerPhotos(cliente.id);
  const mensurations = await repo.listerMensurations(cliente.id);
  const valeurs = new Map(mensurations.map((m) => [m.code, m.valeurCm]));
  const patronsBruts = await repo.listerPatrons(u.atelierId, cliente.id);
  // Miniatures SVG générées à la volée depuis l'instantané (aucune image stockée).
  const patrons = patronsBruts.map((p) => {
    let miniature: { pieces: ReturnType<typeof preparerPiece>[]; largeur: number; hauteur: number } | null = null;
    if (estModelePatron(p.modele)) {
      try {
        const placees = genererPiecesPlacees(p.modele, p.mesures, p.modele === 'pantalon_large' ? p.options : {});
        miniature = {
          pieces: placees.pieces.map(preparerPiece),
          largeur: Math.ceil(placees.largeur),
          hauteur: Math.ceil(placees.hauteur)
        };
      } catch {
        miniature = null;
      }
    }
    const hrefPdf = estModelePatron(p.modele)
      ? `/patron/pdf?${parametresDepuisPatron(p.modele, p.nom, p.mesures, p.options).toString()}`
      : '#';
    return {
      id: p.id,
      modele: p.modele,
      titreModele: estModelePatron(p.modele) ? MODELES[p.modele].titre : p.modele,
      nom: p.nom,
      creeLe: p.createdAt.toISOString(),
      modifieLe: p.updatedAt.toISOString(),
      mesuresTexte: estModelePatron(p.modele)
        ? MODELES[p.modele].champs
            .filter((code) => p.mesures[code] !== undefined)
            .map((code) => `${code.replaceAll('_cm', '').replaceAll('_', ' ')} : ${String(p.mesures[code]).replace('.', ',')} cm`)
            .join(' · ')
        : '',
      tissuHex: couleurTissu(p.tissu.couleurId).hex,
      miniature,
      hrefPdf
    };
  });
  const ongletBrut = url.searchParams.get('onglet') ?? 'resume';
  const onglet = (ONGLETS as readonly string[]).includes(ongletBrut) ? ongletBrut : 'resume';
  return {
    cliente: { id: cliente.id, nom: cliente.nom, telephone: cliente.telephone ?? null },
    prenom: cliente.nom.trim().split(/\s+/)[0] ?? cliente.nom,
    onglet,
    messagePatron: url.searchParams.get('patron'),
    patrons,
    photos: photos.map((p) => ({
      id: p.id,
      type: p.type,
      creeeLe: p.creeeLe.toISOString(),
      expireLe: p.expireLe.toISOString()
    })),
    consentement: consentement
      ? { donneLe: consentement.donneLe.toISOString(), usageRenduIa: consentement.usageRenduIa }
      : null,
    mensurations: DEFINITIONS_MENSURATIONS.map((d) => ({
      code: d.code,
      libelle: d.libelle,
      minCm: d.minCm,
      maxCm: d.maxCm,
      valeurCm: valeurs.get(d.code) ?? null
    })),
    peutSupprimer: peut(u.role, 'cliente.supprimer'),
    csrfToken: locals.csrfToken
  };
};

export const actions: Actions = {
  consentement: async ({ request, locals, params }) => {
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const repo = getRepository();
    const cliente = await repo.trouverCliente(u.atelierId, params.id);
    if (!cliente) throw error(404, 'Cliente introuvable.');
    const signature = String(data.get('signature_nom') ?? '').trim();
    if (signature.length < 2) return fail(400, { erreur: 'Le nom signé de la cliente est requis pour le consentement photo.' });
    if (data.get('accord_photo') !== 'on') return fail(400, { erreur: 'Cochez l’accord explicite de la cliente avant d’enregistrer le consentement.' });
    await repo.donnerConsentement(cliente.id, signature, data.get('usage_rendu_ia') === 'on');
    return { consentementEnregistre: true };
  },
  revoquer: async ({ request, locals, params }) => {
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const repo = getRepository();
    const cliente = await repo.trouverCliente(u.atelierId, params.id);
    if (!cliente) throw error(404, 'Cliente introuvable.');
    await repo.revoquerConsentement(cliente.id);
    return { consentementRevoque: true };
  },
  televerserPhoto: async ({ request, locals, params }) => {
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const repo = getRepository();
    const cliente = await repo.trouverCliente(u.atelierId, params.id);
    if (!cliente) throw error(404, 'Cliente introuvable.');
    try {
      const consentement = await repo.consentementActif(cliente.id);
      assertConsentementPhoto(consentement);
      const fichier = data.get('photo');
      if (!(fichier instanceof File) || fichier.size === 0) throw new Error('Choisissez une photo à envoyer.');
      validerPhoto(fichier.type, fichier.size);
      const type = String(data.get('type_photo') ?? 'cliente_complete');
      if (type !== 'modele' && type !== 'cliente_complete' && type !== 'tissu') throw new Error('Type de photo invalide.');
      const clair = Buffer.from(await fichier.arrayBuffer());
      const blob = chiffrer(clair, clePhotoDepuisEnv());
      const maintenant = new Date();
      await repo.creerPhoto({
        clienteId: cliente.id,
        consentementId: consentement!.id,
        type,
        typeMime: fichier.type,
        tailleOctets: fichier.size,
        iv: blob.iv,
        authTag: blob.authTag,
        donneesChiffrees: blob.donnees,
        expireLe: calculerExpiration(maintenant)
      });
    } catch (e) {
      return fail(400, { erreur: e instanceof Error ? e.message : 'Envoi de la photo impossible.' });
    }
    return { photoAjoutee: true };
  },
  supprimerPhoto: async ({ request, locals, params }) => {
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const repo = getRepository();
    const cliente = await repo.trouverCliente(u.atelierId, params.id);
    if (!cliente) throw error(404, 'Cliente introuvable.');
    await repo.supprimerPhoto(cliente.id, String(data.get('photo_id') ?? ''));
    return { photoSupprimee: true };
  },
  mensurations: async ({ request, locals, params }) => {
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const repo = getRepository();
    const cliente = await repo.trouverCliente(u.atelierId, params.id);
    if (!cliente) throw error(404, 'Cliente introuvable.');
    try {
      let saisies = 0;
      for (const def of DEFINITIONS_MENSURATIONS) {
        const brut = String(data.get(def.code) ?? '').trim();
        if (!brut) continue;
        const valeurCm = validerMensurationSaisie(def.code, brut);
        await repo.enregistrerMensuration({ clienteId: cliente.id, code: def.code, valeurCm, saisiePar: u.id });
        saisies++;
      }
      if (saisies === 0) throw new Error('Entrez au moins une mensuration en centimètres.');
    } catch (e) {
      return fail(400, { erreur: e instanceof Error ? e.message : 'Saisie des mensurations impossible.' });
    }
    return { mensurationsEnregistrees: true };
  },
  supprimer: async ({ request, locals, params }) => {
    const u = exigerConnexion(locals.utilisatrice);
    if (!peut(u.role, 'cliente.supprimer')) throw error(403, 'Seule l’administratrice peut supprimer une cliente.');
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    if (data.get('confirme_suppression') !== 'on') {
      return fail(400, { erreur: 'Cochez la confirmation avant de supprimer définitivement cette cliente.' });
    }
    // Cascade : patrons, mensurations, photos et consentements partent avec la cliente.
    await getRepository().supprimerCliente(u.atelierId, params.id);
    throw redirect(303, '/clientes');
  },
  dupliquerPatron: async ({ request, locals, params }) => {
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const repo = getRepository();
    const cliente = await repo.trouverCliente(u.atelierId, params.id);
    if (!cliente) throw error(404, 'Cliente introuvable.');
    const patron = await repo.trouverPatron(u.atelierId, String(data.get('patron_id') ?? ''));
    if (!patron || patron.clienteId !== cliente.id) throw error(404, 'Patron introuvable.');
    await repo.creerPatron(u.atelierId, {
      clienteId: cliente.id,
      modele: patron.modele,
      nom: `${patron.nom} (copie)`.slice(0, 80),
      mesures: patron.mesures,
      options: patron.options,
      tissu: patron.tissu,
      creePar: u.id
    });
    throw redirect(303, `/clientes/${cliente.id}?onglet=patrons&patron=duplique`);
  },
  renommerPatron: async ({ request, locals, params }) => {
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const repo = getRepository();
    const cliente = await repo.trouverCliente(u.atelierId, params.id);
    if (!cliente) throw error(404, 'Cliente introuvable.');
    const patron = await repo.trouverPatron(u.atelierId, String(data.get('patron_id') ?? ''));
    if (!patron || patron.clienteId !== cliente.id) throw error(404, 'Patron introuvable.');
    const nouveauNom = String(data.get('nouveau_nom') ?? '').trim().replace(/\s+/g, ' ');
    if (nouveauNom.length < 2 || nouveauNom.length > 80) {
      return fail(400, { erreur: 'Vérifiez : le nom du patron doit faire entre 2 et 80 caractères.' });
    }
    await repo.modifierPatron(u.atelierId, patron.id, {
      nom: nouveauNom,
      mesures: patron.mesures,
      options: patron.options,
      tissu: patron.tissu
    });
    throw redirect(303, `/clientes/${cliente.id}?onglet=patrons&patron=renomme`);
  },
  supprimerPatron: async ({ request, locals, params }) => {
    const u = exigerConnexion(locals.utilisatrice);
    const data = await request.formData();
    assertCsrf(locals.csrfToken, data.get('_csrf'));
    const repo = getRepository();
    const cliente = await repo.trouverCliente(u.atelierId, params.id);
    if (!cliente) throw error(404, 'Cliente introuvable.');
    const patron = await repo.trouverPatron(u.atelierId, String(data.get('patron_id') ?? ''));
    if (!patron || patron.clienteId !== cliente.id) throw error(404, 'Patron introuvable.');
    if (data.get('confirme_suppression_patron') !== 'on') {
      return fail(400, { erreur: 'Cochez la confirmation avant de supprimer ce patron.' });
    }
    await repo.supprimerPatron(u.atelierId, patron.id);
    throw redirect(303, `/clientes/${cliente.id}?onglet=patrons&patron=supprime`);
  }
};
