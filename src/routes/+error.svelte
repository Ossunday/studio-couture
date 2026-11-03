<script lang="ts">
  import { page } from '$app/state';
  import { BRAND_NAME } from '$lib/brand';

  const introuvable = $derived(page.status === 404);
  const titre = $derived(introuvable ? 'Page introuvable' : 'Un problème est survenu');
  const message = $derived(
    introuvable
      ? 'La page que vous cherchez n’existe pas ou a été déplacée. Vérifiez l’adresse, ou revenez à l’accueil.'
      : 'Nous n’avons pas pu terminer cette demande. Vous pouvez revenir à l’accueil, puis réessayer dans un instant.'
  );
</script>

<svelte:head><title>{BRAND_NAME} — {titre}</title></svelte:head>

<main class="erreur-main">
  <section class="erreur-carte" aria-labelledby="titre-erreur">
    <p class="erreur-code" aria-hidden="true">{page.status}</p>
    <p class="erreur-puce">{introuvable ? 'Adresse introuvable' : 'Demande interrompue'}</p>
    <h1 id="titre-erreur">{titre}</h1>
    <p class="erreur-message">{message}</p>
    <p class="erreur-actions">
      <a class="bouton bouton-action" href="/">Retour à l’accueil</a>
    </p>
  </section>
</main>

<style>
  .erreur-main {
    display: grid;
    place-items: center;
    min-height: 52svh;
  }
  .erreur-carte {
    width: min(100%, 680px);
    border: 1px solid var(--bord);
    border-radius: var(--rayon-carte);
    background: var(--carte);
    box-shadow: var(--ombre-petite);
    padding: clamp(24px, 5vw, 44px);
    text-align: center;
  }
  .erreur-code {
    margin: 0;
    font-size: clamp(3.4rem, 12vw, 6rem);
    line-height: 0.95;
    font-weight: 800;
    letter-spacing: -0.06em;
    color: var(--bleu-pastille);
    -webkit-text-stroke: 1.5px var(--bleu-texte);
  }
  .erreur-puce {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    margin: 18px 0 0;
    padding: 4px 14px;
    border: 1px solid var(--peche);
    border-radius: var(--rayon-puce);
    background: var(--peche-pastille);
    color: var(--peche-texte);
    font-size: 0.9rem;
    font-weight: 700;
  }
  .erreur-carte h1 {
    margin: 16px 0 10px;
  }
  .erreur-message {
    max-width: 34rem;
    margin: 0 auto;
    color: var(--texte-secondaire);
    font-size: 1.05rem;
  }
  .erreur-actions {
    margin: 26px 0 0;
  }
</style>
