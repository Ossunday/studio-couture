import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { chiffrer } from './crypto';
import { RepositoryMemoire } from './repository-memory';

/**
 * Cloisonnement par atelier et cycle de vie des sessions/photos.
 * Les routes vérifient toujours `trouverCliente(atelierId, id)` avant tout
 * accès photo/mensuration : une couturière d’un autre atelier obtient donc
 * « introuvable » sur accès par identifiant direct, comme testé ici.
 */
async function deuxAteliers() {
  const repo = new RepositoryMemoire();
  const a = await repo.creerAtelierEtAdmin({ nomAtelier: 'A', nom: 'Admin A', identifiant: 'a@exemple.bj', motDePasseHash: 'h' });
  const b = await repo.creerAtelierEtAdmin({ nomAtelier: 'B', nom: 'Admin B', identifiant: 'b@exemple.bj', motDePasseHash: 'h' });
  const clienteA = await repo.creerCliente(a.atelierId, 'Cliente de A', '+22996000000');
  return { repo, a, b, clienteA };
}

describe('cloisonnement par atelier (accès par identifiant direct)', () => {
  it('une couturière d’un autre atelier ne voit ni ne trouve la cliente', async () => {
    const { repo, b, clienteA } = await deuxAteliers();
    expect(await repo.listerClientes(b.atelierId)).toHaveLength(0);
    expect(await repo.trouverCliente(b.atelierId, clienteA.id)).toBeUndefined();
  });

  it('modification et suppression par un autre atelier sont sans effet', async () => {
    const { repo, a, b, clienteA } = await deuxAteliers();
    await repo.modifierCliente(b.atelierId, clienteA.id, 'Nom détourné', '+22900000000');
    await repo.supprimerCliente(b.atelierId, clienteA.id);
    const intacte = await repo.trouverCliente(a.atelierId, clienteA.id);
    expect(intacte?.nom).toBe('Cliente de A');
    expect(intacte?.telephone).toBe('+22996000000');
  });

  it('photo et mensurations restent inaccessibles sans la cliente de son atelier', async () => {
    const { repo, a, b, clienteA } = await deuxAteliers();
    // Côté A : consentement, photo chiffrée et mensuration existent.
    const consentement = await repo.donnerConsentement(clienteA.id, 'Cliente de A', true);
    const blob = chiffrer(Buffer.from('image-fictive'), randomBytes(32));
    const photo = await repo.creerPhoto({
      clienteId: clienteA.id,
      consentementId: consentement.id,
      type: 'cliente_complete',
      typeMime: 'image/jpeg',
      tailleOctets: 13,
      iv: blob.iv,
      authTag: blob.authTag,
      donneesChiffrees: blob.donnees,
      expireLe: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    await repo.enregistrerMensuration({ clienteId: clienteA.id, code: 'tour_taille_cm', valeurCm: 82.5, saisiePar: a.id });

    // Côté B : le garde-fou des routes (trouverCliente de SON atelier) bloque avant tout accès.
    const clientePourB = await repo.trouverCliente(b.atelierId, clienteA.id);
    expect(clientePourB).toBeUndefined();
    // Et même en connaissant l’identifiant de la photo, elle est rattachée à la cliente de A.
    expect((await repo.trouverPhoto(clienteA.id, photo.id))?.clienteId).toBe(clienteA.id);
    expect(await repo.listerMensurations(clienteA.id)).toHaveLength(1);
    expect(await repo.listerPhotos(clienteA.id)).toHaveLength(1);
  });
});

describe('sessions : expiration à 7 jours (dépôt mémoire)', () => {
  it('une session expirée n’authentifie plus, une session valide oui', async () => {
    const repo = new RepositoryMemoire();
    const compte = await repo.creerAtelierEtAdmin({ nomAtelier: 'A', nom: 'Admin', identifiant: 'a@exemple.bj', motDePasseHash: 'h' });
    await repo.creerSession(compte.id, 'hash-expiré', new Date(Date.now() - 1000));
    await repo.creerSession(compte.id, 'hash-valide', new Date(Date.now() + 60_000));
    expect(await repo.trouverSession('hash-expiré')).toBeUndefined();
    expect((await repo.trouverSession('hash-valide'))?.utilisatrice.id).toBe(compte.id);
    await repo.supprimerSession('hash-valide');
    expect(await repo.trouverSession('hash-valide')).toBeUndefined();
  });
});

describe('purge effective des photos à 7 jours', () => {
  it('supprime les photos expirées et conserve les photos encore valides', async () => {
    const { repo, clienteA } = await deuxAteliers();
    const consentement = await repo.donnerConsentement(clienteA.id, 'Cliente de A', false);
    const blob = chiffrer(Buffer.from('image-fictive'), randomBytes(32));
    const base = {
      clienteId: clienteA.id,
      consentementId: consentement.id,
      type: 'tissu' as const,
      typeMime: 'image/png',
      tailleOctets: 13,
      iv: blob.iv,
      authTag: blob.authTag,
      donneesChiffrees: blob.donnees
    };
    await repo.creerPhoto({ ...base, expireLe: new Date('2026-10-21T00:00:00Z') }); // créée il y a plus de 7 jours
    await repo.creerPhoto({ ...base, expireLe: new Date('2026-11-04T00:00:00Z') }); // encore valide
    expect(await repo.purgerPhotosExpirees(new Date('2026-10-28T00:00:00Z'))).toBe(1);
    const restantes = await repo.listerPhotos(clienteA.id);
    expect(restantes).toHaveLength(1);
    expect(restantes[0]?.expireLe.toISOString()).toBe('2026-11-04T00:00:00.000Z');
  });
});
