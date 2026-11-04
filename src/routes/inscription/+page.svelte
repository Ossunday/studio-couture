<script lang="ts">
  import ChampTexte from '$lib/design/ChampTexte.svelte';
  import PanneauAuth from '$lib/design/PanneauAuth.svelte';
  import { t, type TranslationKey } from '$lib/i18n';
  let { data, form } = $props();
  const lang = $derived(data.lang);
  const tr = (k: TranslationKey, p?: Record<string, string | number>) => t(lang, k, p);
</script>

<svelte:head><title>{tr('auth.inscription.titrePage')}</title></svelte:head>

{#if data.fermee}
  <main class="fermee">
    <h1>{tr('auth.inscription.fermeeTitre')}</h1>
    <p>{tr('auth.inscription.fermeeTexte')} <a href="/connexion">{tr('commun.seConnecter')}</a> — {tr('commun.ou')} <a href="/demo">{tr('auth.inscription.ouEssayer')}</a>.</p>
  </main>
{:else}
  <PanneauAuth {lang}>
    <p class="deja">{tr('auth.inscription.deja')} <a href="/connexion">{tr('commun.seConnecter')}</a></p>
    <div class="titre">
      <h1>{tr('auth.inscription.titre')}</h1>
      <p>{tr('auth.inscription.texte')}</p>
    </div>

    {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}

    <form method="post" class="grille-form">
      <ChampTexte label={tr('auth.nomAtelier')} name="nom_atelier" requis placeholder="Atelier Awa" valeur={form?.nomAtelier ?? ''} minlength={2} maxlength={80} />
      <ChampTexte label={tr('auth.votreNom')} name="nom" requis placeholder="Awa Diallo" autocomplete="name" valeur={form?.nom ?? ''} />
      <ChampTexte label={tr('auth.email')} name="email" type="email" requis placeholder="awa@atelier.com" autocomplete="email" valeur={form?.email ?? ''} />
      <ChampTexte label={tr('auth.motDePasse')} name="mot_de_passe" type="password" requis placeholder={tr('auth.motDePassePlaceholder')} autocomplete="new-password" aide={tr('auth.motDePasseAide')} />
      <ChampTexte label={tr('auth.confirmer')} name="mot_de_passe_confirmation" type="password" requis autocomplete="new-password" />

      <div class="consentement">
        <input id="consentement" name="consentement" type="checkbox" required />
        <label for="consentement">{tr('auth.consentement')}</label>
      </div>

      <!-- Champ piège anti-robots : invisible et hors tabulation, à laisser vide. -->
      <div class="piege" aria-hidden="true">
        <label for="site_web">{tr('auth.siteWeb')}</label>
        <input id="site_web" name="site_web" type="text" tabindex="-1" autocomplete="off" />
      </div>

      <button type="submit" class="plein">{tr('auth.inscription.bouton')}</button>
    </form>

    <div class="separateur" aria-hidden="true"><span></span><span class="ou">{tr('commun.ou')}</span><span></span></div>
    <a class="bouton-demo" href="/demo">{tr('commun.demoSansCompte')}</a>
  </PanneauAuth>
{/if}

<style>
  .fermee { max-width: 560px; margin: 48px auto; padding: 0 16px; text-align: center; }
  .deja { margin: 0; align-self: flex-end; font-size: 15px; color: var(--texte-secondaire); }
  .deja a { font-weight: 700; color: var(--encre); }
  .titre h1 { margin: 0 0 8px; font-size: 32px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; }
  .titre p { margin: 0; font-size: 16px; line-height: 1.5; color: var(--texte-secondaire); }
  .grille-form { display: grid; gap: 16px; }
  .plein { width: 100%; min-height: 56px; border-radius: 16px; font-size: 16px; }
  .consentement { display: flex; align-items: flex-start; gap: 12px; }
  .consentement input { width: 22px; height: 22px; min-width: 22px; margin: 2px 0 0; accent-color: var(--encre); }
  .consentement label { font-size: 14px; line-height: 1.5; color: #44444e; }
  .piege { position: absolute; left: -9999px; top: -9999px; width: 1px; height: 1px; overflow: hidden; }
  .separateur { display: flex; align-items: center; gap: 14px; }
  .separateur span:first-child, .separateur span:last-child { flex: 1; height: 1px; background: #dadae1; }
  .separateur .ou { font-size: 13px; color: var(--texte-secondaire); }
  .bouton-demo { height: 54px; min-height: 54px; border-radius: 16px; border: 1.5px solid var(--encre); display: flex; align-items: center; justify-content: center; text-decoration: none; font-weight: 700; font-size: 16px; color: var(--encre); background: var(--carte); }
</style>
