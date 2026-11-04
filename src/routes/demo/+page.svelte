<script lang="ts">
  import IllustrationMesure from '$lib/illustrations/IllustrationMesure.svelte';
  import IllustrationModele from '$lib/illustrations/IllustrationModele.svelte';
  import VisionneusePatron from '$lib/design/VisionneusePatron.svelte';
  import LoupeTissu from '$lib/demo/LoupeTissu.svelte';
  import ApercuTroisVues from '$lib/demo/ApercuTroisVues.svelte';
  import type { VuesApercu } from '$lib/demo/planche';
  import { COULEURS_TISSU, MATIERES, couleurTissu, type MatiereId } from '$lib/demo/tissus';
  import Epingle from '$lib/design/icones/Epingle.svelte';
  import { validerMensurationSaisie } from '$lib/domain/mensurations-saisie';
  import { preparerPiece } from '$lib/patterns/apercu-rendu';
  import { genererPiecesPlacees, validerMesuresPatron, type ModelePatron } from '$lib/patterns/saisie-patron';
  import { LISTE_MODELES, REGISTRE_MODELES } from '$lib/patterns/registre';
  import { t, formatCm, traduireErreur, type Lang, type TranslationKey } from '$lib/i18n';

  let { data } = $props();
  const lang: Lang = $derived(data.lang ?? data.locale ?? 'fr');
  const cle = (k: string) => k as TranslationKey;

  // Aides de prise de mesure par code (clés proposées aideMesure.* / aideMesure.exemple.*).
  const CODES_AIDE = ['tour_taille_cm','tour_hanches_cm','hauteur_fourche_cm','longueur_pantalon_cm','longueur_jupe_cm','longueur_robe_cm','tour_poitrine_cm','longueur_dos_cm','largeur_epaules_cm'];
  const aideCle = (code: string) => cle(`aideMesure.${code}`);
  const exempleCle = (code: string) => cle(`aideMesure.exemple.${code}`);

  const guide = (n: number) => t(lang, cle(`demo.aide${n}`));
  const ETAPES = $derived([t(lang, 'demo.etape1'), t(lang, 'demo.etape2'), t(lang, 'demo.etape3'), t(lang, 'demo.etape4')]);

  // Modèle choisi dans la démo : tout le parcours (champs, morphologies,
  // génération, PDF, vue 3D) se lit dans le REGISTRE, jamais en dur.
  let modeleChoisi = $state<ModelePatron>('pantalon_large');
  const entreeDemo = $derived(REGISTRE_MODELES[modeleChoisi]);
  const champs = $derived(
    entreeDemo.mesures.map((m) => ({
      code: m.code,
      libelle: `${t(lang, m.libelleCle)} (${t(lang, 'commun.cm')})`,
      minCm: m.minCm,
      maxCm: m.maxCm,
      pasCm: 0.5,
      aide: CODES_AIDE.includes(m.code) ? t(lang, aideCle(m.code)) : t(lang, cle('aideMesure.generique')),
      exemple: CODES_AIDE.includes(m.code) ? t(lang, exempleCle(m.code)) : ''
    }))
  );
  const PRESETS = $derived(entreeDemo.presets);
  const fmtDemo = (v: number) => formatCm(lang, v);
  function valeursPreset(id: string): Record<string, string> {
    const p = entreeDemo.presets.find((x) => x.id === id) ?? entreeDemo.presets[0];
    return Object.fromEntries(Object.entries(p?.valeurs ?? {}).map(([k, v]) => [k, fmtDemo(v)]));
  }

  // --- Salle d'essayage (étape 3) : état en direct, dernier patron valide conservé ---
  let valeursLive = $state<Record<string, string>>(valeursPreset('moyenne'));
  let erreursLive = $state<Record<string, string>>({});
  let messageConfirme = $state('');
  let presetLive = $state<string>('moyenne');
  let couleurId = $state('bleu-denim');
  let matiere = $state<MatiereId>('denim');
  let vue = $state<'3d' | 'plat'>('plat');
  let message3d = $state('');
  let vues3d = $state<VuesApercu | null>(null);
  const tissuTexte = $derived(`${t(lang, couleurTissu(couleurId).libelleCle)} · ${t(lang, MATIERES.find((m) => m.id === matiere)?.libelleCle ?? cle('matiere.denim'))}`);
  // Chargé dynamiquement seulement quand la vue 3D est demandée (étape 3).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Scene3D = $state<any>(null);
  async function activerVue3d() {
    message3d = '';
    vue = '3d';
    if (!Scene3D) {
      try {
        Scene3D = (await import('$lib/demo/three/Scene3DPantalon.svelte')).default;
      } catch {
        vue = 'plat';
        message3d = t(lang, cle('salle.chargement3dEchoue'));
      }
    }
  }
  function repli3d(message: string) {
    vue = 'plat';
    message3d = message;
  }
  let panneauMobile = $state<'mesures' | 'tissu' | 'patron'>('mesures');
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  const couleurChoisie = $derived(couleurTissu(couleurId));

  function tenterMajLive(codeModifie?: string): boolean {
    const erreurs: Record<string, string> = {};
    const candidat: Record<string, number> = {};
    for (const champ of champs) {
      try {
        candidat[champ.code] = validerMensurationSaisie(champ.code, (valeursLive[champ.code] ?? '').replace('.', ','));
      } catch (e) {
        erreurs[champ.code] = traduireErreur(lang, e, 'salle.erreurMesure');
      }
    }
    if (Object.keys(erreurs).length > 0) {
      erreursLive = erreurs; // dernier patron valide conservé : mesuresValidees inchangées
      messageConfirme = '';
      return false;
    }
    try {
      mesuresValidees = validerMesuresPatron(modeleChoisi, (code) => String(candidat[code]));
    } catch (e) {
      erreursLive = codeModifie ? { [codeModifie]: traduireErreur(lang, e, 'salle.erreurMesure') } : {};
      messageConfirme = '';
      return false;
    }
    erreursLive = {};
    return true;
  }
  function planifierMaj(code: string) {
    presetLive = '';
    messageConfirme = '';
    if (minuteur) clearTimeout(minuteur);
    minuteur = setTimeout(() => tenterMajLive(code), 150);
  }
  function majDepuisCurseur(code: string, valeur: number) {
    valeursLive = { ...valeursLive, [code]: fmtDemo(valeur) };
    planifierMaj(code);
  }
  function choisirPresetLive(clePreset: string) {
    const p = PRESETS.find((x) => x.id === clePreset);
    if (!p) return;
    presetLive = clePreset;
    valeursLive = Object.fromEntries(Object.entries(p.valeurs).map(([k, v]) => [k, fmtDemo(v)]));
    if (minuteur) clearTimeout(minuteur);
    tenterMajLive();
  }
  function confirmerMesures() {
    if (minuteur) clearTimeout(minuteur);
    if (tenterMajLive()) messageConfirme = t(lang, cle('demo.mesuresConfirmees'));
  }
  const nombreLive = (code: string, min: number) => {
    const v = Number((valeursLive[code] ?? '').replace(',', '.'));
    return Number.isFinite(v) ? v : min;
  };

  let etape = $state(1);
  // « Moyenne » sélectionnée par défaut dès l'ouverture, mesures préremplies :
  // « Voir mon patron » affiche le plan sans autre clic. Petite/Forte restent choisissables.
  let valeurs = $state<Record<string, string>>(valeursPreset('moyenne'));
  let presetActif = $state<string>('moyenne');
  let erreur = $state('');
  let aideOuverte = $state(true);

  function aller(n: number) {
    etape = Math.min(4, Math.max(1, n));
    aideOuverte = true;
    erreur = '';
  }
  function choisirModele(id: ModelePatron) {
    modeleChoisi = id;
    presetActif = 'moyenne';
    presetLive = 'moyenne';
    valeurs = valeursPreset('moyenne');
    valeursLive = valeursPreset('moyenne');
    mesuresValidees = null;
    vues3d = null;
    vue = 'plat';
    message3d = '';
    aller(2);
  }
  function choisirPreset(clePreset: string) {
    presetActif = clePreset;
    valeurs = valeursPreset(clePreset);
    erreur = '';
  }

  let mesuresValidees = $state<Record<string, number> | null>(null);
  function voirPatron() {
    try {
      mesuresValidees = validerMesuresPatron(modeleChoisi, (code) => valeurs[code]);
      valeursLive = Object.fromEntries(Object.entries(mesuresValidees).map(([k, v]) => [k, fmtDemo(v)]));
      erreursLive = {};
      messageConfirme = '';
      aller(3);
    } catch (e) {
      erreur = traduireErreur(lang, e, 'salle.erreurMesure');
    }
  }

  const rendu = $derived.by(() => {
    if (!mesuresValidees) return null;
    const { pieces, largeur, hauteur } = genererPiecesPlacees(modeleChoisi, mesuresValidees);
    return { pieces: pieces.map((p) => preparerPiece(p, lang)), largeur: Math.ceil(largeur), hauteur: Math.ceil(hauteur) };
  });
  const mesures3d = $derived(
    mesuresValidees && entreeDemo.aVue3d
      ? {
          tourTailleCm: mesuresValidees.tour_taille_cm!,
          tourHanchesCm: mesuresValidees.tour_hanches_cm!,
          hauteurFourcheCm: mesuresValidees.hauteur_fourche_cm!,
          longueurPantalonCm: mesuresValidees.longueur_pantalon_cm!
        }
      : null
  );
  const hrefPdf = $derived.by(() => {
    if (!mesuresValidees) return '/demo';
    const params = new URLSearchParams({ modele: modeleChoisi, ...Object.fromEntries(Object.entries(mesuresValidees).map(([k, v]) => [k, String(v)])) });
    return `/demo/pdf?${params.toString()}`;
  });
  const resume = $derived(
    mesuresValidees ? champs.map((c) => `${c.libelle.replace(` (${t(lang, 'commun.cm')})`, '')} : ${fmtDemo(mesuresValidees![c.code]!)} ${t(lang, 'commun.cm')}`) : []
  );
