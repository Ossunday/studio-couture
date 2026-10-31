<script lang="ts">
  let { lignes = 3, label = 'Chargement en cours' }: { lignes?: number; label?: string } = $props();
</script>

<div class="squelette" role="status" aria-label={label}>
  {#each Array.from({ length: lignes }) as _, i}
    <div class="ligne" style="width:{88 - i * 14}%"></div>
  {/each}
</div>

<style>
  .squelette { display: grid; gap: 12px; padding: 20px; border: 1px solid var(--bord); border-radius: var(--rayon-carte); background: var(--carte); }
  .ligne { height: 18px; border-radius: 8px; background: linear-gradient(90deg, var(--bord) 25%, var(--fond) 50%, var(--bord) 75%); background-size: 200% 100%; animation: defile 1.4s ease infinite; }
  @keyframes defile { from { background-position: 120% 0; } to { background-position: -80% 0; } }
</style>
