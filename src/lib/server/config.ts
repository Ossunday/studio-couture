import { ENV_PHOTO_ENCRYPTION_KEY, ENV_SESSION_SECRET } from '../brand';
import { cleDepuisBase64 } from './crypto';

/**
 * Configuration obligatoire au démarrage — aucun repli silencieux.
 * Appelé par le hook `init` de hooks.server.ts : si le secret de session
 * (≥ 32 octets) ou la clé photo (exactement 32 octets) manque ou est invalide,
 * le serveur refuse de démarrer. Le dépôt mémoire des tests n’est pas une excuse :
 * les mêmes exigences s’appliquent, Playwright fournit des secrets de test longs.
 */

export const SECRET_SESSION_MIN_OCTETS = 32;

export function exigerSecretSession(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env[ENV_SESSION_SECRET];
  if (!secret || Buffer.byteLength(secret, 'utf8') < SECRET_SESSION_MIN_OCTETS) {
    throw new Error(
      `${ENV_SESSION_SECRET} absent ou trop court : ${SECRET_SESSION_MIN_OCTETS} octets minimum. Démarrage refusé.`
    );
  }
  return secret;
}

export function exigerClePhoto(env: NodeJS.ProcessEnv = process.env): Buffer {
  const base64 = env[ENV_PHOTO_ENCRYPTION_KEY];
  if (!base64) {
    throw new Error(`${ENV_PHOTO_ENCRYPTION_KEY} absente : exactement 32 octets en base64 requis. Démarrage refusé.`);
  }
  // cleDepuisBase64 rejette toute clé qui ne fait pas exactement 32 octets.
  return cleDepuisBase64(base64);
}

export function validerConfigurationDemarrage(env: NodeJS.ProcessEnv = process.env): void {
  exigerSecretSession(env);
  exigerClePhoto(env);
}
