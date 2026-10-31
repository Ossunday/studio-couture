<script lang="ts">
  import { LIBELLES_VUES, composerPlanche, telechargerPlanche, type VuesApercu } from './planche';

  let {
    vues,
    mesuresTexte,
    tissuTexte,
    afficherPlanche = false
  }: { vues: VuesApercu; mesuresTexte: string; tissuTexte: string; afficherPlanche?: boolean } = $props();

  const entrees = $derived(LIBELLES_VUES.map((v) => ({ ...v, src: vues[v.cle] })));
  let dialogue = $state<HTMLDialogElement | null>(null);
  let indexOuvert = $state(0);
  let plancheUrl = $state('');

  $effect(() => {
    if (!afficherPlanche) return;
    let annule = false;
    composerPlanche(vues, mesuresTexte, tissuTexte)
      .then((url) => { if (!annule) plancheUrl = url; })
      .catch(() => { if (!annule) plancheUrl = ''; });
    return () => { annule = true; };
  });

  function ouvrir(i: number) {
    indexOuvert = i;
    dialogue?.showModal();
    dialogue?.querySelector('button')?.focus();
  }
  function naviguer(delta: number) {
    indexOuvert = (indexOuvert + delta + entrees.length) % entrees.length;
  }
  function touches(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); naviguer(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); naviguer(1); }
  }
</script>

<section class="apercu-3" aria-label="Aperçu en 3 images">
  <h3>Aperçu en 3 images</h3>
  {#if afficherPlanche && plancheUrl}
    <img class="planche" src={plancheUrl} alt="Planche de l’aperçu : pantalon large vu de face, en perspective et de dos" />
  {:else}
    <div class="vignettes">
      {#each entrees as vue, i}
        <button type="button" class="vignette" onclick={() => ouvrir(i)} aria-label="Agrandir la vue {vue.libelle}">
          <img src={vue.src} alt="Pantalon large, vue {vue.libelle.toLowerCase()}" data-vue={vue.cle} />
          <span>{vue.libelle}</span>
        </button>
      {/each}
    </div>
  {/if}
  <p><button type="button" class="bouton bouton-action" onclick={() => telechargerPlanche(vues, mesuresTexte, tissuTexte)}>Télécharger l’aperçu (PNG)</button></p>

  <dialog bind:this={dialogue} class="dialogue-vue" aria-label="Vue agrandie de l’aperçu" onkeydown={touches}>
    <div class="dialogue-entete">
      <h3 id="titre-vue-agrandie">{entrees[indexOuvert]?.libelle}</h3>
      <button type="button" onclick={() => dialogue?.close()} aria-label="Fermer la vue agrandie">✕</button>
    </div>
    <img src={entrees[indexOuvert]?.src} alt="Pantalon large, vue {entrees[indexOuvert]?.libelle.toLowerCase()} agrandie" />
    <div class="dialogue-nav">
      <button type="button" onclick={() => naviguer(-1)} aria-label="Vue précédente">← Précédente</button>
      <button type="button" onclick={() => naviguer(1)} aria-label="Vue suivante">Suivante →</button>
    </div>
  </dialog>
</section>

<style>
  .apercu-3 { margin-top: 14px; border-top: 3px solid var(--laiton); padding-top: 10px; }
  .vignettes { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px; max-width: 100%; }
  .vignette { flex: 0 0 auto; width: 118px; min-height: 48px; padding: 6px; display: grid; gap: 4px; justify-items: center; background: var(--papier); }
  .vignette img { width: 104px; height: 130px; object-fit: cover; border-radius: 8px; display: block; }
  .vignette span { font-weight: 700; font-size: 14px; }
  .planche { width: 100%; height: auto; display: block; border: 1px solid var(--bord); border-radius: 10px; }
  .dialogue-vue { border: 2px solid var(--laiton); border-radius: 16px; background: var(--papier); color: var(--encre); max-width: min(92vw, 560px); padding: 14px; }
  .dialogue-vue::backdrop { background: rgb(30 26 23 / 0.55); }
  .dialogue-vue img { width: 100%; height: auto; max-height: 68vh; object-fit: contain; display: block; }
  .dialogue-entete, .dialogue-nav { display: flex; gap: 10px; align-items: center; justify-content: space-between; }
  .dialogue-entete button, .dialogue-nav button { min-width: 48px; min-height: 48px; }
  .dialogue-entete h3 { margin: 6px 0; }
</style>
