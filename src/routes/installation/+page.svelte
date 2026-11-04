<script lang="ts">
  import Carte from '$lib/design/Carte.svelte';
  import ChampTexte from '$lib/design/ChampTexte.svelte';
  import { t, type TranslationKey } from '$lib/i18n';
  let { data, form } = $props();
  const lang = $derived(data.lang);
  const tr = (k: TranslationKey, p?: Record<string, string | number>) => t(lang, k, p);
</script>

<svelte:head><title>{tr('auth.installation.titrePage')}</title></svelte:head>

<main class="installation">
  <div class="installation-entete">
    <p class="sur-titre">{tr('auth.installation.surtitre')}</p>
    <h1>{tr('auth.installation.titre')}</h1>
    <p>{tr('auth.installation.texte')}</p>
  </div>

  <Carte>
    {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
    <form method="post" class="grille-form">
      <ChampTexte label={tr('auth.nomAtelier')} name="nom_atelier" requis autocomplete="organization" />
      <ChampTexte label={tr('auth.votreNom')} name="nom" requis autocomplete="name" />
      <ChampTexte label={tr('auth.identifiant')} name="identifiant" requis autocomplete="username" />
      <ChampTexte label={tr('auth.installation.motDePasse')} name="mot_de_passe" type="password" requis autocomplete="new-password" aide={tr('auth.installation.aide')} />
      <button type="submit" class="plein">{tr('auth.installation.bouton')}</button>
    </form>
  </Carte>
</main>

<style>
  .installation {
    max-width: 760px;
  }
  .installation-entete {
    margin: 10px 0 22px;
  }
  .sur-titre {
    margin: 0 0 8px;
    color: var(--bleu-texte);
    font-size: 0.88rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .installation-entete h1 {
    margin: 0 0 8px;
  }
  .installation-entete p:last-child {
    margin: 0;
    color: var(--texte-secondaire);
    font-size: 1.05rem;
  }
  .installation :global(.carte-v2) {
    margin: 0;
    padding: clamp(20px, 4vw, 32px);
  }
  .grille-form {
    display: grid;
    gap: 16px;
  }
  .plein {
    width: 100%;
    min-height: 56px;
    margin-top: 4px;
    font-size: 1rem;
  }
</style>
