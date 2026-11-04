<script lang="ts">
  import { page } from '$app/state';
  import Avatar from '$lib/design/Avatar.svelte';
  import { t, type Lang, type TranslationKey } from '$lib/i18n';

  let {
    nom,
    role,
    csrfToken,
    lang = 'fr'
  }: { nom: string; role: 'admin' | 'couturiere'; csrfToken?: string; lang?: Lang } = $props();

  const tr = (k: TranslationKey) => t(lang, k);
  const chemin = $derived(page.url.pathname);
  const estActif = (href: string) => (href === '/' ? chemin === '/' : chemin.startsWith(href));

  const liens = $derived([
    { href: '/', libelle: tr('nav.accueil'), icone: 'accueil', actif: estActif('/') },
    { href: '/clientes', libelle: tr('nav.clientes'), icone: 'clientes', actif: estActif('/clientes') },
    { href: '/patron/mesures?modele=pantalon_large', libelle: tr('nav.patrons'), icone: 'patrons', actif: chemin.startsWith('/patron') },
    ...(role === 'admin'
      ? [{ href: '/atelier/utilisatrices', libelle: tr('nav.equipe'), icone: 'equipe', actif: estActif('/atelier') }]
      : [{ href: '/profil', libelle: tr('nav.profil'), icone: 'profil', actif: estActif('/profil') }])
  ]);
</script>

<nav class="rail" aria-label={tr('nav.atelier')}>
  <a class="rail-logo" href="/" aria-label={tr('nav.logoAccueil')}>
    <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true"><rect width="38" height="38" rx="11" fill="#B9C8F5" /><path d="M12 25c2 2.2 5 2.8 7.5 1.8 2.6-1 3-4 .6-5.2l-3.4-1.6c-2.4-1.2-2-4.2.6-5.2 2.4-1 5.3-.4 7.2 1.6" fill="none" stroke="#25252B" stroke-width="2.6" stroke-linecap="round" /></svg>
  </a>

  <ul class="rail-liens">
    {#each liens as lien}
      <li>
        <a href={lien.href} class:actif={lien.actif} aria-current={lien.actif ? 'page' : undefined}>
          {#if lien.icone === 'accueil'}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11 12 4l8 7v9h-6v-6H10v6H4z" fill="currentColor" /></svg>
          {:else if lien.icone === 'clientes'}
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" fill="currentColor" /><path d="M3.5 20c.6-3.4 2.8-5 5.5-5s4.9 1.6 5.5 5zM16 5.2a3.5 3.5 0 0 1 0 6.3M17.8 15.4c1.6.7 2.4 2.1 2.7 4.6h-3" fill="currentColor" /></svg>
          {:else if lien.icone === 'patrons'}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /><circle cx="19" cy="19" r="2.4" fill="currentColor" /></svg>
          {:else}
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor" /><path d="M5 21c.8-4 3.6-6 7-6s6.2 2 7 6z" fill="currentColor" /></svg>
          {/if}
          <span class="rail-libelle">{lien.libelle}</span>
        </a>
      </li>
    {/each}
  </ul>

  <div class="rail-bas">
    <span class="rail-avatar"><Avatar {nom} taille={40} /></span>
    <form method="post" action="/deconnexion">
      <input type="hidden" name="_csrf" value={csrfToken} />
      <button type="submit" class="rail-deconnexion">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        <span class="rail-libelle">{tr('commun.seDeconnecter')}</span>
      </button>
    </form>
  </div>
</nav>

<style>
  /* Mobile d'abord : barre d'onglets noire en bas, cibles ≥ 44 px. */
  .rail { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; display: flex; align-items: center; gap: 4px; background: var(--rail); color: #fff; padding: 6px 8px calc(6px + env(safe-area-inset-bottom)); box-shadow: 0 -6px 24px rgb(30 30 34 / 0.18); }
  .rail-logo, .rail-avatar { display: none; }
  .rail-liens { list-style: none; margin: 0; padding: 0; display: flex; flex: 1; gap: 4px; }
  .rail-liens li { flex: 1; }
  .rail-liens a, .rail-deconnexion { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 52px; min-width: 44px; width: 100%; padding: 6px 4px; border-radius: 999px; color: #d9d9e2; text-decoration: none; font-weight: 600; font-size: 0.72rem; background: transparent; border: 0; cursor: pointer; }
  .rail-liens a svg, .rail-deconnexion svg { width: 22px; height: 22px; flex: none; }
  .rail-liens a.actif { background: #fff; color: var(--encre); }
  .rail-bas { display: flex; align-items: center; gap: 4px; }
  .rail-bas form { display: flex; }
  .rail-deconnexion .rail-libelle { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .rail a:focus-visible, .rail button:focus-visible { outline: 3px solid var(--jaune-vert); outline-offset: 2px; }

  /* Bureau : rail noir arrondi flottant de 76 px, déconnexion en bas. */
  @media (min-width: 1024px) {
    .rail { left: 16px; right: auto; top: 16px; bottom: 16px; width: 76px; flex-direction: column; border-radius: 28px; padding: 14px 8px; box-shadow: var(--ombre); }
    .rail-logo { display: inline-flex; min-height: 44px; min-width: 44px; align-items: center; justify-content: center; }
    .rail-liens { flex-direction: column; flex: none; width: 100%; margin-top: 18px; gap: 8px; }
    .rail-liens li { flex: none; }
    .rail-liens a { min-height: 58px; }
    .rail-bas { margin-top: auto; flex-direction: column; gap: 10px; }
    .rail-avatar { display: inline-flex; }
    .rail-deconnexion .rail-libelle { position: static; width: auto; height: auto; overflow: visible; clip: auto; white-space: normal; font-size: 0.62rem; }
  }
</style>
