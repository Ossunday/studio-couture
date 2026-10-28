<script lang="ts">
  // Illustration originale : silhouette neutre de face, trait de mesure surligné en rouge.
  let { code }: { code: string } = $props();

  const titres: Record<string, string> = {
    tour_taille_cm: 'Illustration : mesurer le tour de taille, au creux naturel de la taille',
    tour_hanches_cm: 'Illustration : mesurer le tour de hanches, à l’endroit le plus fort',
    hauteur_fourche_cm: 'Illustration : mesurer la hauteur de fourche, assise, de la taille à la chaise',
    longueur_pantalon_cm: 'Illustration : mesurer la longueur du pantalon, de la taille au sol, le long du côté',
    longueur_jupe_cm: 'Illustration : mesurer la longueur de la jupe, de la taille à la longueur souhaitée'
  };
  const titre = $derived(titres[code] ?? 'Illustration : silhouette avec le trait de mesure surligné');
</script>

<svg viewBox="0 0 120 160" role="img" aria-label={titre} class="mesure">
  <title>{titre}</title>
  <!-- silhouette neutre de face -->
  <circle cx="60" cy="12" r="8" fill="none" stroke="#111" stroke-width="2" />
  <path d="M60 20 v30 M38 32 l22 8 l22 -8 M46 50 l-3 95 M74 50 l3 95" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" />
  {#if code === 'tour_taille_cm'}
    <ellipse cx="60" cy="46" rx="17" ry="4" fill="none" stroke="#7a1f1f" stroke-width="4" />
    <path d="M85 46 h14 M95 42 l5 4 l-5 4 M99 42 l-5 4 l5 4" stroke="#7a1f1f" stroke-width="2" fill="none" />
  {:else if code === 'tour_hanches_cm'}
    <ellipse cx="60" cy="66" rx="20" ry="5" fill="none" stroke="#7a1f1f" stroke-width="4" />
    <path d="M88 66 h12 M96 62 l5 4 l-5 4 M100 62 l-5 4 l5 4" stroke="#7a1f1f" stroke-width="2" fill="none" />
  {:else if code === 'hauteur_fourche_cm'}
    <!-- assise sur une chaise : taille → assise -->
    <path d="M78 110 h30 v35" fill="none" stroke="#111" stroke-width="2" />
    <path d="M60 46 v64" stroke="#7a1f1f" stroke-width="4" />
    <path d="M54 52 l6 -6 l6 6 M54 104 l6 6 l6 -6" stroke="#7a1f1f" stroke-width="2" fill="none" />
  {:else if code === 'longueur_pantalon_cm'}
    <path d="M82 46 v99" stroke="#7a1f1f" stroke-width="4" />
    <path d="M76 52 l6 -6 l6 6 M76 139 l6 6 l6 -6" stroke="#7a1f1f" stroke-width="2" fill="none" />
  {:else if code === 'longueur_jupe_cm'}
    <path d="M84 46 v58" stroke="#7a1f1f" stroke-width="4" />
    <path d="M78 52 l6 -6 l6 6 M78 98 l6 6 l6 -6" stroke="#7a1f1f" stroke-width="2" fill="none" />
  {/if}
</svg>

<style>
  .mesure { width: 72px; height: auto; flex: none; }
</style>
