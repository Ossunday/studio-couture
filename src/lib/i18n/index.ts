import { fr, type TranslationKey } from './fr';
import { en } from './en';
import { DEFAULT_LOCALE, type Lang, type Locale } from './locales';

export type Params = Record<string, string | number>;

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { fr, en };

/** Traduit une clé ; {param} remplacés. Une clé inconnue retombe sur le français (jamais vide). */
export function t(lang: Lang | Locale = DEFAULT_LOCALE, key: TranslationKey, params?: Params): string {
  let texte = dictionaries[lang]?.[key] ?? fr[key] ?? key;
  if (params) {
    for (const [nom, valeur] of Object.entries(params)) {
      texte = texte.replaceAll(`{${nom}}`, String(valeur));
    }
  }
  return texte;
}

/** Erreur portant une clé de traduction (le moteur et les validations ne renvoient jamais de texte). */
export class MessageError extends Error {
  readonly cle: TranslationKey;
  readonly params?: Params;
  /** Clé de mesure/option à traduire puis injecter comme {mesure}/{option}. */
  readonly mesureCle?: TranslationKey;
  constructor(cle: TranslationKey, params?: Params, mesureCle?: TranslationKey) {
    super(cle);
    this.name = 'MessageError';
    this.cle = cle;
    this.params = params;
    this.mesureCle = mesureCle;
  }
}

export function traduireErreur(lang: Lang, e: unknown, repli: TranslationKey = 'validation.echecOperation'): string {
  if (e instanceof MessageError) {
    const params: Params = { ...(e.params ?? {}) };
    if (e.mesureCle) {
      const libelle = t(lang, e.mesureCle);
      params.mesure = lang === 'fr' ? libelle.toLowerCase() : libelle;
      params.option = params.mesure;
    }
    return t(lang, e.cle, params);
  }
  return t(lang, repli);
}

export function formatNombre(lang: Lang, valeur: number, decimales = 1): string {
  return new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales
  }).format(valeur);
}

/** Nombre au format de la langue, pour les cotes (toujours 1 décimale max). */
export function formatCm(lang: Lang, valeur: number): string {
  const arrondi = Math.round(valeur * 10) / 10;
  return formatNombre(lang, arrondi, 1);
}

export function formatDate(lang: Lang, date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long' });
}

export function formatDateComplete(lang: Lang, date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Chemin interne sûr pour la redirection après changement de langue (pas de redirection ouverte). */
export function cheminInterneSur(valeur: string | null | undefined): string {
  if (!valeur) return '/';
  const v = valeur.trim();
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\') || /[\u0000-\u001f]/.test(v)) return '/';
  return v;
}

export { DEFAULT_LOCALE, type Lang, type Locale, type TranslationKey };
export { lireLangue, LANG_COOKIE } from './locales';
