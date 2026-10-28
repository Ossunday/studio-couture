import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ENV_PHOTO_ENCRYPTION_KEY } from '../brand';

/**
 * Chiffrement côté serveur des photos clientes (règle n°8) : AES-256-GCM.
 * La clé maître vient de STUDIO_COUTURE_PHOTO_ENCRYPTION_KEY_BASE64 (32 octets).
 * Fonctions pures testables : la clé est passée en paramètre.
 */
export interface BlobChiffre {
  iv: Buffer;
  authTag: Buffer;
  donnees: Buffer;
}

export function cleDepuisBase64(base64: string): Buffer {
  const cle = Buffer.from(base64, 'base64');
  if (cle.length !== 32) throw new Error(`${ENV_PHOTO_ENCRYPTION_KEY} doit contenir 32 octets.`);
  return cle;
}

export function chiffrer(donnees: Buffer, cle: Buffer): BlobChiffre {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', cle, iv);
  const chiffre = Buffer.concat([cipher.update(donnees), cipher.final()]);
  return { iv, authTag: cipher.getAuthTag(), donnees: chiffre };
}

export function dechiffrer(blob: BlobChiffre, cle: Buffer): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', cle, blob.iv);
  decipher.setAuthTag(blob.authTag);
  return Buffer.concat([decipher.update(blob.donnees), decipher.final()]);
}

/** Clé maître des photos depuis l’environnement serveur (32 octets en base64). */
export function clePhotoDepuisEnv(): Buffer {
  const base64 = process.env[ENV_PHOTO_ENCRYPTION_KEY];
  if (!base64) throw new Error(`${ENV_PHOTO_ENCRYPTION_KEY} manquante (voir README).`);
  return cleDepuisBase64(base64);
}

export const TYPES_PHOTO_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const TAILLE_PHOTO_MAX_OCTETS = 5 * 1024 * 1024;

export function validerPhoto(typeMime: string, tailleOctets: number): void {
  if (!(TYPES_PHOTO_ACCEPTES as readonly string[]).includes(typeMime)) {
    throw new Error('Format de photo non accepté : utilisez JPEG, PNG ou WebP.');
  }
  if (!Number.isInteger(tailleOctets) || tailleOctets <= 0 || tailleOctets > TAILLE_PHOTO_MAX_OCTETS) {
    throw new Error('Photo trop lourde : 5 Mo maximum.');
  }
}
