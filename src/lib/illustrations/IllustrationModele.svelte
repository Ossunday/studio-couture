<script lang="ts">
  // Illustration originale (SVG, aucune image externe) : vignette du modèle.
  let { modele }: { modele: 'pantalon_large' | 'jupe_droite' } = $props();
  const titre = $derived(modele === 'pantalon_large' ? 'Illustration : pantalon large, taille haute, jambes amples' : 'Illustration : jupe droite, longueur genou');
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
  {:else}
    <!-- jupe droite -->
    <path d="M45 45 h30 l4 55 h-38 z" fill="#dfe9f5" stroke="#111" stroke-width="2" stroke-linejoin="round" />
    <path d="M45 53 h30" stroke="#7a1f1f" stroke-width="2" stroke-dasharray="4 3" />
    <path d="M52 100 v28 M68 100 v28" stroke="#111" stroke-width="2" />
  {/if}
</svg>

<style>
  .vignette { width: 100%; max-width: 160px; height: auto; display: block; margin: 0 auto; }
</style>
