<script lang="ts">
  import IllustrationMesure from '$lib/illustrations/IllustrationMesure.svelte';
  import { t, formatCm, type Lang, type TranslationKey } from '$lib/i18n';
  let { data, form } = $props();
  const lang: Lang = $derived(data.lang ?? 'fr');
  const cle = (k: string) => k as TranslationKey;

  // Aides de prise de mesure par code (clés proposées aideMesure.* / aideMesure.exemple.*).
  const aideCle = (code: string) => cle(`aideMesure.${code}`);
  const exempleCle = (code: string) => cle(`aideMesure.exemple.${code}`);
  const aAide = (code: string) =>
    ['tour_taille_cm','tour_hanches_cm','hauteur_fourche_cm','longueur_pantalon_cm','longueur_jupe_cm','tour_poitrine_cm','longueur_dos_cm','largeur_epaules_cm','longueur_robe_cm'].includes(code);
</script>

<svelte:head><title>{t(lang, 'patron.mesures.titrePage')}</title></svelte:head>

<main>
  <p><a href="/">← {t(lang, cle('patron.mesures.changerModele'))}</a></p>
  <h1>{data.titre} — {t(lang, cle('patron.mesures.vosMesures'))}</h1>
  <p>{t(lang, 'patron.mesures.texte')}</p>

  {#if form?.erreur}<p class="alerte" role="alert">{form.erreur}</p>{/if}
  {#if data.estimationIa}<p class="note-estimation" role="note">{t(lang, 'assistant.formulaireEstimationNote')} {t(lang, 'assistant.estimationAvertissement')}</p>{/if}

  <form method="post" class="grille">
    <input type="hidden" name="_csrf" value={data.csrfToken} />
    <label>{t(lang, 'patron.mesures.nomCliente')}
      <input name="nom" autocomplete="name" placeholder={t(lang, 'patron.mesures.sansNom')} />
    </label>
    {#each data.champs as champ}
      <div class="champ">
        <IllustrationMesure code={champ.code} lang={lang} />
        <label>{champ.libelle} ({t(lang, 'commun.cm')}) {#if champ.estimee}<span class="badge-estimation">{t(lang, 'assistant.estimationBadge')}</span>{/if}
          <input name={champ.code} inputmode="decimal" required value={champ.valeur} placeholder={t(lang, cle('demo.exempleSaisie'))} />
          <span class="aide">{#if aAide(champ.code)}{t(lang, aideCle(champ.code))} {t(lang, exempleCle(champ.code))} {/if}{t(lang, 'patron.mesures.aidePlage', { min: formatCm(lang, champ.minCm), max: formatCm(lang, champ.maxCm) })}</span>
        </label>
      </div>
    {/each}
    {#if data.options.length > 0}
      <details>
        <summary>{t(lang, 'patron.mesures.options')}</summary>
        <p>{t(lang, cle('patron.mesures.optionsDefaut'))}</p>
        {#each data.options as option}
          {#if option.type === 'nombre'}
            <label>{option.libelle} ({t(lang, 'commun.cm')})
              <input name={option.code} inputmode="decimal" value={option.valeur} placeholder={option.placeholder ?? ''} />
            </label>
          {:else if option.type === 'choix'}
            <label>{option.libelle}
              <select name={option.code}>
                {#each option.choix ?? [] as choix}
                  <option value={choix.valeur} selected={(option.valeur || option.defaut) === choix.valeur}>{choix.libelle}</option>
                {/each}
              </select>
            </label>
          {:else}
            <label class="coche">
              <input type="checkbox" name={option.code} value={String(option.defaut ?? 'oui')} checked />
              {option.libelle}
            </label>
          {/if}
        {/each}
      </details>
    {/if}
    <button type="submit">{t(lang, 'patron.mesures.generer')}</button>
  </form>
</main>

<style>
  .champ { display: flex; gap: 12px; align-items: flex-start; }
  .champ label { display: grid; gap: 6px; font-weight: 600; flex: 1; }
  .champ input { min-height: 48px; font: inherit; padding: 10px 14px; border: 1.5px solid var(--bord-fort); border-radius: 12px; width: 100%; background: #fff; color: var(--encre); }
  .aide { font-weight: 400; font-size: 15px; }
  .note-estimation { padding: 10px 14px; border-radius: 12px; background: #f6f1ff; border: 1px solid #e4dcff; line-height: 1.5; }
  .badge-estimation { font-size: 11px; font-weight: 700; background: #d8b4fe; border-radius: 999px; padding: 2px 7px; white-space: nowrap; }
</style>
