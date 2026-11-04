<script lang="ts">
  import { page } from '$app/state';
  import { BRAND_NAME } from '$lib/brand';
  import { t, type Lang, type TranslationKey } from '$lib/i18n';

  const lang = $derived<Lang>((page.data as { lang?: unknown }).lang === 'en' ? 'en' : 'fr');
  const tr = (k: TranslationKey) => t(lang, k);
  const introuvable = $derived(page.status === 404);
  // Le moteur et les gardes lèvent des clés (« erreur.csrf », « erreur.adminSeule »), jamais du texte.
  const cleMessage = $derived.by<TranslationKey | null>(() => {
    const brut = page.error?.message ?? '';
    return /^[a-z]+(\.[a-zA-Z]+)+$/.test(brut) ? (brut as TranslationKey) : null;
  });
  const titre = $derived(tr(introuvable ? 'erreur.404.titre' : 'erreur.500.titre'));
  const message = $derived(cleMessage ? tr(cleMessage) : tr(introuvable ? 'erreur.404.message' : 'erreur.500.message'));
</script>

<svelte:head><title>{BRAND_NAME} — {titre}</title></svelte:head>

<main class="erreur-main">
  <section class="erreur-carte" aria-labelledby="titre-erreur">
    <p class="erreur-code" aria-hidden="true">{page.status}</p>
    <p class="erreur-puce">{tr(introuvable ? 'erreur.404.puce' : 'erreur.500.puce')}</p>
    <h1 id="titre-erreur">{titre}</h1>
    <p class="erreur-message">{message}</p>
    <p class="erreur-actions">
      <a class="bouton bouton-action" href="/">{tr('commun.retourAccueil')}</a>
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
