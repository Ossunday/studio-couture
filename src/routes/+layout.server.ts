import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    locale: locals.locale,
    lang: locals.lang,
    utilisatrice: locals.utilisatrice,
    csrfToken: locals.csrfToken,
    csrfLangue: locals.csrfLangue
  };
};
