<script lang="ts">
  import Avatar from '$lib/design/Avatar.svelte';
  import Bouton from '$lib/design/Bouton.svelte';
  import EtatVide from '$lib/design/EtatVide.svelte';
  import Puce from '$lib/design/Puce.svelte';
  import { formatDateComplete, t } from '$lib/i18n';
  let { data } = $props();
</script>

<svelte:head><title>{t(data.lang, 'clientes.titrePage')}</title></svelte:head>

<main>
  <div class="entete-liste">
    <h1>{t(data.lang, 'clientes.titre')}</h1>
    <Bouton variante="action" href="/clientes/nouvelle">{t(data.lang, 'clientes.nouvelle')}</Bouton>
  </div>

  <form method="get" class="recherche" role="search">
    <label class="sr-only" for="recherche-clientes">{t(data.lang, 'clientes.rechercherPlaceholder')}</label>
    <input id="recherche-clientes" name="q" value={data.recherche} placeholder={t(data.lang, 'clientes.rechercherPlaceholder')} />
    <button type="submit">{t(data.lang, 'clientes.rechercher')}</button>
  </form>

  {#if data.clientes.length === 0}
    {#if data.recherche}
      <EtatVide titre={t(data.lang, 'clientes.aucunResultat')} texte={t(data.lang, 'clientes.aucunResultatTexte')} />
    {:else}
      <EtatVide titre={t(data.lang, 'clientes.aucune')} texte={t(data.lang, 'clientes.aucuneTexte')}>
        <Bouton variante="action" href="/clientes/nouvelle">{t(data.lang, 'clientes.creerPremiere')}</Bouton>
      </EtatVide>
    {/if}
  {:else}
    <ul class="grille-clientes">
      {#each data.clientes as cliente}
        <li>
          <a class="carte-cliente" href="/clientes/{cliente.id}">
            <Avatar nom={cliente.nom} taille={52} />
            <span class="infos">
              <strong>{cliente.nom}</strong>
              <span class="meta">{cliente.telephone ?? t(data.lang, 'tableau.telephoneNonRenseigne')} · {formatDateComplete(data.lang, cliente.creeeLe)}</span>
              {#if cliente.dernierPatronLe}<span class="meta">{t(data.lang, 'tableau.dernierPatron')} · {formatDateComplete(data.lang, cliente.dernierPatronLe)}</span>{/if}
            </span>
            <Puce ton={cliente.nbPatrons > 0 ? 'vert' : 'neutre'}>{t(data.lang, 'clientes.patronsSur', { n: cliente.nbPatrons })}</Puce>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  .entete-liste { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
  .entete-liste h1 { margin: 8px 0; }
  .recherche { display: flex; gap: 10px; margin: 18px 0 22px; max-width: 640px; }
  .recherche input { flex: 1; min-height: 48px; font: inherit; padding: 10px 14px; border: 1.5px solid var(--bord-fort); border-radius: 12px; background: #fff; color: var(--encre); }
  .grille-clientes { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
  @media (min-width: 760px) { .grille-clientes { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); } }
  .carte-cliente { display: flex; gap: 14px; align-items: center; padding: 16px; background: var(--carte); border: 1px solid var(--bord); border-radius: var(--rayon-carte); box-shadow: var(--ombre-petite); color: var(--encre); text-decoration: none; transition: transform var(--transition), box-shadow var(--transition); }
  .carte-cliente:hover { transform: translateY(-2px); box-shadow: var(--ombre); }
  .infos { display: grid; gap: 2px; flex: 1; min-width: 0; }
  .infos strong { font-size: 1.1rem; overflow-wrap: anywhere; }
  .meta { color: var(--encre-douce); font-size: 0.92rem; }
</style>
