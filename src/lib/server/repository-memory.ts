import { randomUUID } from 'node:crypto';
import type { Cliente, Consentement, Mensuration, PatronCliente, PhotoCliente } from '../domain/types';
import type { CompteUtilisatrice, PhotoAvecDonnees, Repository, SessionTrouvee } from './repository';

/** Implémentation mémoire — tests unitaires et Playwright uniquement (aucune persistance). */
export class RepositoryMemoire implements Repository {
  private comptes: CompteUtilisatrice[] = [];
  private sessions = new Map<string, { utilisatriceId: string; expireLe: Date }>();
  private clientes: Cliente[] = [];
  private consentements: Consentement[] = [];
  private photos: PhotoAvecDonnees[] = [];
  private mensurations: Mensuration[] = [];
  private patrons: PatronCliente[] = [];

  async compterUtilisatrices() {
    return this.comptes.length;
  }

  async creerAtelierEtAdmin(e: { nomAtelier: string; nom: string; identifiant: string; motDePasseHash: string }) {
    // Même contrainte d'unicité de l'identifiant que la base PostgreSQL.
    if (this.comptes.some((c) => c.identifiant === e.identifiant)) {
      throw new Error('Cette adresse est déjà utilisée. Connectez-vous.');
    }
    const compte: CompteUtilisatrice = {
      id: randomUUID(),
      atelierId: randomUUID(),
      nom: e.nom,
      role: 'admin',
      identifiant: e.identifiant,
      motDePasseHash: e.motDePasseHash
    };
    this.comptes.push(compte);
    return compte;
  }

  async trouverCompteParIdentifiant(identifiant: string) {
    return this.comptes.find((c) => c.identifiant === identifiant);
  }

  async creerUtilisatrice(e: { atelierId: string; nom: string; identifiant: string; motDePasseHash: string; role: 'admin' | 'couturiere' }) {
    const compte: CompteUtilisatrice = { id: randomUUID(), ...e };
    this.comptes.push(compte);
    return compte;
  }

  async creerSession(utilisatriceId: string, tokenHash: string, expireLe: Date) {
    this.sessions.set(tokenHash, { utilisatriceId, expireLe });
  }

  async trouverSession(tokenHash: string): Promise<SessionTrouvee | undefined> {
    const s = this.sessions.get(tokenHash);
    if (!s || s.expireLe.getTime() <= Date.now()) return undefined;
    const u = this.comptes.find((c) => c.id === s.utilisatriceId);
    if (!u) return undefined;
    return { utilisatrice: { id: u.id, atelierId: u.atelierId, nom: u.nom, role: u.role }, expireLe: s.expireLe };
  }

  async supprimerSession(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }

  async listerClientes(atelierId: string, recherche?: string) {
    const q = recherche?.trim().toLowerCase();
    return this.clientes.filter(
      (c) => c.atelierId === atelierId && (!q || c.nom.toLowerCase().includes(q) || (c.telephone ?? '').includes(q))
    );
  }

  async creerCliente(atelierId: string, nom: string, telephone?: string) {
    const cliente: Cliente = { id: randomUUID(), atelierId, nom, telephone, createdAt: new Date() };
    this.clientes.push(cliente);
    return cliente;
  }

  async trouverCliente(atelierId: string, id: string) {
    return this.clientes.find((c) => c.atelierId === atelierId && c.id === id);
  }

  async modifierCliente(atelierId: string, id: string, nom: string, telephone?: string) {
    const c = await this.trouverCliente(atelierId, id);
    if (c) {
      c.nom = nom;
      c.telephone = telephone;
    }
  }

  async supprimerCliente(atelierId: string, id: string) {
    this.clientes = this.clientes.filter((c) => !(c.atelierId === atelierId && c.id === id));
    const ids = new Set(this.clientes.map((c) => c.id));
    this.consentements = this.consentements.filter((c) => ids.has(c.clienteId));
    this.photos = this.photos.filter((p) => ids.has(p.clienteId));
    this.mensurations = this.mensurations.filter((m) => ids.has(m.clienteId));
    this.patrons = this.patrons.filter((p) => ids.has(p.clienteId));
  }

  async consentementActif(clienteId: string) {
    return this.consentements.find((c) => c.clienteId === clienteId && !c.revoqueLe);
  }

  async donnerConsentement(clienteId: string, signatureNom: string, usageRenduIa: boolean) {
    const consentement: Consentement & { signatureNom?: string } = {
      id: randomUUID(),
      clienteId,
      donneLe: new Date(),
      usageRenduIa,
      usageEntrainementIa: false
    };
    (consentement as { signatureNom?: string }).signatureNom = signatureNom;
    this.consentements.push(consentement);
    return consentement;
  }

