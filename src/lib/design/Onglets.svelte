<script lang="ts">
  let {
    onglets,
    actif,
    ariaLabel = 'Sections'
  }: {
    onglets: readonly { id: string; libelle: string; href: string; badge?: string }[];
    actif: string;
    ariaLabel?: string;
  } = $props();
</script>

<nav class="onglets-v2" aria-label={ariaLabel}>
  {#each onglets as onglet}
    <a href={onglet.href} class:actif={onglet.id === actif} aria-current={onglet.id === actif ? 'page' : undefined}>
      {onglet.libelle}
      {#if onglet.badge}<span class="badge">{onglet.badge}</span>{/if}
    </a>
  {/each}
</nav>

<style>
  .onglets-v2 { display: flex; gap: 6px; overflow-x: auto; padding: 4px; background: var(--carte); border: 1px solid var(--bord); border-radius: var(--rayon-puce); max-width: 100%; }
  a { display: inline-flex; align-items: center; gap: 8px; min-height: 48px; padding: 10px 18px; border-radius: var(--rayon-puce); color: var(--encre); text-decoration: none; font-weight: 600; white-space: nowrap; transition: background-color var(--transition), color var(--transition); }
  a:hover { background: var(--fond); }
  a.actif { background: var(--primaire); color: var(--primaire-texte); }
  .badge { background: var(--terracotta); color: #fff; border-radius: var(--rayon-puce); padding: 1px 9px; font-size: 0.8rem; font-weight: 700; }
  a.actif .badge { background: #fff; color: var(--terracotta-fonce); }
</style>
