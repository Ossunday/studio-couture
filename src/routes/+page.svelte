<script lang="ts">
  import { BRAND_NAME } from '$lib/brand';
  import IllustrationModele from '$lib/illustrations/IllustrationModele.svelte';
  let { data } = $props();
</script>

<svelte:head><title>{BRAND_NAME} — Nouveau patron</title></svelte:head>

<main>
  <h1>Quel patron voulez-vous faire ?</h1>
  <p>Un modèle, quelques mesures, un patron. Moins de deux minutes, sans photo obligatoire.</p>

  {#if data.connectee}
    <div class="modeles">
      <a class="carte-modele" href="/patron/mesures?modele=pantalon_large">
        <IllustrationModele modele="pantalon_large" />
        <strong>Pantalon large</strong>
        <span>4 mesures au mètre ruban</span>
      </a>
      <a class="carte-modele" href="/patron/mesures?modele=jupe_droite">
        <IllustrationModele modele="jupe_droite" />
        <strong>Jupe droite</strong>
        <span>3 mesures au mètre ruban</span>
      </a>
      <div class="carte-modele bientot" aria-disabled="true">
        <strong>Autres modèles</strong>
        <span>Bientôt — robe, chemise…</span>
      </div>
    </div>
    <p><a href="/clientes">Voir mes clientes (photos et fiches, en option)</a></p>
  {:else}
    <p>Connectez-vous à votre atelier pour créer un patron.</p>
    <p><a class="bouton" href="/connexion">Se connecter à l’atelier</a></p>
  {/if}
</main>

<style>
  .modeles { display: grid; gap: 16px; margin: 20px 0; }
  .carte-modele { display: grid; gap: 6px; text-align: center; border: 2px solid #111; border-radius: 12px; padding: 20px 16px; color: inherit; text-decoration: none; font-size: 20px; }
  .carte-modele span { font-size: 16px; }
  .bientot { opacity: 0.65; border-style: dashed; }
</style>
