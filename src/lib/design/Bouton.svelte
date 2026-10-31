<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    variante = 'primaire',
    href,
    type = 'button',
    disabled = false,
    nom,
    children
  }: {
    variante?: 'primaire' | 'action' | 'secondaire' | 'discret';
    href?: string;
    type?: 'button' | 'submit';
    disabled?: boolean;
    nom?: string;
    children: Snippet;
  } = $props();

  const classe = $derived(`bouton-v2 bouton-${variante}`);
</script>

{#if href}
  <a class={classe} {href} aria-label={nom}>{@render children()}</a>
{:else}
  <button class={classe} {type} {disabled} aria-label={nom}>{@render children()}</button>
{/if}

<style>
  .bouton-v2 { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; min-width: 48px; padding: 12px 22px; border-radius: var(--rayon); border: 1.5px solid var(--primaire); background: var(--primaire); color: var(--primaire-texte); font-weight: 650; font-size: 1rem; text-decoration: none; cursor: pointer; transition: background-color var(--transition), border-color var(--transition), box-shadow var(--transition), transform var(--transition); }
  .bouton-v2:hover { box-shadow: var(--ombre-petite); }
  .bouton-v2:active { transform: translateY(1px); }
  .bouton-action { background: var(--terracotta); border-color: var(--terracotta); color: #fff; }
  .bouton-action:hover { background: var(--terracotta-fonce); border-color: var(--terracotta-fonce); }
  .bouton-secondaire { background: var(--carte); color: var(--encre); border-color: var(--bord-fort); }
  .bouton-discret { background: transparent; color: var(--vert); border-color: transparent; box-shadow: none; }
  .bouton-v2[disabled] { background: var(--papier); color: var(--encre-douce); border-color: var(--bord-fort); cursor: not-allowed; box-shadow: none; }
</style>