  async revoquerConsentement(clienteId: string) {
    const actif = await this.consentementActif(clienteId);
    if (actif) actif.revoqueLe = new Date();
    // Révocation = suppression immédiate des photos de la cliente.
    this.photos = this.photos.filter((p) => p.clienteId !== clienteId);
  }

  async creerPhoto(e: Parameters<Repository['creerPhoto']>[0]) {
    const photo: PhotoAvecDonnees = {
      id: randomUUID(),
      clienteId: e.clienteId,
      type: e.type,
      storageKeyChiffre: `db:${e.clienteId}`,
      consentementId: e.consentementId,
      creeeLe: new Date(),
      expireLe: e.expireLe,
      typeMime: e.typeMime,
      iv: e.iv,
      authTag: e.authTag,
      donneesChiffrees: e.donneesChiffrees
    };
    this.photos.push(photo);
    return photo;
  }

  async listerPhotos(clienteId: string) {
    return this.photos.filter((p) => p.clienteId === clienteId && !p.supprimeeLe);
  }

  async trouverPhoto(clienteId: string, photoId: string) {
    return this.photos.find((p) => p.clienteId === clienteId && p.id === photoId && !p.supprimeeLe);
  }

  async supprimerPhoto(clienteId: string, photoId: string) {
    this.photos = this.photos.filter((p) => !(p.clienteId === clienteId && p.id === photoId));
  }

  async purgerPhotosExpirees(maintenant: Date) {
    const avant = this.photos.length;
    this.photos = this.photos.filter((p) => p.expireLe.getTime() > maintenant.getTime());
    return avant - this.photos.length;
  }

  async listerMensurations(clienteId: string) {
    return this.mensurations.filter((m) => m.clienteId === clienteId);
  }

  async enregistrerMensuration(e: { clienteId: string; code: string; valeurCm: number; saisiePar: string }) {
    const existante = this.mensurations.find((m) => m.clienteId === e.clienteId && m.code === e.code);
    if (existante) {
      existante.valeurCm = e.valeurCm;
      existante.valideePar = e.saisiePar;
      existante.valideeLe = new Date();
      return;
    }
    this.mensurations.push({
      id: randomUUID(),
      clienteId: e.clienteId,
      code: e.code,
      valeurCm: e.valeurCm,
      source: 'saisie_couturiere',
      valideeParCouturiere: true,
      valideePar: e.saisiePar,
      valideeLe: new Date()
    });
  }

  /** Les patrons n'existent que par leur cliente : l'atelier est celui de la cliente. */
  private patronDeLAtelier(atelierId: string, patron: PatronCliente): boolean {
    const cliente = this.clientes.find((c) => c.id === patron.clienteId);
    return cliente?.atelierId === atelierId;
  }

  async listerPatrons(atelierId: string, clienteId: string) {
    const cliente = await this.trouverCliente(atelierId, clienteId);
    if (!cliente) return [];
    return this.patrons
      .filter((p) => p.clienteId === clienteId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async creerPatron(atelierId: string, e: Parameters<Repository['creerPatron']>[1]) {
    const cliente = await this.trouverCliente(atelierId, e.clienteId);
    if (!cliente) throw new Error('Cliente introuvable pour cet atelier.');
    const patron: PatronCliente = {
      id: randomUUID(),
      clienteId: e.clienteId,
      modele: e.modele,
      nom: e.nom,
      mesures: { ...e.mesures },
      options: { ...e.options },
      tissu: { ...e.tissu },
      statut: 'brouillon',
      creePar: e.creePar,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.patrons.push(patron);
    return patron;
  }

  async trouverPatron(atelierId: string, patronId: string) {
    const patron = this.patrons.find((p) => p.id === patronId);
    return patron && this.patronDeLAtelier(atelierId, patron) ? patron : undefined;
  }

  async modifierPatron(atelierId: string, patronId: string, maj: Parameters<Repository['modifierPatron']>[2]) {
    const patron = await this.trouverPatron(atelierId, patronId);
    if (!patron) return;
    patron.nom = maj.nom;
    patron.mesures = { ...maj.mesures };
    patron.options = { ...maj.options };
    patron.tissu = { ...maj.tissu };
    patron.updatedAt = new Date();
  }

  async supprimerPatron(atelierId: string, patronId: string) {
    const patron = await this.trouverPatron(atelierId, patronId);
    if (!patron) return;
    this.patrons = this.patrons.filter((p) => p.id !== patronId);
  }

  async resumerPatronsParCliente(atelierId: string) {
    const resume: Record<string, { nombre: number; dernierLe: Date | null }> = {};
    for (const patron of this.patrons) {
      if (!this.patronDeLAtelier(atelierId, patron)) continue;
      const entree = (resume[patron.clienteId] ??= { nombre: 0, dernierLe: null });
      entree.nombre++;
      if (!entree.dernierLe || patron.createdAt > entree.dernierLe) entree.dernierLe = patron.createdAt;
    }
    return resume;
  }
}
