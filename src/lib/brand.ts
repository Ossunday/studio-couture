/**
 * Source unique de vérité pour la marque.
 * Pour renommer le produit, ne modifier que ce fichier —
 * plus les fichiers statiques qui ne peuvent pas importer de TS
 * (package.json, static/manifest.webmanifest, src/app.html),
 * dont les valeurs doivent rester égales à celles-ci.
 */
export const BRAND_NAME = 'Studio Couture' as const;
export const BRAND_SLUG = 'studio-couture' as const;
export const BRAND_SHORT_NAME = 'Studio Couture' as const;
export const BRAND_DESCRIPTION =
  'Du modèle choisi au patron à l’échelle, pour couturières et tailleurs.' as const;
export const BRAND_DESCRIPTION_LONG =
  'Studio Couture — du modèle au patron à l’échelle, à l’atelier.' as const;

/** Nom de base PostgreSQL (identifiant SQL : underscores). */
export const BRAND_DATABASE_NAME = 'studio_couture' as const;
/** Préfixe des variables d’environnement propres au produit. */
export const BRAND_ENV_PREFIX = 'STUDIO_COUTURE_' as const;

export const ENV_DATABASE_URL = `${BRAND_ENV_PREFIX}DATABASE_URL` as const;
export const ENV_PHOTO_ENCRYPTION_KEY = `${BRAND_ENV_PREFIX}PHOTO_ENCRYPTION_KEY_BASE64` as const;
export const ENV_SESSION_SECRET = `${BRAND_ENV_PREFIX}SESSION_SECRET` as const;

/** Nom du cache du service worker pour une version donnée. */
export function brandCacheName(version: string): string {
  return `${BRAND_SLUG}-v${version}`;
}
