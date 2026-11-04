<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t, type Lang, type TranslationKey } from '$lib/i18n';
  let { children, lang = 'fr' }: { children: Snippet; lang?: Lang } = $props();
  const tr = (k: TranslationKey) => t(lang, k);
  const benefices: TranslationKey[] = ['panneau.benefice1', 'panneau.benefice2', 'panneau.benefice3'];
</script>

<div class="auth-coque">
  <section class="auth-panneau" aria-label={tr('app.nom')}>
    <div class="auth-logo">
      <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true"><rect width="38" height="38" rx="11" fill="#B9C8F5" /><path d="M12 25c2 2.2 5 2.8 7.5 1.8 2.6-1 3-4 .6-5.2l-3.4-1.6c-2.4-1.2-2-4.2.6-5.2 2.4-1 5.3-.4 7.2 1.6" fill="none" stroke="#2A2940" stroke-width="2.6" stroke-linecap="round" /></svg>
      <span>{tr('app.nom')}</span>
    </div>

    <div class="auth-accroche">
      <h2>{tr('panneau.titre')}</h2>
      <p>{tr('panneau.texte')}</p>
      <ul>
        {#each benefices as cle}
          <li>
            <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="13" fill="#B9C8F5" /><path d="M8 13.4l3.2 3.2L18 9.8" fill="none" stroke="#2A2940" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
            {tr(cle)}
          </li>
        {/each}
      </ul>
    </div>

    <p class="auth-mention">{tr('panneau.mention')}</p>
  </section>

  <section class="auth-formulaire">
    <div class="auth-formulaire-inner">{@render children()}</div>
  </section>
</div>

<style>
  .auth-coque { display: flex; flex-wrap: wrap; min-height: 100svh; background: var(--fond); color: var(--encre); }
  .auth-panneau { flex: 1 1 520px; min-width: 0; background: var(--carte-sombre); color: #fff; padding: 40px 32px; display: flex; flex-direction: column; justify-content: space-between; gap: 32px; }
  .auth-logo { display: flex; align-items: center; gap: 12px; font-size: 19px; font-weight: 700; letter-spacing: -0.01em; }
  .auth-accroche { display: flex; flex-direction: column; gap: 22px; max-width: 520px; }
  .auth-accroche h2 { margin: 0; color: #fff; font-size: clamp(2rem, 5vw, 2.9rem); line-height: 1.06; font-weight: 800; letter-spacing: -0.025em; font-family: var(--sans); }
  .auth-accroche p { margin: 0; font-size: 17px; line-height: 1.55; color: #b9b8d3; }
  .auth-accroche ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
  .auth-accroche li { display: flex; align-items: center; gap: 12px; font-size: 16px; font-weight: 600; }
  .auth-accroche li svg { flex: none; }
  .auth-mention { margin: 0; font-size: 13px; line-height: 1.5; color: #b9b8d3; max-width: 280px; }
  .auth-formulaire { flex: 1 1 480px; min-width: 0; display: flex; align-items: center; justify-content: center; padding: 40px 20px; }
  .auth-formulaire-inner { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 20px; }
  @media (max-width: 760px) {
    .auth-panneau { padding: 28px 20px; gap: 22px; }
  }
</style>
