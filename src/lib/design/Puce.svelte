<script lang="ts">
  let { ton = 'neutre', children }: { ton?: 'neutre' | 'accent' | 'vert' | 'alerte'; children: import('svelte').Snippet } = $props();
</script>

<span class="puce puce-{ton}">{@render children()}</span>

<style>
  .puce { display: inline-flex; align-items: center; gap: 6px; min-height: 28px; padding: 3px 12px; border-radius: var(--rayon-puce); font-size: 0.85rem; font-weight: 650; border: 1px solid var(--bord); background: var(--fond); color: var(--encre); }
  .puce-accent { background: var(--terracotta-doux); border-color: var(--terracotta); color: var(--terracotta-fonce); }
  .puce-vert { background: #e7f0ec; border-color: var(--vert-cote); color: var(--vert); }
  .puce-alerte { background: var(--rouge-doux); border-color: var(--terracotta); color: var(--terracotta-fonce); }
</style>
