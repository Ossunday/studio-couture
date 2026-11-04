<script lang="ts">
  import { page } from '$app/state';
  import { t, type Lang } from '$lib/i18n';

  let { lang, csrfToken }: { lang: Lang; csrfToken?: string } = $props();
  const retour = $derived(page.url.pathname + page.url.search);
  // Pastille unique : elle affiche la langue active (drapeau + code) et
  // soumet la langue opposée. FR + drapeau français ⇄ ENG + drapeau américain.
  const cible = $derived(lang === 'fr' ? 'en' : 'fr');
  const codeAffiche = $derived(lang === 'fr' ? 'FR' : 'ENG');
  const nomCible = $derived(t(lang, cible === 'en' ? 'langue.en' : 'langue.fr'));
</script>

<form method="post" action="/langue" class="langue" aria-label={t(lang, 'langue.etiquette')}>
  <input type="hidden" name="_csrf" value={csrfToken ?? ''} />
  <input type="hidden" name="retour" value={retour} />
  <button
    type="submit"
    name="lang"
    value={cible}
    class="langue-bascule"
    aria-label={nomCible}
    title={nomCible}
    aria-pressed={lang === 'en'}
  >
    <span class="drapeau" aria-hidden="true">
      {#if lang === 'fr'}
        <!-- Drapeau français : trois bandes verticales, SVG original simple. -->
        <svg viewBox="0 0 24 16" focusable="false">
          <rect width="24" height="16" fill="#ffffff" />
          <rect width="8" height="16" fill="#0055a4" />
          <rect x="16" width="8" height="16" fill="#ef4135" />
        </svg>
      {:else}
        <!-- Drapeau américain simplifié : rayures, canton bleu et points pour les étoiles, SVG original. -->
        <svg viewBox="0 0 24 16" focusable="false">
          <rect width="24" height="16" fill="#ffffff" />
          <g fill="#b22234">
            <rect y="0" width="24" height="1.24" />
            <rect y="2.46" width="24" height="1.24" />
            <rect y="4.92" width="24" height="1.24" />
            <rect y="7.38" width="24" height="1.24" />
            <rect y="9.85" width="24" height="1.24" />
            <rect y="12.31" width="24" height="1.24" />
            <rect y="14.77" width="24" height="1.23" />
          </g>
          <rect width="11" height="8.62" fill="#3c3b6e" />
          <g fill="#ffffff">
            <circle cx="1.8" cy="1.8" r="0.75" /><circle cx="5.5" cy="1.8" r="0.75" /><circle cx="9.2" cy="1.8" r="0.75" />
            <circle cx="1.8" cy="4.3" r="0.75" /><circle cx="5.5" cy="4.3" r="0.75" /><circle cx="9.2" cy="4.3" r="0.75" />
            <circle cx="1.8" cy="6.8" r="0.75" /><circle cx="5.5" cy="6.8" r="0.75" /><circle cx="9.2" cy="6.8" r="0.75" />
          </g>
        </svg>
      {/if}
    </span>
    <span class="code">{codeAffiche}</span>
  </button>
</form>

<style>
  .langue { display: inline-flex; margin: 0; }
  /* Pastille blanche arrondie, drapeau à gauche et code à droite (référence fournie). */
  .langue-bascule {
    display: inline-flex; align-items: center; gap: 9px;
    min-height: 44px; min-width: 44px; padding: 6px 15px 6px 7px;
    border: 1px solid var(--bord, #e6e6ec); border-radius: 999px;
    background: #fff; color: var(--nuit, #23223a);
    font: inherit; font-size: 0.92rem; font-weight: 800; letter-spacing: 0.04em; line-height: 1;
    cursor: pointer; box-shadow: 0 2px 10px rgb(30 30 34 / 0.1);
  }
  .langue-bascule:hover { box-shadow: 0 4px 16px rgb(30 30 34 / 0.16); }
  .langue-bascule:focus-visible { outline: 3px solid var(--jaune-vert, #e9f74b); outline-offset: 2px; }
  .drapeau {
    width: 28px; height: 19px; flex: none; display: inline-flex;
    border-radius: 5px; overflow: hidden;
    box-shadow: inset 0 0 0 1px rgb(30 30 34 / 0.14);
  }
  .drapeau svg { width: 100%; height: 100%; display: block; }
  .code { display: inline-block; transform: translateY(0.5px); }
</style>
