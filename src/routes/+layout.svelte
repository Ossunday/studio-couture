<script lang="ts">
  import '../app.css';
  import '@fontsource/manrope/400.css';
  import '@fontsource/manrope/500.css';
  import '@fontsource/manrope/600.css';
  import '@fontsource/manrope/700.css';
  import '@fontsource/manrope/800.css';
  import { page } from '$app/state';
  import { BRAND_NAME } from '$lib/brand';
  import Avatar from '$lib/design/Avatar.svelte';
  import BoutonLangue from '$lib/design/BoutonLangue.svelte';
  import Rail from '$lib/design/Rail.svelte';
  import { t, type TranslationKey } from '$lib/i18n';
  let { children, data } = $props();
  const lang = $derived(data.lang);
  const tr = (k: TranslationKey, p?: Record<string, string | number>) => t(lang, k, p);
  // L'accueil public porte son propre en-tête bleu nuit et son pied (maquette Accueil).
  const estAccueil = $derived(page.url.pathname === '/');
</script>

{#if data.utilisatrice}
  <div class="coque">
    <Rail nom={data.utilisatrice.nom} role={data.utilisatrice.role} csrfToken={data.csrfToken} {lang} />
    <div class="contenu">
      <div class="barre-haut">
        <BoutonLangue {lang} csrfToken={data.csrfLangue} />
        <Avatar nom={data.utilisatrice.nom} taille={42} />
      </div>
      {@render children()}
      <footer>
        <p>{tr('commun.pied')}</p>
      </footer>
    </div>
  </div>
{:else if estAccueil}
  {@render children()}
{:else}
  <header class="entete-public">
    <div class="barre-publique">
      <p class="marque"><a href="/">{BRAND_NAME}</a></p>
      <nav aria-label={tr('nav.public')}>
        <a href="/demo">{tr('commun.demoGuidee')}</a>
        <a href="/inscription">{tr('commun.creerAtelier')}</a>
        <a class="bouton bouton-petit" href="/connexion">{tr('commun.espaceAtelier')}</a>
        <BoutonLangue {lang} csrfToken={data.csrfLangue} />
      </nav>
    </div>
  </header>
  {@render children()}
  <footer class="pied-public">
    <p>{tr('commun.pied')}</p>
  </footer>
{/if}

<style>
  .marque { font-weight: 800; font-size: 20px; margin: 0; letter-spacing: -0.01em; }
  .marque a { color: var(--encre); text-decoration: none; display: inline-flex; align-items: center; min-height: 48px; }

  /* --- Coque connectée : Rail à gauche (bureau) / barre basse (mobile) --- */
  .contenu { padding-bottom: 92px; }
  /* Pastille de langue en haut à droite, à côté de l'avatar (tableau de bord et écrans connectés). */
  .barre-haut { max-width: 1120px; margin: 0 auto; padding: 16px 16px 0; display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
  .contenu footer { max-width: 1120px; margin: 0 auto; padding: 12px 16px 24px; font-size: 15px; color: var(--texte-secondaire); }
  @media (min-width: 1024px) {
    .contenu { margin-left: 108px; padding-bottom: 0; }
  }

  /* --- Pages publiques : en-tête léger --- */
  .entete-public { background: var(--carte); border-bottom: 1px solid var(--bord); position: sticky; top: 0; z-index: 20; }
  .barre-publique { max-width: 1120px; margin: 0 auto; padding: 10px 16px; display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; justify-content: space-between; }
  .barre-publique nav { display: flex; gap: 10px 18px; align-items: center; flex-wrap: wrap; }
  .barre-publique nav a { display: inline-flex; align-items: center; font-weight: 600; }
  .bouton-petit { min-height: 48px; padding: 10px 18px; }
  .pied-public { max-width: 1120px; margin: 0 auto; padding: 12px 16px 32px; font-size: 15px; color: var(--texte-secondaire); }
</style>
