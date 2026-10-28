export const LOCALES = ['fr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';

/**
 * Règle produit n°6 : aucune traduction en langue locale n'est publiée
 * sans validation humaine. N'ajouter une locale ici qu'après validation
 * écrite d'un·e locuteur·rice / traducteur·rice identifié·e.
 */
export const PUBLISHED_LOCALES: readonly Locale[] = ['fr'];
