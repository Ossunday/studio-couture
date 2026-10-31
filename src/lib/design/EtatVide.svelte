<script lang="ts">
  import type { Snippet } from 'svelte';
  let { titre, texte, children }: { titre: string; texte?: string; children?: Snippet } = $props();
</script>

<div class="etat-vide-v2">
  <svg viewBox="0 0 64 64" class="illustration" aria-hidden="true" focusable="false">
    <circle cx="32" cy="32" r="29" fill="var(--laiton-doux)" opacity="0.55" />
    <path d="M20 44c6-14 18-22 24-24-2 8-8 20-22 26" fill="none" stroke="var(--terracotta)" stroke-width="3" stroke-linecap="round" />
    <circle cx="22" cy="42" r="3.5" fill="var(--vert)" />
    <path d="M38 14l2.5 5 5 2.5-5 2.5L38 29l-2.5-5-5-2.5 5-2.5z" fill="var(--laiton)" />
  </svg>
  <h3>{titre}</h3>
  {#if texte}<p>{texte}</p>{/if}
  {#if children}<div class="action">{@render children()}</div>{/if}
</div>

<style>
  .etat-vide-v2 { border: 1.5px dashed var(--bord-fort); border-radius: var(--rayon-carte); padding: 32px 20px; text-align: center; background: var(--carte); }
  .illustration { width: 64px; height: 64px; }
  h3 { margin: 10px 0 4px; }
  p { margin: 0 auto; max-width: 34rem; color: var(--encre-douce); }
  .action { margin-top: 16px; display: flex; justify-content: center; }
</style>
