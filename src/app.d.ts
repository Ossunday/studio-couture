/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Locals {
      locale: 'fr';
      utilisatrice?: { id: string; atelierId: string; nom: string; role: 'admin' | 'couturiere' };
      csrfToken?: string;
    }
  }
}

export {};
