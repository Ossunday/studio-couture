import { normaliserIdentifiant } from '$lib/domain/identifiant';
import { MessageError, type TranslationKey } from '$lib/i18n';
import { hacherMotDePasse } from './auth';
import type { CompteUtilisatrice, Repository } from './repository';

/**
 * Inscription publique « Créer mon atelier » — serveur uniquement.
 * Crée l'atelier ET son compte administrateur (transaction côté dépôt
 * PostgreSQL, `creerAtelierEtAdmin`), mot de passe haché par le même
 * service scrypt que /installation (`hacherMotDePasse`) — jamais recopié,
 * jamais journalisé.
 */

export const MESSAGE_DOUBLON: TranslationKey = 'validation.doublon';
export const LIMITE_CREATIONS_PAR_HEURE = 5;
export const FENETRE_CREATIONS_MS = 60 * 60 * 1000;

/** `INSCRIPTION_OUVERTE` : défaut `true` ; seule la valeur `false` ferme les inscriptions. */
export function inscriptionOuverte(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.INSCRIPTION_OUVERTE ?? 'true').trim().toLowerCase() !== 'false';
}

export interface InscriptionBrute {
  nomAtelier: string;
  nom: string;
  email: string;
  motDePasse: string;
  confirmation: string;
  consentement: boolean;
  /** Champ piège (honeypot) : doit rester vide chez une vraie personne. */
  piege: string;
}

export interface InscriptionValidee {
  nomAtelier: string;
  nom: string;
  email: string;
  motDePasse: string;
}

export function piegeRempli(brut: InscriptionBrute): boolean {
  return brut.piege.trim().length > 0;
}

export function validerInscription(brut: InscriptionBrute): InscriptionValidee {
  const nomAtelier = brut.nomAtelier.trim();
  if (nomAtelier.length < 2 || nomAtelier.length > 80) {
    throw new MessageError('validation.nomAtelierBornes');
  }
  const nom = brut.nom.trim();
  if (nom.length < 2 || nom.length > 80) {
    throw new MessageError('validation.votreNomBornes');
  }
  let email: string;
  try {
    const normalise = normaliserIdentifiant(brut.email);
    if (normalise.type !== 'email') throw new MessageError('validation.identifiantEmail');
    email = normalise.valeur; // minuscules, garantie par normaliserIdentifiant
  } catch {
    throw new MessageError('validation.identifiantEmail');
  }
  if (brut.motDePasse.length < 12) {
    throw new MessageError('validation.motDePasse12');
  }
  if (brut.motDePasse !== brut.confirmation) {
    throw new MessageError('validation.motsDePasseDifferents');
  }
  if (!brut.consentement) {
    throw new MessageError('validation.consentementCoche');
  }
  return { nomAtelier, nom, email, motDePasse: brut.motDePasse };
}

/** Crée l'atelier et son admin ; rejette les doublons d'e-mail sans autre fuite d'information. */
export async function inscrireAtelier(repo: Repository, brut: InscriptionBrute): Promise<CompteUtilisatrice> {
  const valide = validerInscription(brut);
  if (await repo.trouverCompteParIdentifiant(valide.email)) {
    throw new MessageError(MESSAGE_DOUBLON);
  }
  try {
    return await repo.creerAtelierEtAdmin({
      nomAtelier: valide.nomAtelier,
      nom: valide.nom,
      identifiant: valide.email,
      motDePasseHash: hacherMotDePasse(valide.motDePasse)
    });
  } catch (e) {
    // Course entre deux inscriptions simultanées : contrainte unique de la base.
    if (e instanceof Error && /duplicate|unique|déjà/i.test(e.message)) throw new MessageError(MESSAGE_DOUBLON);
    throw e;
  }
}

/** Limitation de débit par IP, en mémoire (mono-instance, comme la limite démo). */
export class LimiteurInscriptions {
  private creations = new Map<string, number[]>();

  constructor(
    private readonly maxCreations = LIMITE_CREATIONS_PAR_HEURE,
    private readonly fenetreMs = FENETRE_CREATIONS_MS
  ) {}

  autoriser(ip: string, maintenant = Date.now()): boolean {
    const borne = maintenant - this.fenetreMs;
    const recentes = (this.creations.get(ip) ?? []).filter((t) => t > borne);
    this.creations.set(ip, recentes);
    return recentes.length < this.maxCreations;
  }

  enregistrer(ip: string, maintenant = Date.now()): void {
    const recentes = this.creations.get(ip) ?? [];
    recentes.push(maintenant);
    this.creations.set(ip, recentes);
  }

  reinitialiser(): void {
    this.creations.clear();
  }
}

export const limiteurInscriptions = new LimiteurInscriptions();
