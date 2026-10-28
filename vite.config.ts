import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    environment: 'node'
  },
  build: {
    // Budget connexion lente : on surveille la taille dans la CI / docs/BUDGET.md
    chunkSizeWarningLimit: 150
  }
});
