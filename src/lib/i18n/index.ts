import { fr, type TranslationKey } from './fr';
import { DEFAULT_LOCALE, type Locale } from './locales';

const dictionaries: Record<Locale, typeof fr> = { fr };

export function t(locale: Locale = DEFAULT_LOCALE, key: TranslationKey): string {
  return dictionaries[locale][key] ?? fr[key];
}

export { DEFAULT_LOCALE, type Locale, type TranslationKey };
