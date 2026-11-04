<script lang="ts">
  import Avatar from '$lib/design/Avatar.svelte';
  import Carte from '$lib/design/Carte.svelte';
  import Puce from '$lib/design/Puce.svelte';
  import { t, type TranslationKey } from '$lib/i18n';
  let { data } = $props();
  const lang = $derived(data.lang);
  const tr = (k: TranslationKey, p?: Record<string, string | number>) => t(lang, k, p);

  const roleLibelle = $derived(data.role === 'admin' ? tr('profil.admin') : tr('profil.couturiere'));
</script>

<svelte:head><title>{tr('profil.titrePage')}</title></svelte:head>

<main class="profil">
  <div class="profil-entete">
    <p class="sur-titre">{tr('profil.surtitre')}</p>
    <h1>{tr('profil.titre')}</h1>
    <p>{tr('profil.texte')}</p>
  </div>

  <Carte>
    <div class="qui">
      <Avatar nom={data.nom} taille={64} />
      <div class="identite">
        <strong>{data.nom}</strong>
        <Puce ton="bleu">{roleLibelle}</Puce>
      </div>
    </div>

    {#if data.role === 'admin'}
      <p class="action-equipe"><a class="bouton bouton-secondaire" href="/atelier/utilisatrices">{tr('profil.gererEquipe')}</a></p>
    {/if}

    <hr class="separateur" />
    <form method="post" action="/deconnexion">
      <input type="hidden" name="_csrf" value={data.csrfToken} />
      <button type="submit" class="bouton-secondaire">{tr('commun.seDeconnecter')}</button>
    </form>
  </Carte>
</main>

<style>
  .profil {
    max-width: 760px;
  }
  .profil-entete {
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
  .profil-entete h1 {
    margin: 0 0 8px;
  }
  .profil-entete p:last-child {
    margin: 0;
    color: var(--texte-secondaire);
    font-size: 1.05rem;
  }
  .profil :global(.carte-v2) {
    margin: 0;
    padding: clamp(20px, 4vw, 32px);
  }
  .qui {
    display: flex;
    gap: 16px;
    align-items: center;
    min-width: 0;
  }
  .identite {
    display: grid;
    gap: 8px;
    justify-items: start;
    min-width: 0;
  }
  .identite strong {
    font-size: 1.25rem;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }
  .action-equipe {
    margin: 22px 0 0;
  }
  .separateur {
    border: 0;
    border-top: 1px solid var(--bord);
    margin: 24px 0;
  }
  form {
    display: flex;
    flex-wrap: wrap;
  }
</style>
