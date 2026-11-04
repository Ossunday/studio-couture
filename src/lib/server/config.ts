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

export function validerConfigurationDemarrage(env: NodeJS.ProcessEnv = process.env, production = false): void {
  exigerSecretSession(env);
  exigerClePhoto(env);
  avertirSiOriginAbsent(env, production);
}

/**
 * Avertissement ORIGIN au démarrage (production uniquement, jamais bloquant).
 * Sans ORIGIN, adapter-node suppose le schéma https : l’origine attendue par la
 * protection CSRF de SvelteKit devient `https://<hôte>` alors que le navigateur,
 * en local, envoie `http://<hôte>` — chaque envoi de formulaire (inscription,
 * connexion…) est alors refusé : « Cross-site POST form submissions are
 * forbidden ». On prévient clairement sans arrêter le serveur, pour laisser
 * le temps de corriger la configuration. `production` vient de l’environnement
 * de build SvelteKit (`dev` de `$app/environment`, figé dans le build), pas de
 * `NODE_ENV` : adapter-node ne le définit pas toujours dans le processus.
 */
export function avertirSiOriginAbsent(
  env: NodeJS.ProcessEnv = process.env,
  production = false,
  avertir: (message: string) => void = (message) => console.warn(message)
): void {
  if (!production || env.ORIGIN) return;
  avertir(
    [
      '[Studio Couture] Avertissement : ORIGIN est absent au démarrage (production).',
      'Sans ORIGIN, le serveur suppose le schéma https : l’origine attendue devient https://<hôte>,',
      'alors que le navigateur envoie http://<hôte> en local. Les envois de formulaires',
      '(inscription, connexion…) seront refusés : « Cross-site POST form submissions are forbidden ».',
      'Définissez ORIGIN avec le schéma et l’adresse réellement utilisée dans le navigateur,',
      'par exemple ORIGIN=http://127.0.0.1:3000 en local, ou https://votre-domaine en production.',
      'Le serveur continue sans ORIGIN ; corrigez la variable puis redémarrez pour rétablir les formulaires.'
    ].join('\n')
  );
}
