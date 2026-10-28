<script lang="ts">
  import { BRAND_NAME } from '$lib/brand';
  let { data } = $props();
</script>

<svelte:head><title>{BRAND_NAME} — Atelier</title></svelte:head>

<main>
  <h1>Nouveau projet cliente</h1>
  <p>De la photo du modèle au patron à l’échelle, étape par étape.</p>

  <ol class="etapes">
    {#each data.etapes as etape, i}
      <li><strong>Étape {i + 1}</strong> — {etape}</li>
    {/each}
  </ol>

  <p><span class="etiquette-rendu">rendu indicatif</span></p>

  {#if data.patronBloque}
    <section class="alerte" aria-live="polite">
      <h2>Patron non généré</h2>
      <p>Les formules de la jupe droite ne sont pas encore validées par un maître tailleur.</p>
      <ul>
        {#each data.raisonsBlocage as raison}<li>{raison}</li>{/each}
      </ul>
    </section>
  {/if}

  <button disabled title="Disponible à la phase suivante, après votre accord.">
    Commencer — phase suivante
  </button>
</main>
