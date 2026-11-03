<script lang="ts">
  let { ton = 'neutre', children }: { ton?: 'neutre' | 'accent' | 'vert' | 'alerte' | 'bleu' | 'lavande' | 'peche' | 'fort'; children: import('svelte').Snippet } = $props();
</script>

<span class="puce puce-{ton}">{@render children()}</span>

<style>
  .puce { display: inline-flex; align-items: center; gap: 6px; min-height: 28px; padding: 3px 12px; border-radius: var(--rayon-puce); font-size: 0.85rem; font-weight: 650; border: 1px solid var(--bord); background: var(--fond); color: var(--encre); }
  .puce-accent { background: var(--peche-pastille); border-color: var(--peche); color: var(--peche-texte); }
  .puce-vert { background: var(--bleu-pastille); border-color: var(--bleu); color: var(--bleu-texte); }
  .puce-alerte { background: var(--rouge-doux); border-color: var(--cote); color: var(--cote-texte); }
  .puce-bleu { background: var(--bleu-pastille); border-color: var(--bleu-pastille); color: var(--bleu-texte); }
  .puce-lavande { background: var(--lavande-pastille); border-color: var(--lavande-pastille); color: var(--lavande-texte); }
  .puce-peche { background: var(--peche-pastille); border-color: var(--peche-pastille); color: var(--peche-texte); }
  .puce-fort { background: var(--jaune-vert); border-color: var(--jaune-vert); color: var(--jaune-vert-texte); }
</style>