</script>

<svelte:head><title>{t(lang, 'demo.titrePage')}</title></svelte:head>

<main>
  <p><a href="/">← {t(lang, 'commun.retourAccueil')}</a></p>
  <h1>{t(lang, 'demo.titre')}</h1>
  <p class="chapeau">{t(lang, 'demo.sousTitre')}</p>

  <section class="alerte" role="alert">
    <strong>{t(lang, 'commun.brouillonNonValide')}.</strong>
    {t(lang, 'patron.apercu.banniere')}
  </section>

  <div class="progression-wrap">
    <ol class="progression" aria-label={t(lang, cle('demo.progression'))}>
      {#each ETAPES as nom, i}
        <li aria-current={etape === i + 1 ? 'step' : undefined} class:fait={etape > i + 1} class:actuel={etape === i + 1}>
          <span class="pastille">{i + 1}</span> {nom}
        </li>
      {/each}
    </ol>
    <button type="button" class="bouton bouton-discret" onclick={() => (aideOuverte = true)}>{t(lang, 'demo.aide')}</button>
  </div>
  <div class="barre" aria-hidden="true"><span style="width: {etape * 25}%"></span></div>

  {#if aideOuverte}
    <aside class="bulle" aria-label={t(lang, 'demo.bulleGuidage')}>
      <Epingle />
      <p>{guide(etape)}</p>
      <button type="button" onclick={() => (aideOuverte = false)}>{t(lang, 'demo.fermerAide')}</button>
    </aside>
  {/if}

  {#if etape > 1}
    <p><button type="button" onclick={() => aller(etape - 1)}>← {t(lang, 'demo.retour')}</button></p>
  {/if}

  {#if etape === 1}
    <section aria-labelledby="titre-etape-1">
      <h2 id="titre-etape-1">1. {t(lang, 'demo.choisirModele')}</h2>
      <div class="modeles">
        {#each LISTE_MODELES as entree}
          <article class="carte modele">
            <IllustrationModele modele={entree.id} lang={lang} />
            <h3>{t(lang, entree.titreCle)}</h3>
            <p>{t(lang, entree.accrocheCle)}.</p>
            <button type="button" class="bouton-action" onclick={() => choisirModele(entree.id)}>{t(lang, entree.actionCle)}</button>
          </article>
        {/each}
      </div>
    </section>
  {:else if etape === 2}
    <section aria-labelledby="titre-etape-2">
      <h2 id="titre-etape-2">2. {t(lang, 'demo.etape2')}</h2>
      <p>{t(lang, cle('demo.introMesures'))}</p>
      <div class="presets" role="group" aria-label={t(lang, 'demo.morphologie')}>
        {#each PRESETS as p}
          <button type="button" class:actif={presetActif === p.id} onclick={() => choisirPreset(p.id)}>{t(lang, p.libelleCle)}</button>
        {/each}
      </div>
      {#if erreur}<p class="alerte" role="alert">{erreur}</p>{/if}
      <form class="grille" onsubmit={(e) => { e.preventDefault(); voirPatron(); }}>
        {#each champs as champ}
          <div class="champ">
            <IllustrationMesure code={champ.code} lang={lang} />
            <label>{champ.libelle}
              <input name={champ.code} inputmode="decimal" required placeholder={t(lang, cle('demo.exempleSaisie'))} bind:value={valeurs[champ.code]} />
              <span class="aide">{champ.aide} {champ.exemple} {t(lang, cle('demo.plage'), { min: fmtDemo(champ.minCm), max: fmtDemo(champ.maxCm) })}</span>
            </label>
          </div>
        {/each}
        <button type="submit" class="bouton-action">{t(lang, 'demo.voirPatron')}</button>
      </form>
    </section>
  {:else if etape === 3 && rendu}
    <section aria-labelledby="titre-etape-3">
      <h2 id="titre-etape-3">3. {t(lang, cle('demo.salleTitre'))}</h2>
      <p class="resume">{resume.join(' · ')}</p>
      <p>{t(lang, cle('demo.introPatron'))}</p>

      <div class="essayage">
        <div class="scene-essayage carte-scene">
          <div class="scene-haut">
            {#if entreeDemo.aVue3d}
              <div class="bascule" role="group" aria-label={t(lang, cle('salle.choixVue'))}>
                <button type="button" class:actif={vue === '3d'} aria-pressed={vue === '3d'} onclick={activerVue3d}>{t(lang, cle('demo.vue3d'))}</button>
                <button type="button" class:actif={vue === 'plat'} aria-pressed={vue === 'plat'} onclick={() => (vue = 'plat')}>{t(lang, cle('demo.vuePlat'))}</button>
              </div>
            {:else}
              <p class="aide">{t(lang, 'salle.vue3dIndisponible')}</p>
            {/if}
            <LoupeTissu couleurId={couleurId} matiere={matiere} lang={lang} />
          </div>
          <div class="ombre-sol" aria-hidden="true"></div>
          {#if message3d}<p class="erreur-mesure" role="alert">{message3d}</p>{/if}
          {#if vue === '3d' && Scene3D && mesures3d}
            <Scene3D mesures={mesures3d} couleurId={couleurId} matiere={matiere} onIndisponible={repli3d} onVues={(v: VuesApercu) => (vues3d = v)} />
          {:else}
            <VisionneusePatron pieces={rendu.pieces} largeur={rendu.largeur} hauteur={rendu.hauteur} couleurTissu={couleurChoisie.hex} matiereTissu={matiere} lang={lang} />
          {/if}
          {#if vues3d && vue === '3d'}
            <ApercuTroisVues vues={vues3d} mesuresTexte={resume.join(' · ')} tissuTexte={tissuTexte} lang={lang} />
          {:else if message3d}
            <p>{t(lang, cle('salle.apercu3Indisponible'))}</p>
          {/if}
        </div>

        <div class="tiroir">
          <div class="onglets-panneaux" role="tablist" aria-label={t(lang, cle('salle.panneaux'))}>
            <button type="button" role="tab" aria-selected={panneauMobile === 'mesures'} onclick={() => (panneauMobile = 'mesures')}>{t(lang, 'salle.vosMesures')}</button>
            <button type="button" role="tab" aria-selected={panneauMobile === 'tissu'} onclick={() => (panneauMobile = 'tissu')}>{t(lang, 'salle.tissu')}</button>
            <button type="button" role="tab" aria-selected={panneauMobile === 'patron'} onclick={() => (panneauMobile = 'patron')}>{t(lang, 'salle.votrePatron')}</button>
          </div>

          <section class="carte panneau" class:panneau-actif={panneauMobile === 'mesures'} aria-label={t(lang, 'salle.vosMesures')}>
            <h3>{t(lang, 'salle.vosMesures')}</h3>
            <div class="presets" role="group" aria-label={t(lang, 'demo.morphologie')}>
              {#each PRESETS as p}
                <button type="button" class:actif={presetLive === p.id} onclick={() => choisirPresetLive(p.id)}>{t(lang, p.libelleCle)}</button>
              {/each}
            </div>
            {#each champs as champ}
              <div class="pastille-mesure">
                <label for="live-{champ.code}">{champ.libelle}</label>
                <div class="pastille-ligne">
                  <input id="live-{champ.code}" name="live-{champ.code}" type="text" inputmode="decimal" value={valeursLive[champ.code]} oninput={(e) => { valeursLive = { ...valeursLive, [champ.code]: e.currentTarget.value }; planifierMaj(champ.code); }} aria-invalid={erreursLive[champ.code] ? 'true' : undefined} aria-describedby={erreursLive[champ.code] ? `err-${champ.code}` : undefined} />
                  <span aria-hidden="true">{t(lang, 'commun.cm')}</span>
                </div>
                <input type="range" min={champ.minCm} max={champ.maxCm} step={champ.pasCm} value={nombreLive(champ.code, champ.minCm)} oninput={(e) => majDepuisCurseur(champ.code, e.currentTarget.valueAsNumber)} aria-label={t(lang, 'salle.curseur', { mesure: champ.libelle })} />
                <span class="aide">{t(lang, cle('salle.plagePas'), { min: fmtDemo(champ.minCm), max: fmtDemo(champ.maxCm), pas: fmtDemo(champ.pasCm) })}</span>
                {#if erreursLive[champ.code]}<p class="erreur-mesure" id="err-{champ.code}" role="alert">{erreursLive[champ.code]}</p>{/if}
              </div>
            {/each}
            <button type="button" class="bouton bouton-action" onclick={confirmerMesures}>{t(lang, cle('demo.confirmer'))}</button>
            {#if messageConfirme}<p class="confirme" role="status">{messageConfirme}</p>{/if}
          </section>

          <section class="carte panneau" class:panneau-actif={panneauMobile === 'tissu'} aria-label={t(lang, 'salle.tissu')}>
            <h3>{t(lang, 'salle.tissu')}</h3>
            <p id="tissu-choisi" aria-live="polite">{t(lang, couleurChoisie.libelleCle)} · {t(lang, MATIERES.find((m) => m.id === matiere)?.libelleCle ?? cle('matiere.denim'))}</p>
            <div class="pastilles-couleur" role="group" aria-label={t(lang, cle('salle.couleurTissu'))}>
              {#each COULEURS_TISSU as c}
                <button type="button" class="pastille-couleur" class:actif={couleurId === c.id} style="--pastille: {c.hex}" aria-pressed={couleurId === c.id} aria-label={t(lang, 'salle.couleur', { couleur: t(lang, c.libelleCle) })} title={t(lang, c.libelleCle)} onclick={() => (couleurId = c.id)}></button>
              {/each}
            </div>
            <div class="matieres" role="group" aria-label={t(lang, cle('salle.matiere'))}>
              {#each MATIERES as m}
                <button type="button" class:actif={matiere === m.id} aria-pressed={matiere === m.id} onclick={() => (matiere = m.id)}>{t(lang, m.libelleCle)}</button>
              {/each}
            </div>
            <p class="aide">{t(lang, cle('demo.tissuAide'))}</p>
          </section>

          <section class="carte panneau" class:panneau-actif={panneauMobile === 'patron'} aria-label={t(lang, 'salle.votrePatron')}>
            <h3>{t(lang, 'salle.votrePatron')}</h3>
            {#each rendu.pieces as piece}
              <h4>{piece.nom}</h4>
              <table>
                <tbody>
                  {#each piece.tableau as ligne}<tr><th scope="row">{ligne.libelle}</th><td>{ligne.valeur} {t(lang, 'commun.cm')}</td></tr>{/each}
                </tbody>
              </table>
            {/each}
            <p><a class="bouton bouton-action" href={hrefPdf} download>{t(lang, 'demo.telecharger')}</a></p>
            <p>{t(lang, 'demo.carreRappel')}</p>
          </section>
        </div>
      </div>
      <p><button type="button" class="bouton-action" onclick={() => aller(4)}>{t(lang, cle('demo.voirResultat'))}</button></p>
    </section>
  {:else if etape === 4}
    <section aria-labelledby="titre-etape-4">
      <h2 id="titre-etape-4">4. {t(lang, 'demo.etape4')}</h2>
      <p class="resume">{resume.join(' · ')}</p>
      {#if vues3d}
        <ApercuTroisVues vues={vues3d} mesuresTexte={resume.join(' · ')} tissuTexte={tissuTexte} afficherPlanche lang={lang} />
      {:else}
        <section class="carte">
          <h3>{entreeDemo.aVue3d ? t(lang, cle('troisVues.titre')) : t(lang, cle('demo.vuePlat'))}</h3>
          <p>{entreeDemo.aVue3d ? t(lang, cle('demo.apercu3Attente')) : t(lang, cle('demo.apercuPlatTexte'))}</p>
          {#if rendu}<VisionneusePatron pieces={rendu.pieces} largeur={rendu.largeur} hauteur={rendu.hauteur} couleurTissu={couleurChoisie.hex} matiereTissu={matiere} lang={lang} />{/if}
        </section>
      {/if}
      <p><a class="bouton bouton-action" href={hrefPdf} download>{t(lang, 'demo.telecharger')}</a></p>
      <section class="carte">
        <h3>{t(lang, cle('demo.avantCouper'))}</h3>
        <p>{t(lang, cle('demo.avantCouperAvant'))} <strong>{t(lang, cle('demo.carreControle'))}</strong> {t(lang, cle('demo.avantCouperApres'))}</p>
      </section>
      <section class="carte">
        <h3>{t(lang, 'demo.ensuite')}</h3>
        <ol>
          <li>{t(lang, cle('demo.ensuite1'))}</li>
          <li>{t(lang, cle('demo.ensuite2'))}</li>
          <li>{entreeDemo.aVue3d ? t(lang, cle('demo.ensuite3d')) : t(lang, cle('demo.ensuitePlat'))}</li>
        </ol>
      </section>
      <p>
        <button type="button" onclick={() => aller(1)}>{t(lang, cle('demo.recommencer'))}</button>
        <a class="bouton bouton-discret" href="/connexion">{t(lang, 'commun.espaceAtelier')}</a>
      </p>
    </section>
  {/if}
</main>

<style>
  .chapeau { font-size: var(--titre-3); max-width: 42rem; }
  .progression-wrap { display: flex; flex-wrap: wrap; gap: 10px; align-items: start; justify-content: space-between; margin-top: 18px; }
  .progression { display: flex; flex-wrap: wrap; gap: 8px 18px; list-style: none; padding: 0; margin: 0; }
  .progression li { display: inline-flex; gap: 8px; align-items: center; font-weight: 600; }
  .progression .pastille { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 999px; border: 1.5px solid var(--bord-fort); background: var(--carte); color: var(--texte-secondaire); }
  .progression li.actuel .pastille { background: var(--carte-sombre); border-color: var(--carte-sombre); color: #fff; }
  .progression li.fait .pastille { background: var(--bleu-pastille); border-color: var(--bleu-pastille); color: var(--bleu-texte); }
  .barre { height: 8px; background: var(--bord); border-radius: 999px; overflow: hidden; margin: 12px 0 18px; }
  .barre span { display: block; height: 100%; background: var(--carte-sombre); transition: width 0.3s ease; }
  .bulle { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; border: 1.5px solid var(--peche); background: var(--carte); border-radius: var(--rayon-carte); padding: 16px 18px; margin: 14px 0; box-shadow: var(--ombre-petite); color: var(--encre); }
  .bulle p { flex: 1 1 260px; margin: 0; }
  .bulle :global(.icone) { color: var(--cote); }
  .modeles { display: grid; gap: 16px; margin: 18px 0; }
  @media (min-width: 700px) { .modeles { grid-template-columns: 1fr 1fr; } }
  .modele { text-align: center; display: grid; gap: 8px; justify-items: center; margin: 0; }
  .modele p { margin: 0; }
  .presets { display: flex; flex-wrap: wrap; gap: 10px; margin: 14px 0; }
  .presets button { background: var(--carte); border-color: var(--bord-fort); color: var(--encre); }
  .presets button.actif { background: var(--encre); border-color: var(--encre); color: #fff; }
  .champ { display: flex; gap: 12px; align-items: flex-start; }
  .champ label { display: grid; gap: 6px; font-weight: 600; flex: 1; }
  .champ input { min-height: 52px; font: inherit; padding: 10px 14px; border: 1.5px solid var(--bord-fort); border-radius: 14px; width: 100%; background: #fff; color: var(--encre); }
  .aide { font-weight: 400; font-size: 15px; }
  .resume { overflow-wrap: anywhere; font-weight: 600; }
  /* Salle d'essayage — bureau : scène 65 % / panneaux 35 % */
  .essayage { display: grid; gap: 16px; margin: 16px 0; }
  @media (min-width: 1024px) { .essayage { grid-template-columns: minmax(0, 65fr) minmax(0, 35fr); align-items: start; } }
  .carte-scene { border: 1px solid var(--bord); border-radius: 32px; padding: 16px; background: radial-gradient(circle at 50% 0%, #ffffff 0%, #edeef4 58%, #dddeea 100%); box-shadow: var(--ombre); position: relative; overflow: hidden; }
  .scene-haut { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; justify-content: space-between; }
  .bascule { display: inline-flex; border: 1.5px solid var(--bord); border-radius: 999px; overflow: hidden; background: var(--carte); }
  .bascule button { min-height: 48px; border: 0; border-radius: 0; background: transparent; color: var(--encre); }
  .bascule button.actif { background: var(--encre); color: #fff; }
  .bascule button:disabled { opacity: 0.45; cursor: not-allowed; }
  .ombre-sol { height: 18px; margin: 4px 12% -6px; border-radius: 50%; background: radial-gradient(ellipse at center, rgb(30 30 34 / 0.18), transparent 70%); }
  .tiroir { display: grid; gap: 0; min-width: 0; }
  .onglets-panneaux { display: none; gap: 8px; }
  .onglets-panneaux button { min-height: 48px; flex: 1; background: var(--carte); border-color: var(--bord-fort); color: var(--encre); }
  .onglets-panneaux button[aria-selected='true'] { background: var(--encre); border-color: var(--encre); color: #fff; }
  .panneau { transition: opacity 0.25s ease, transform 0.25s ease; }
  .pastille-mesure { border: 1px solid var(--bord); border-top: 3px solid var(--bleu); border-radius: var(--rayon-carte); padding: 14px; margin: 10px 0; background: var(--carte); display: grid; gap: 8px; }
  .pastille-mesure label { font-weight: 700; }
  .pastille-ligne { display: flex; gap: 8px; align-items: center; }
  .pastille-ligne input { min-height: 48px; width: 7rem; max-width: 45%; font: inherit; padding: 8px 12px; border: 1.5px solid var(--bord-fort); border-radius: 12px; background: var(--fond); color: var(--encre); }
  .pastille-mesure input[type='range'] { width: 100%; min-height: 48px; accent-color: var(--cote); }
  .erreur-mesure { margin: 0; padding: 8px 10px; border-radius: 8px; background: var(--rouge-doux); font-weight: 600; }
  .confirme { font-weight: 700; color: var(--bleu-texte); }
  .pastilles-couleur { display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0; }
  .pastille-couleur { width: 48px; height: 48px; min-width: 48px; border-radius: 999px; background: var(--pastille); border: 3px solid var(--bord); padding: 0; }
  .pastille-couleur.actif { border-color: var(--encre); box-shadow: 0 0 0 3px var(--carte), 0 0 0 6px var(--encre); }
  .matieres { display: flex; flex-wrap: wrap; gap: 8px; }
  .matieres button { min-height: 48px; background: var(--carte); border-color: var(--bord-fort); color: var(--encre); }
  .matieres button.actif { background: var(--encre); border-color: var(--encre); color: #fff; }
  /* Mobile : scène en haut (~55 vh), panneaux en tiroir à onglets */
  @media (max-width: 760px) {
    .essayage { grid-template-columns: minmax(0, 1fr); }
    .carte-scene :global(.scene) { height: 55vh; }
    .carte-scene :global(.patron) { height: 100%; }
    .onglets-panneaux { display: flex; position: sticky; top: 0; z-index: 2; background: var(--fond); padding: 6px 0; }
    .panneau { display: none; }
    .panneau.panneau-actif { display: block; }
  }
  table { border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid var(--bord-fort); padding: 5px 10px; text-align: left; font-weight: 400; }
  th { font-weight: 600; }
</style>
