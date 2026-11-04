<script lang="ts">
  import ChampTexte from '$lib/design/ChampTexte.svelte';
  import PanneauAuth from '$lib/design/PanneauAuth.svelte';
  import { t, type TranslationKey } from '$lib/i18n';
  let { data, form } = $props();
  const lang = $derived(data.lang);
  const tr = (k: TranslationKey, p?: Record<string, string | number>) => t(lang, k, p);
</script>

<svelte:head><title>{tr('auth.connexion.titrePage')}</title></svelte:head>

<PanneauAuth {lang}>
  <p class="deja">{tr('auth.connexion.pasAtelier')} <a href="/inscription">{tr('commun.creerAtelier')}</a></p>
  <div class="titre">
    <h1>{tr('auth.connexion.titre')}</h1>
    <p>{tr('auth.connexion.texte')}</p>
  </div>

  {#if data.installationRequise}
    <p class="alerte">{tr('auth.connexion.aucunCompte')} <a href="/installation">{tr('auth.connexion.creerAdmin')}</a> {tr('commun.ou')} <a href="/inscription">{tr('auth.connexion.ouvrirAtelier')}</a>.</p>
  {/if}
  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}

  <form method="post" class="grille-form">
    <ChampTexte label={tr('auth.identifiant')} name="identifiant" autocomplete="username" requis valeur={form?.identifiant ?? ''} />
    <ChampTexte label={tr('auth.motDePasse')} name="mot_de_passe" type="password" autocomplete="current-password" requis />
    <button type="submit" class="plein">{tr('auth.connexion.bouton')}</button>
  </form>

  <div class="separateur" aria-hidden="true"><span></span><span class="ou">{tr('commun.ou')}</span><span></span></div>
  <a class="bouton-demo" href="/demo">{tr('commun.demoSansCompte')}</a>
  <p class="creer"><a href="/inscription">{tr('commun.creerAtelier')}</a></p>
</PanneauAuth>

<style>
  .deja { margin: 0; align-self: flex-end; font-size: 15px; color: var(--texte-secondaire); }
  .deja a { font-weight: 700; color: var(--encre); }
  .titre h1 { margin: 0 0 8px; font-size: 32px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; }
  .titre p { margin: 0; font-size: 16px; line-height: 1.5; color: var(--texte-secondaire); }
  .grille-form { display: grid; gap: 16px; }
  .plein { width: 100%; min-height: 56px; border-radius: 16px; font-size: 16px; }
  .separateur { display: flex; align-items: center; gap: 14px; }
  .separateur span:first-child, .separateur span:last-child { flex: 1; height: 1px; background: var(--bord-fort); }
  .separateur .ou { font-size: 13px; color: var(--texte-secondaire); }
  .bouton-demo { height: 54px; min-height: 54px; border-radius: 16px; border: 1.5px solid var(--encre); display: flex; align-items: center; justify-content: center; text-decoration: none; font-weight: 700; font-size: 16px; color: var(--encre); background: var(--carte); }
  .creer { margin: 0; text-align: center; }
</style>
