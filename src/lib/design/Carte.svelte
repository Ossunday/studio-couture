<script lang="ts">
  import type { Snippet } from 'svelte';
  let { titre, children, actions }: { titre?: string; children: Snippet; actions?: Snippet } = $props();
</script>

<section class="carte-v2">
  {#if titre || actions}
    <header>
      {#if titre}<h2>{titre}</h2>{/if}
      {#if actions}<div class="actions">{@render actions()}</div>{/if}
    </header>
  {/if}
  {@render children()}
</section>

<style>
  .carte-v2 { border: 1px solid var(--bord); border-radius: var(--rayon-carte); padding: 20px; background: var(--carte); box-shadow: var(--ombre-petite); }
  header { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  h2 { margin: 0; font-size: var(--titre-3); }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
