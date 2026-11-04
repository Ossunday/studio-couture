<script lang="ts">
  import { t, type TranslationKey } from '$lib/i18n';
  let { data, form } = $props();

  /** Clé pas encore dans fr.ts/en.ts : proposée dans le rapport du lot (clé=FR=EN). */
  const txt = (k: string, params?: Record<string, string | number>) => t(data.lang, k as TranslationKey, params);
</script>

<svelte:head><title>{t(data.lang, 'equipe.titrePage')}</title></svelte:head>

<main>
  <h1>{t(data.lang, 'equipe.titre')}</h1>
  <p>{txt('equipe.adminTexte')}</p>
  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
  {#if form?.cree}<p role="status">{txt('equipe.compteCree')}</p>{/if}
  <form method="post" class="grille">
    <input type="hidden" name="_csrf" value={data.csrfToken} />
    <label>{t(data.lang, 'equipe.nom')} <input name="nom" required autocomplete="name" /></label>
    <label>{t(data.lang, 'equipe.identifiant')} <input name="identifiant" required autocomplete="username" /></label>
    <label>{txt('equipe.motDePasse10')} <input name="mot_de_passe" type="password" required autocomplete="new-password" /></label>
    <label>{txt('equipe.role')}
      <select name="role">
        <option value="couturiere">{t(data.lang, 'profil.couturiere')}</option>
        <option value="admin">{t(data.lang, 'profil.admin')}</option>
      </select>
    </label>
    <button type="submit">{t(data.lang, 'equipe.creer')}</button>
  </form>
</main>
