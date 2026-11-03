<script lang="ts">
  import type { ModelePatron } from '$lib/patterns/registre';
  // Illustration originale (SVG, aucune image externe) : vignette du modèle.
  let { modele }: { modele: ModelePatron } = $props();
  const TITRES: Record<ModelePatron, string> = {
    pantalon_large: 'Illustration : pantalon large, taille haute, jambes amples',
    jupe_droite: 'Illustration : jupe droite, longueur genou',
    robe_fourreau: 'Illustration : robe fourreau, encolure ronde, longueur genou'
  };
  const titre = $derived(TITRES[modele]);
</script>

<svg viewBox="0 0 120 150" role="img" aria-label={titre} class="vignette">
  <title>{titre}</title>
  <!-- silhouette neutre -->
  <circle cx="60" cy="14" r="9" fill="none" stroke="#111" stroke-width="2" />
  <path d="M60 23 v22" stroke="#111" stroke-width="2" />
  {#if modele === 'pantalon_large'}
    <!-- ceinture puis jambes larges -->
    <path d="M44 45 h32 l6 78 h-16 l-6 -52 l-6 52 h-16 z" fill="#f3e2c7" stroke="#111" stroke-width="2" stroke-linejoin="round" />
    <path d="M44 53 h32" stroke="#7a1f1f" stroke-width="2" stroke-dasharray="4 3" />
  {:else if modele === 'jupe_droite'}
    <!-- jupe droite -->
    <path d="M45 45 h30 l4 55 h-38 z" fill="#dfe9f5" stroke="#111" stroke-width="2" stroke-linejoin="round" />
    <path d="M45 53 h30" stroke="#7a1f1f" stroke-width="2" stroke-dasharray="4 3" />
    <path d="M52 100 v28 M68 100 v28" stroke="#111" stroke-width="2" />
  {:else}
    <!-- robe fourreau : corsage ajusté, encolure ronde, jupe droite au genou -->
    <path d="M46 45 q14 -6 28 0 l3 18 l-4 6 l5 46 h-36 l5 -46 l-4 -6 z" fill="#e9ddf5" stroke="#111" stroke-width="2" stroke-linejoin="round" />
    <path d="M52 44 q8 5 16 0" fill="none" stroke="#7a1f1f" stroke-width="2" />
    <path d="M47 84 h26" stroke="#7a1f1f" stroke-width="2" stroke-dasharray="4 3" />
    <path d="M53 115 v14 M67 115 v14" stroke="#111" stroke-width="2" />
  {/if}
</svg>

<style>
  .vignette { width: 100%; max-width: 160px; height: auto; display: block; margin: 0 auto; }
</style>
