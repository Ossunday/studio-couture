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
    variante?: 'primaire' | 'action' | 'fort' | 'secondaire' | 'discret';
    href?: string;
    type?: 'button' | 'submit';
    disabled?: boolean;
    nom?: string;
    children: Snippet;
  } = $props();

  const classe = $derived(`bouton-v3 bouton-${variante}`);
</script>

{#if href}
  <a class={classe} {href} aria-label={nom}>{@render children()}</a>
{:else}
  <button class={classe} {type} {disabled} aria-label={nom}>{@render children()}</button>
{/if}

<style>
  .bouton-v3 { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; min-width: 48px; padding: 12px 22px; border-radius: var(--rayon-bouton); border: 1.5px solid var(--encre); background: var(--encre); color: #fff; font-weight: 700; font-size: 1rem; text-decoration: none; cursor: pointer; transition: background-color var(--transition), border-color var(--transition), box-shadow var(--transition), transform var(--transition); }
  .bouton-v3:hover { box-shadow: var(--ombre-petite); }
  .bouton-v3:active { transform: translateY(1px); }
  /* Action historique : désormais noire (pilule v3). */
  .bouton-action { background: var(--encre); border-color: var(--encre); color: #fff; }
  /* Une seule action forte par écran : jaune-vert, texte encre. */
  .bouton-fort { background: var(--jaune-vert); border-color: var(--jaune-vert); color: var(--encre); }
  .bouton-secondaire { background: var(--carte); color: var(--encre); border-color: var(--bord-fort); }
  .bouton-discret { background: transparent; color: var(--bleu-texte); border-color: transparent; box-shadow: none; }
  .bouton-v3[disabled] { background: var(--carte); color: var(--texte-secondaire); border-color: var(--bord-fort); cursor: not-allowed; box-shadow: none; }
</style>
