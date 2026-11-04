<script lang="ts">
  import { couleurTissu, dessinerTextureTissu, type MatiereId } from './tissus';
  import { t, type Lang, type TranslationKey } from '$lib/i18n';

  let { couleurId, matiere, legende = '', lang = 'fr' }: { couleurId: string; matiere: MatiereId; legende?: string; lang?: Lang } = $props();
  const cle = (k: string) => k as TranslationKey;
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
  <canvas bind:this={canvas} width="192" height="192" data-testid="loupe-tissu" aria-label={t(lang, cle('tissu.loupeAria'))}></canvas>
  <figcaption>{legende || t(lang, cle('tissu.loupe'))}</figcaption>
</figure>

<style>
  .loupe { margin: 0; display: grid; justify-items: center; gap: 6px; }
  .loupe canvas { width: 96px; height: 96px; min-width: 96px; border-radius: 999px; border: 3px solid var(--laiton); box-shadow: var(--ombre-petite); background: var(--papier); }
  .loupe figcaption { font-size: 13px; font-weight: 600; text-align: center; }
</style>
