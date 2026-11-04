export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export type Lang = Locale;
export const DEFAULT_LOCALE: Locale = 'fr';
export const LANG_COOKIE = 'lang';

/** Langue lue dans le cookie « lang » : seule « en » active l'anglais, tout le reste = français. */
export function lireLangue(valeur: string | null | undefined): Lang {
  return valeur === 'en' ? 'en' : 'fr';
}

export const PUBLISHED_LOCALES: readonly Locale[] = ['fr', 'en'];
