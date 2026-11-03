<script lang="ts">
  import { couleurTissu, dessinerTextureTissu, type MatiereId } from './tissus';

  let { couleurId, matiere, legende = '' }: { couleurId: string; matiere: MatiereId; legende?: string } = $props();
  let canvas = $state<HTMLCanvasElement | null>(null);

  $effect(() => {
    const c = couleurTissu(couleurId);
    const m = matiere;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    dessinerTextureTissu(ctx, canvas.width, canvas.height, c, m);
  });
</script>

<figure class="loupe">
  <canvas bind:this={canvas} width="192" height="192" data-testid="loupe-tissu" aria-label="Gros plan du tissu choisi, dessiné par code"></canvas>
  <figcaption>{legende || 'Gros plan du tissu'}</figcaption>
</figure>

<style>
  .loupe { margin: 0; display: grid; justify-items: center; gap: 6px; }
  .loupe canvas { width: 96px; height: 96px; min-width: 96px; border-radius: 999px; border: 3px solid var(--laiton); box-shadow: var(--ombre-petite); background: var(--papier); }
  .loupe figcaption { font-size: 13px; font-weight: 600; text-align: center; }
</style>
