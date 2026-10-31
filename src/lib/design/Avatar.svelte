<script lang="ts">
  let { nom, taille = 48 }: { nom: string; taille?: number } = $props();

  const initiales = $derived(
    nom
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((m) => m.charAt(0).toUpperCase())
      .join('') || '?'
  );
  // Couleur stable dérivée du nom (même nom → même teinte, sans stockage).
  const teinte = $derived.by(() => {
    let h = 0;
    for (const c of nom) h = (h * 31 + c.charCodeAt(0)) % 360;
    return h;
  });
</script>

<span class="avatar" style="--taille:{taille}px; --teinte:{teinte}" aria-hidden="true">{initiales}</span>

<style>
  .avatar { display: inline-flex; align-items: center; justify-content: center; width: var(--taille); height: var(--taille); min-width: var(--taille); border-radius: 50%; font-weight: 700; font-size: calc(var(--taille) * 0.38); color: #fff; background: hsl(var(--teinte) 38% 38%); letter-spacing: 0.02em; }
</style>
