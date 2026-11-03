<script lang="ts">
  let {
    valeur,
    max = 100,
    libelle
  }: { valeur: number; max?: number; libelle: string } = $props();

  const pct = $derived(max > 0 ? Math.min(100, Math.max(0, Math.round((valeur / max) * 100))) : 0);
</script>

<div class="barre-progression">
  <span class="sr-only">{libelle} : {valeur} sur {max}</span>
  <div class="piste" role="progressbar" aria-label={libelle} aria-valuemin="0" aria-valuemax={max} aria-valuenow={valeur} aria-valuetext="{valeur} sur {max}">
    <div class="remplissage" style="width:{pct}%"></div>
  </div>
</div>

<style>
  .piste { height: 10px; border-radius: 999px; background: var(--bord); overflow: hidden; }
  .remplissage { height: 100%; border-radius: 999px; background: var(--bleu); transition: width var(--transition); }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
