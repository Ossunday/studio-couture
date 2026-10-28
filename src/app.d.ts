/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
    interface Locals {
      locale: 'fr';
      utilisatrice?: { id: string; atelierId: string; role: 'admin' | 'couturiere' };
    }
  }
}

export {};
