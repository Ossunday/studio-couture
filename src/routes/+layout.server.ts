import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return { locale: locals.locale, utilisatrice: locals.utilisatrice, csrfToken: locals.csrfToken };
};
