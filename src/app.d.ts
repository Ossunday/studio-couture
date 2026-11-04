/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Locals {
      locale: import('$lib/i18n').Lang;
      lang: import('$lib/i18n').Lang;
      utilisatrice?: { id: string; atelierId: string; nom: string; role: 'admin' | 'couturiere' };
      csrfToken?: string;
      /** Jeton CSRF anonyme (cookie dédié) pour le formulaire public de changement de langue. */
      csrfLangue?: string;
    }
  }
}

export {};
