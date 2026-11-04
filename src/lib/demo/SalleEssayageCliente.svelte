<script lang="ts">
  import VisionneusePatron from '$lib/design/VisionneusePatron.svelte';
  import PatronCote from '$lib/design/PatronCote.svelte';
  import { preparerPatronCote } from '$lib/design/patron-cote';
  import Puce from '$lib/design/Puce.svelte';
  import LoupeTissu from '$lib/demo/LoupeTissu.svelte';
  import ApercuTroisVues from '$lib/demo/ApercuTroisVues.svelte';
  import type { VuesApercu } from '$lib/demo/planche';
  import { COULEURS_TISSU, MATIERES, couleurTissu, type MatiereId } from '$lib/demo/tissus';
  import { validerMensurationSaisie } from '$lib/domain/mensurations-saisie';
  import { preparerPiece } from '$lib/patterns/apercu-rendu';
  import { genererPiecesPlacees, validerMesuresPatron, type ModelePatron } from '$lib/patterns/saisie-patron';
  import { parametresOptionsModele, REGISTRE_MODELES, type OptionsModele, type ValeurOption } from '$lib/patterns/registre';
  import type { OptionsPantalonLarge } from '$lib/patterns/pantalon-large/geometry';
  import { t, formatCm, traduireErreur, type Lang, type TranslationKey } from '$lib/i18n';

  /**
   * Salle d'essayage connectée (maquette « Salle » / « Salle3d », design v3) :
   * deux vues par onglets accessibles — « 1 · Patron à plat » (PatronCote, fait
   * foi) puis « 2 · Vue 3D (aperçu) » indicative, avec repli sans WebGL. Les
   * mesures viennent d'une fiche cliente et le patron peut être ENREGISTRÉ.
   * Le formulaire d'enregistrement n'envoie que les dernières mesures valides ;
   * le serveur revalide tout (patron-cliente.ts).
   */
  let {
    modele,
    mesuresInitiales,
    nomInitial,
    csrfToken,
    actionEnregistrer,
    libelleEnregistrer,
    tissuInitial,
    optionsInitiales = {},
    prenomCliente,
    hrefRetour,
    sousTitre = '',
    ficheLibelle = '',
    infoPatron = '',
    lang = 'fr'
  }: {
    modele: ModelePatron;
    mesuresInitiales: Record<string, number>;
    nomInitial: string;
    csrfToken: string;
    actionEnregistrer: string;
    libelleEnregistrer: string;
    tissuInitial?: { couleurId: string; matiereId: string };
    optionsInitiales?: Record<string, ValeurOption>;
    prenomCliente: string;
    hrefRetour: string;
    sousTitre?: string;
    ficheLibelle?: string;
    infoPatron?: string;
    lang?: Lang;
  } = $props();

  const cle = (k: string) => k as TranslationKey;

  // Tout ce qui dépend du modèle vient du REGISTRE (champs, bornes, options,
  // morphologies, vue 3D) : cette salle ne connaît aucun modèle en particulier.
  // svelte-ignore state_referenced_locally
  const entree = REGISTRE_MODELES[modele];
  const champs = $derived(entree.mesures.map((m) => ({ code: m.code, libelle: t(lang, m.libelleCle), minCm: m.minCm, maxCm: m.maxCm, pasCm: 0.5 })));
  const fmt = (v: number) => formatCm(lang, v);

  // Morphologies de référence du modèle (registre).
  const PRESETS = entree.presets;

  // Captures initiales voulues : le composant part des valeurs de la fiche ou
  // du patron enregistré (instance créée à chaque navigation, pas synchrone).
  // svelte-ignore state_referenced_locally
  let mesuresValidees = $state<Record<string, number>>({ ...mesuresInitiales });
  // svelte-ignore state_referenced_locally
  let valeursLive = $state<Record<string, string>>(Object.fromEntries(Object.entries(mesuresInitiales).map(([k, v]) => [k, fmt(v)])));
  let erreursLive = $state<Record<string, string>>({});
  // svelte-ignore state_referenced_locally
  let couleurId = $state(tissuInitial?.couleurId ?? 'bleu-denim');
  // svelte-ignore state_referenced_locally
  let matiere = $state<MatiereId>((tissuInitial?.matiereId as MatiereId) ?? 'denim');
  let vue = $state<'3d' | 'plat'>('plat');
  let message3d = $state('');
  let vues3d = $state<VuesApercu | null>(null);
  let panneauMobile = $state<'mesures' | 'tissu' | 'patron'>('mesures');
  let zoom = $state(1);
  let minuteur: ReturnType<typeof setTimeout> | undefined;

  // Options du modèle (registre, jamais obligatoires) : nombres en texte
  // convertis si valides ; choix et cases suivis dans optionsChoix.
  const defsOptions = entree.options;
  // svelte-ignore state_referenced_locally
  let optionsTexte = $state<Record<string, string>>(
    Object.fromEntries(
      defsOptions
        .filter((d) => d.type === 'nombre')
        .map((d) => {
          const v = optionsInitiales[d.cle];
          return [d.code, typeof v === 'number' ? fmt(v) : ''] as [string, string];
        })
    )
  );
  // svelte-ignore state_referenced_locally
  let optionsChoix = $state<Record<string, string>>(
    Object.fromEntries(
      defsOptions
        .filter((d) => d.type !== 'nombre')
        .map((d) => {
          const v = optionsInitiales[d.cle];
          if (d.type === 'case') return [d.code, v !== undefined || d.defaut !== undefined ? 'on' : ''] as [string, string];
          return [d.code, typeof v === 'string' && v ? v : String(d.defaut ?? d.choix?.[0]?.valeur ?? '')] as [string, string];
        })
    )
  );
  let erreurOptions = $state('');
  const optionsValides = $derived.by((): OptionsModele => {
    const options: OptionsModele = {};
    for (const def of defsOptions) {
      if (def.type === 'nombre') {
        const brut = (optionsTexte[def.code] ?? '').trim().replace(',', '.');
        if (!brut) continue;
        const v = Number(brut);
        if (Number.isFinite(v) && (def.min === undefined || v >= def.min) && (def.max === undefined || v <= def.max)) options[def.cle] = v;
      } else if (def.type === 'choix') {
        const v = optionsChoix[def.code] ?? '';
        if ((def.choix ?? []).some((c) => c.valeur === v)) options[def.cle] = v;
      } else if (optionsChoix[def.code] === 'on') {
        options[def.cle] = def.defaut ?? 'oui';
      }
    }
    return options;
  });
  // Vue spécialisée du pantalon (PatronCote historique + assistant IA).
  const optionsPantalon = $derived.by((): OptionsPantalonLarge => {
    const num = (cle: string) => (typeof optionsValides[cle] === 'number' ? (optionsValides[cle] as number) : undefined);
    return { largeurBasPieceCm: num('largeurBasPieceCm'), profondeurPliCm: num('profondeurPliCm'), hauteurCeintureFinieCm: num('hauteurCeintureFinieCm') };
  });
  function verifierOptions() {
    for (const def of defsOptions) {
      if (def.type !== 'nombre') continue;
      const brut = (optionsTexte[def.code] ?? '').trim().replace(',', '.');
      if (brut && (!Number.isFinite(Number(brut)) || Number(brut) < (def.min ?? -Infinity) || Number(brut) > (def.max ?? Infinity))) {
        erreurOptions = t(lang, 'salle.optionErreur', { option: t(lang, def.libelleCle), min: def.min ?? '', max: def.max ?? '' });
        return;
      }
    }
    erreurOptions = '';
  }

  // --- Assistant de modèle IA (phase 8) : propose des OPTIONS, jamais de cotes.
  // La réponse du serveur est déjà validée et bornée ; elle remplit les champs
  // d'options existants, modifiables avant génération/enregistrement. En cas
  // d'échec ou d'absence de configuration, le formulaire manuel reste seul maître.
  let descriptionModele = $state('');
  let suggestionEnCours = $state(false);
  let messageIa = $state('');
  let suggestionIaOk = $state(false);
  let optionsOuvertes = $state(false);
  const LIBELLES_SUGGESTION: { cle: keyof OptionsPantalonLarge; code: string; suffixeCle: TranslationKey }[] = [
    { cle: 'largeurBasPieceCm', code: 'largeur_bas_cm', suffixeCle: 'cote.bas' },
    { cle: 'profondeurPliCm', code: 'profondeur_pli_cm', suffixeCle: 'option.profondeurPliCm' },
    { cle: 'hauteurCeintureFinieCm', code: 'hauteur_ceinture_cm', suffixeCle: 'patronCote.ceinture' }
  ];
  // Statuts renvoyés par /api/suggestion-modele -> clés locales ia.* (aucun message serveur affiché tel quel).
  const CLES_STATUT_IA: Record<string, TranslationKey> = {
    indisponible: 'ia.indisponible',
    desactive: 'ia.desactiveDemo',
    desactive_demo: 'ia.desactiveDemo',
    non_configure: 'ia.nonConfigure',
    limite: 'ia.limite',
    invalide: 'ia.invalide',
    refuse: 'ia.connectez',
    echec: 'ia.echec'
  };
  function messageStatutIa(donnees: { statut?: string; message?: string; messageCle?: string; cle?: string }): string {
    const cleMessage = donnees.messageCle ?? donnees.cle ?? (donnees.message?.includes('.') ? donnees.message : undefined);
    if (cleMessage) return t(lang, cleMessage as TranslationKey);
    if (donnees.statut && CLES_STATUT_IA[donnees.statut]) return t(lang, CLES_STATUT_IA[donnees.statut]!);
    return t(lang, 'ia.indisponible');
  }
  async function demanderSuggestion() {
    const texte = descriptionModele.trim();
    if (texte.length < 3 || suggestionEnCours) return;
    suggestionEnCours = true;
    suggestionIaOk = false;
    messageIa = t(lang, 'ia.enCours');
    try {
      const reponse = await fetch('/api/suggestion-modele', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ texte })
      });
      const donnees: { statut?: string; message?: string; messageCle?: string; cle?: string; options?: OptionsPantalonLarge } = await reponse.json().catch(() => ({}));
      if (donnees.statut === 'ok' && donnees.options) {
        const retenues: string[] = [];
        const valeurs: Partial<Record<keyof OptionsPantalonLarge, number>> = {};
        const nouvelles = { ...optionsTexte };
        for (const { cle: cleOpt, code, suffixeCle } of LIBELLES_SUGGESTION) {
          const v = donnees.options[cleOpt];
          if (typeof v === 'number' && Number.isFinite(v)) {
            nouvelles[code] = fmt(v);
            valeurs[cleOpt] = v;
            retenues.push(`${t(lang, suffixeCle)} ${fmt(v)} ${t(lang, 'commun.cm')}`);
          }
        }
        optionsTexte = nouvelles;
        verifierOptions();
        optionsOuvertes = true;
        suggestionIaOk = true;
        messageIa = retenues.length
          ? valeurs.largeurBasPieceCm !== undefined && valeurs.profondeurPliCm !== undefined && valeurs.hauteurCeintureFinieCm !== undefined
            ? `${t(lang, 'ia.suggestion', { bas: fmt(valeurs.largeurBasPieceCm), pli: fmt(valeurs.profondeurPliCm), ceinture: fmt(valeurs.hauteurCeintureFinieCm) })} ${t(lang, cle('ia.suggestionAjuster'))}`
            : `${t(lang, 'ia.suggestionPartielle')} : ${retenues.join(' · ')}. ${t(lang, cle('ia.suggestionAjuster'))}`
          : t(lang, cle('ia.aucuneOption'));
      } else {
        messageIa = messageStatutIa(donnees);
      }
    } catch {
      messageIa = t(lang, 'ia.echec');
    } finally {
      suggestionEnCours = false;
    }
  }

  const couleurChoisie = $derived(couleurTissu(couleurId));
  const couleurLibelle = $derived(t(lang, couleurChoisie.libelleCle));
  const matiereLibelle = $derived(t(lang, MATIERES.find((m) => m.id === matiere)?.libelleCle ?? ('matiere.' + matiere) as TranslationKey));
  const tissuTexte = $derived(`${couleurLibelle} · ${matiereLibelle}`);
  const rendu = $derived.by(() => {
    const { pieces, largeur, hauteur } = genererPiecesPlacees(modele, mesuresValidees, optionsValides);
    return { pieces: pieces.map((p) => preparerPiece(p, lang)), largeur: Math.ceil(largeur), hauteur: Math.ceil(hauteur) };
  });
  const resume = $derived(champs.map((c) => `${c.libelle} : ${fmt(mesuresValidees[c.code]!)} ${t(lang, 'commun.cm')}`));
  // La vue 3D n'existe que pour les modèles qui la déclarent (registre).
  const mesures3d = $derived(
    entree.aVue3d
      ? {
          tourTailleCm: mesuresValidees.tour_taille_cm!,
          tourHanchesCm: mesuresValidees.tour_hanches_cm!,
          hauteurFourcheCm: mesuresValidees.hauteur_fourche_cm!,
          longueurPantalonCm: mesuresValidees.longueur_pantalon_cm!
        }
      : null
  );
  // Valeurs du moteur pour les pastilles « Votre patron » (dessin spécialisé).
  const patronCote = $derived(entree.aVue3d && mesures3d ? preparerPatronCote(mesures3d, optionsPantalon, lang) : null);
  const hrefPdf = $derived.by(() => {
    const params = new URLSearchParams({ modele, nom: nomInitial });
    for (const [k, v] of Object.entries(mesuresValidees)) params.set(k, String(v));
    parametresOptionsModele(params, entree, optionsValides);
    return `/patron/pdf?${params.toString()}`;
  });

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

  // Onglets des vues : navigation au clavier (flèches), onglet actif seul tabulable.
  function toucheOnglet(e: KeyboardEvent, cible: 'plat' | '3d') {
    e.preventDefault();
    if (cible === '3d') void activerVue3d();
    else vue = 'plat';
    document.getElementById(cible === '3d' ? 'onglet-vue-3d' : 'onglet-vue-plat')?.focus();
  }
  function onkeydownOnglets(e: KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      toucheOnglet(e, vue === 'plat' ? '3d' : 'plat');
    } else if (e.key === 'Home') {
      toucheOnglet(e, 'plat');
    } else if (e.key === 'End') {
      toucheOnglet(e, '3d');
    }
  }

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
      erreursLive = erreurs; // dernier patron valide conservé
      return false;
    }
    try {
      mesuresValidees = validerMesuresPatron(modele, (code) => String(candidat[code]));
    } catch (e) {
      erreursLive = codeModifie ? { [codeModifie]: traduireErreur(lang, e, 'salle.erreurMesure') } : {};
      return false;
    }
    erreursLive = {};
    return true;
  }
  function planifierMaj(code: string) {
    if (minuteur) clearTimeout(minuteur);
    minuteur = setTimeout(() => tenterMajLive(code), 150);
  }
  function majDepuisCurseur(code: string, valeur: number) {
    valeursLive = { ...valeursLive, [code]: fmt(valeur) };
    planifierMaj(code);
  }
  const nombreLive = (code: string, min: number) => {
    const v = Number((valeursLive[code] ?? '').replace(',', '.'));
    return Number.isFinite(v) ? v : min;
  };

  function appliquerPreset(p: (typeof PRESETS)[number]) {
    valeursLive = { ...valeursLive, ...Object.fromEntries(Object.entries(p.valeurs).map(([k, v]) => [k, fmt(v)])) };
    if (minuteur) clearTimeout(minuteur);
    tenterMajLive();
  }
  const presetActif = $derived.by((): string | null => {
    for (const p of PRESETS) {
      if (Object.entries(p.valeurs).every(([code, v]) => fmt(v) === (valeursLive[code] ?? ''))) return p.id;
    }
    return null;
  });

  function zoomer(facteur: number) {
    zoom = Math.min(2.5, Math.max(0.6, Math.round(zoom * facteur * 20) / 20));
  }
</script>

<header class="entete-salle">
  <div class="entete-gauche">
    <a class="retour" href={hrefRetour} aria-label={t(lang, 'salle.retourFiche', { prenom: prenomCliente })}>
      <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </a>
    <div class="titres">
      <h1>{t(lang, 'salle.titre', { prenom: prenomCliente })}</h1>
      {#if sousTitre}<p>{sousTitre}</p>{/if}
      {#if infoPatron}<p class="info-patron">{infoPatron}</p>{/if}
    </div>
    <Puce ton="accent">{t(lang, 'commun.brouillonNonValide')}</Puce>
  </div>
  <div class="entete-actions">
    <a class="bouton bouton-secondaire" href={hrefPdf} download>{t(lang, 'commun.telechargerPdf')}</a>
    <button type="submit" form="form-enregistrer-salle" class="bouton bouton-action">{libelleEnregistrer} <span aria-hidden="true">✓</span></button>
  </div>
</header>

<div class="essayage">
  <div class="scene-essayage carte-scene">
    {#if entree.aVue3d}
      <div class="scene-haut">
        <div class="onglets-vue" role="tablist" aria-label={t(lang, cle('salle.choixVue'))} tabindex="-1" onkeydown={onkeydownOnglets}>
          <button type="button" role="tab" id="onglet-vue-plat" aria-selected={vue === 'plat'} aria-controls="panneau-vue-plat" tabindex={vue === 'plat' ? 0 : -1} class:actif={vue === 'plat'} onclick={() => (vue = 'plat')}>{t(lang, 'salle.vuePatron')}</button>
          <button type="button" role="tab" id="onglet-vue-3d" aria-selected={vue === '3d'} aria-controls="panneau-vue-3d" tabindex={vue === '3d' ? 0 : -1} class:actif={vue === '3d'} onclick={activerVue3d}>{t(lang, 'salle.vue3d')}</button>
        </div>
        {#if vue === '3d'}
          <span class="bandeau-indicatif">{t(lang, 'salle.apercuIndicatif')}</span>
          <div class="loupe-scene">
            <LoupeTissu couleurId={couleurId} matiere={matiere} lang={lang} legende="{matiereLibelle} · {couleurLibelle}" />
          </div>
        {/if}
      </div>
    {/if}
    {#if message3d}<p class="erreur-mesure" role="alert">{message3d}</p>{/if}

    {#if entree.aVue3d}
      {#if vue === 'plat'}
        <div role="tabpanel" id="panneau-vue-plat" aria-labelledby="onglet-vue-plat">
          <div class="controles-zoom" aria-label={t(lang, cle('salle.zoomPatron'))}>
            <button type="button" aria-label={t(lang, 'salle.zoomPlus')} disabled={zoom >= 2.5} onclick={() => zoomer(1.25)}>+</button>
            <button type="button" aria-label={t(lang, 'salle.zoomMoins')} disabled={zoom <= 0.6} onclick={() => zoomer(0.8)}>−</button>
            <button type="button" aria-label={t(lang, 'salle.zoomReset')} disabled={zoom === 1} onclick={() => (zoom = 1)}>⟲</button>
          </div>
          <div class="plat-defilant">
            <div class="plat-zoom" style="--zoom: {zoom}">
              {#if mesures3d}<PatronCote mesures={mesures3d} options={optionsValides} uid="salle" lang={lang} />{/if}
            </div>
          </div>
          <div class="barre-foi">
            <div class="barre-foi-texte">
              <strong>{t(lang, 'salle.patronFaitFoi')}</strong>
              <span>{t(lang, cle('salle.imprimerEchelle'))}</span>
            </div>
            <a class="bouton bouton-action" href={hrefPdf} download>{t(lang, 'commun.telechargerPdf')}</a>
          </div>
        </div>
      {:else}
        <div role="tabpanel" id="panneau-vue-3d" aria-labelledby="onglet-vue-3d">
          {#if Scene3D && mesures3d}
            <Scene3D mesures={mesures3d} couleurId={couleurId} matiere={matiere} onIndisponible={repli3d} onVues={(v: VuesApercu) => (vues3d = v)} />
          {/if}
          {#if vues3d}
            <ApercuTroisVues vues={vues3d} mesuresTexte={resume.join(' · ')} tissuTexte={tissuTexte} lang={lang} />
            <p class="aide-scene">{t(lang, 'salle.volumeIndicatifVirgule')}</p>
          {:else if message3d}
            <p>{t(lang, cle('salle.apercu3Indisponible'))}</p>
          {/if}
        </div>
      {/if}
    {:else}
      <p class="aide-scene">{t(lang, 'salle.vue3dIndisponible')}</p>
      <VisionneusePatron pieces={rendu.pieces} largeur={rendu.largeur} hauteur={rendu.hauteur} couleurTissu={couleurChoisie.hex} matiereTissu={matiere} lang={lang} />
    {/if}
  </div>

  <div class="tiroir">
    <div class="onglets-panneaux" role="tablist" aria-label={t(lang, cle('salle.panneaux'))}>
      <button type="button" role="tab" aria-selected={panneauMobile === 'mesures'} onclick={() => (panneauMobile = 'mesures')}>{t(lang, 'salle.vosMesures')}</button>
      <button type="button" role="tab" aria-selected={panneauMobile === 'tissu'} onclick={() => (panneauMobile = 'tissu')}>{t(lang, 'salle.tissu')}</button>
      <button type="button" role="tab" aria-selected={panneauMobile === 'patron'} onclick={() => (panneauMobile = 'patron')}>{t(lang, 'salle.votrePatron')}</button>
    </div>

    <section class="carte panneau" class:panneau-actif={panneauMobile === 'mesures'} aria-label={t(lang, 'salle.vosMesures')}>
      <div class="carte-entete">
        <h2>{t(lang, 'salle.vosMesures')}</h2>
        {#if ficheLibelle}<Puce ton="bleu">{ficheLibelle}</Puce>{/if}
      </div>
      <p class="aide">{t(lang, cle('salle.aideMesuresFiche'))}</p>
      {#if PRESETS.length > 0}
        <div class="presets" role="group" aria-label={t(lang, 'demo.morphologie')}>
          {#each PRESETS as p}
            <button type="button" class:actif={presetActif === p.id} aria-pressed={presetActif === p.id} onclick={() => appliquerPreset(p)}>{t(lang, p.libelleCle)}</button>
          {/each}
        </div>
      {/if}
      {#each champs as champ}
        <div class="pastille-mesure">
          <div class="pastille-ligne">
            <label for="live-{champ.code}">{champ.libelle}</label>
            <span class="pastille-valeur">
              <input id="live-{champ.code}" name="live-{champ.code}" type="text" inputmode="decimal" value={valeursLive[champ.code]} oninput={(e) => { valeursLive = { ...valeursLive, [champ.code]: e.currentTarget.value }; planifierMaj(champ.code); }} aria-invalid={erreursLive[champ.code] ? 'true' : undefined} aria-describedby={erreursLive[champ.code] ? `err-${champ.code}` : undefined} />
              <span aria-hidden="true">{t(lang, 'commun.cm')}</span>
            </span>
          </div>
          <input type="range" min={champ.minCm} max={champ.maxCm} step={champ.pasCm} value={nombreLive(champ.code, champ.minCm)} oninput={(e) => majDepuisCurseur(champ.code, e.currentTarget.valueAsNumber)} aria-label={t(lang, 'salle.curseur', { mesure: champ.libelle })} />
          <span class="aide">{t(lang, cle('salle.plagePas'), { min: fmt(champ.minCm), max: fmt(champ.maxCm), pas: fmt(champ.pasCm) })}</span>
          {#if erreursLive[champ.code]}<p class="erreur-mesure" id="err-{champ.code}" role="alert">{erreursLive[champ.code]}</p>{/if}
        </div>
      {/each}
    </section>

    <section class="carte panneau" class:panneau-actif={panneauMobile === 'tissu'} aria-label={t(lang, 'salle.tissu')}>
      <h2>{t(lang, 'salle.tissu')}</h2>
      <p id="tissu-choisi" aria-live="polite">{couleurLibelle} · {matiereLibelle}</p>
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
      <p class="aide">{t(lang, cle('salle.tissuAide'))}</p>
    </section>

    {#if entree.assistantIa}
    <section class="carte panneau" class:panneau-actif={panneauMobile === 'patron'} aria-label={t(lang, 'ia.titre')}>
      <h2>{t(lang, 'ia.titre')}</h2>
      <p class="aide">{t(lang, 'ia.texte')}</p>
      <label class="description-modele">{t(lang, cle('ia.modeleVoulu'))}
        <textarea bind:value={descriptionModele} rows="3" maxlength="300" placeholder={t(lang, 'ia.placeholder')}></textarea>
      </label>
      <p class="actions-ia">
        <button type="button" class="bouton bouton-secondaire" disabled={suggestionEnCours || descriptionModele.trim().length < 3} onclick={demanderSuggestion}>
          {suggestionEnCours ? t(lang, 'ia.enCours') : t(lang, 'ia.proposer')}
        </button>
      </p>
      {#if messageIa}<p class="message-ia" class:ok={suggestionIaOk} role="status" aria-live="polite">{messageIa}</p>{/if}
    </section>
    {/if}

    <section class="carte panneau carte-sombre-panneau" class:panneau-actif={panneauMobile === 'patron'} aria-label={t(lang, 'salle.votrePatron')}>
      <h2>{t(lang, 'salle.votrePatron')}</h2>
      {#if patronCote}
        <div class="puces-pieces">
          <span class="puce-piece">{t(lang, 'piece.devant')} ×2 · {t(lang, 'cote.bas')} {patronCote.valeurs.basDevant}</span>
          <span class="puce-piece">{t(lang, 'piece.dos')} ×2 · {t(lang, 'cote.bas')} {patronCote.valeurs.basDos}</span>
          <span class="puce-piece">{t(lang, 'piece.ceinture')} ×1 · {patronCote.valeurs.ceinture} {t(lang, 'commun.cm')}</span>
        </div>
      {:else}
        {#each rendu.pieces as piece}
          <h3 class="piece-nom">{piece.nom}</h3>
          <table>
            <tbody>
              {#each piece.tableau as ligne}<tr><th scope="row">{ligne.libelle}</th><td>{ligne.valeur} {t(lang, 'commun.cm')}</td></tr>{/each}
            </tbody>
          </table>
        {/each}
      {/if}
      <p class="texte-sombre-doux">{t(lang, 'demo.carreRappel')}</p>

      <form method="post" action={actionEnregistrer} class="enregistrer" id="form-enregistrer-salle">
        <input type="hidden" name="_csrf" value={csrfToken} />
        <input type="hidden" name="modele" value={modele} />
        {#each champs as champ}
          <input type="hidden" name={champ.code} value={mesuresValidees[champ.code]} />
        {/each}
        <input type="hidden" name="couleur_id" value={couleurId} />
        <input type="hidden" name="matiere_id" value={matiere} />
        <label class="nom-patron">{t(lang, 'salle.nomPatron')}
          <input name="nom_patron" value={nomInitial} required minlength="2" maxlength="80" />
        </label>
        {#if defsOptions.length > 0}
          <details bind:open={optionsOuvertes}>
            <summary>{t(lang, 'patron.mesures.options')}</summary>
            {#each defsOptions as def}
              {#if def.type === 'nombre'}
                <label>{t(lang, def.libelleCle)} ({t(lang, 'commun.cm')})
                  <input name={def.code} inputmode="decimal" placeholder={def.placeholderCle ? t(lang, def.placeholderCle) : ''} bind:value={optionsTexte[def.code]} oninput={verifierOptions} />
                </label>
              {:else if def.type === 'choix'}
                <fieldset class="options-choix">
                  <legend>{t(lang, def.libelleCle)}</legend>
                  {#each def.choix ?? [] as choix}
                    <label class="coche-option">
                      <input type="radio" name={def.code} value={choix.valeur} bind:group={optionsChoix[def.code]} />
                      {t(lang, choix.libelleCle)}
                    </label>
                  {/each}
                </fieldset>
              {:else}
                <label class="coche-option">
                  <input type="checkbox" name={def.code} value={String(def.defaut ?? 'oui')} checked={optionsChoix[def.code] === 'on'} onchange={(e) => { optionsChoix = { ...optionsChoix, [def.code]: e.currentTarget.checked ? 'on' : '' }; }} />
                  {t(lang, def.libelleCle)}
                </label>
              {/if}
            {/each}
            {#if erreurOptions}<p class="erreur-mesure" role="alert">{erreurOptions}</p>{/if}
          </details>
        {/if}
      </form>
    </section>
  </div>
</div>

<style>
  .entete-salle { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 14px 20px; margin: 4px 0 18px; }
  .entete-gauche { display: flex; align-items: flex-start; gap: 14px; flex-wrap: wrap; min-width: 0; }
  .retour { flex: 0 0 auto; width: 48px; height: 48px; border-radius: 999px; background: var(--carte); border: 1px solid var(--bord-fort); display: inline-flex; align-items: center; justify-content: center; color: var(--encre); text-decoration: none; }
  .titres { min-width: 0; }
  .titres h1 { margin: 0; font-size: clamp(1.45rem, 3.4vw, 1.75rem); font-weight: 800; letter-spacing: -0.02em; overflow-wrap: anywhere; }
  .titres p { margin: 2px 0 0; font-size: 14px; color: var(--texte-secondaire); }
  .titres .info-patron { font-size: 13px; }
  .entete-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .entete-actions .bouton { min-height: 50px; }
  @media (min-width: 1024px) {
    .entete-salle { flex-wrap: nowrap; }
    .entete-gauche { flex-wrap: nowrap; align-items: center; }
    .entete-gauche :global(.puce) { flex: 0 0 auto; white-space: nowrap; }
    .entete-actions { flex: 0 0 auto; }
  }

  .essayage { display: grid; gap: 20px; margin: 0 0 16px; }
  @media (min-width: 1024px) { .essayage { grid-template-columns: minmax(0, 65fr) minmax(0, 35fr); align-items: start; } }
  .carte-scene { border: 1px solid var(--bord); border-radius: 32px; padding: 20px; background: radial-gradient(ellipse at 50% 38%, #ffffff 0%, #edeef4 55%, #dddfea 100%); box-shadow: var(--ombre-petite); position: relative; min-width: 0; }
  .scene-haut { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
  .onglets-vue { display: inline-flex; background: var(--carte); border: 1px solid var(--bord); border-radius: 999px; padding: 5px; gap: 2px; }
  .onglets-vue button { min-height: 44px; padding: 0 20px; border: 0; border-radius: 999px; background: transparent; color: var(--encre); font-size: 14px; box-shadow: none; }
  .onglets-vue button.actif { background: var(--encre); color: #fff; }
  .bandeau-indicatif { align-self: center; font-size: 12px; font-weight: 700; line-height: 1.35; background: var(--peche-pastille); color: var(--peche-texte); border-radius: 16px; padding: 8px 14px; max-width: 220px; text-align: center; }
  .loupe-scene { margin-left: auto; display: grid; justify-items: center; gap: 4px; }
  .loupe-scene :global(figcaption) { background: var(--carte); border: 1px solid var(--bord); border-radius: 999px; padding: 4px 12px; }

  .controles-zoom { display: flex; flex-direction: row; gap: 10px; margin: 14px 0 0; }
  @media (min-width: 700px) { .controles-zoom { position: absolute; left: 20px; top: 92px; margin: 0; z-index: 2; flex-direction: column; } }
  .controles-zoom button { width: 48px; height: 48px; min-width: 48px; padding: 0; border-radius: 999px; border: 1px solid var(--bord-fort); background: var(--carte); color: var(--encre); font-size: 20px; box-shadow: none; }
  .controles-zoom button[disabled] { opacity: 0.45; }
  .plat-defilant { overflow: auto; max-width: 100%; }
  .plat-zoom { width: calc(100% * var(--zoom, 1)); max-width: none; margin: 0 auto; transition: width var(--transition); }
  .barre-foi { margin-top: 16px; background: rgb(255 255 255 / 0.92); border: 1px solid var(--bord); border-radius: 24px; padding: 12px 18px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 18px; justify-content: space-between; }
  .barre-foi-texte { display: flex; flex-direction: column; gap: 2px; max-width: 430px; }
  .barre-foi-texte strong { font-size: 14px; font-weight: 800; }
  .barre-foi-texte span { font-size: 13px; line-height: 1.45; color: var(--texte-secondaire); }
  @media (min-width: 700px) {
    .barre-foi { flex-wrap: nowrap; }
    .barre-foi-texte { flex: 1 1 auto; min-width: 0; }
    .barre-foi .bouton { flex: 0 0 auto; }
  }
  .aide-scene { font-size: 13px; color: var(--texte-secondaire); }

  .tiroir { display: grid; gap: 18px; min-width: 0; align-content: start; }
  .tiroir .carte { margin: 0; }
  .onglets-panneaux { display: none; gap: 8px; }
  .onglets-panneaux button { min-height: 48px; flex: 1; }
  .onglets-panneaux button[aria-selected='true'] { background: var(--encre); border-color: var(--encre); color: #fff; }
  .carte-entete { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .panneau h2 { margin: 0 0 6px; font-size: 19px; font-weight: 800; }
  .carte-entete h2 { margin: 0; }
  .presets { display: flex; gap: 8px; flex-wrap: wrap; margin: 4px 0 6px; }
  .presets button { min-height: 38px; padding: 0 16px; border-radius: 999px; border: 1.5px solid var(--bord-fort); background: var(--carte); color: var(--encre); font-size: 13px; box-shadow: none; }
  .presets button.actif { background: var(--encre); border-color: var(--encre); color: #fff; }
  .pastille-mesure { padding: 10px 0 4px; display: grid; gap: 6px; }
  .pastille-ligne { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .pastille-ligne label { font-size: 14px; font-weight: 700; }
  .pastille-valeur { display: inline-flex; align-items: center; gap: 6px; min-width: 96px; min-height: 38px; border-radius: 12px; background: var(--fond); padding: 2px 12px 2px 6px; font-weight: 800; font-size: 15px; }
  .pastille-valeur input { width: 4.2rem; min-height: 34px; font: inherit; font-weight: 800; text-align: right; padding: 2px 4px; border: 0; background: transparent; color: var(--encre); }
  .pastille-valeur input:focus-visible { outline: 3px solid var(--focus); outline-offset: 1px; border-radius: 8px; }
  .pastille-mesure input[type='range'] { width: 100%; min-height: 44px; accent-color: var(--encre); margin: 0; }
  .erreur-mesure { margin: 8px 0 0; padding: 8px 10px; border-radius: 8px; background: var(--rouge-doux); font-weight: 600; }
  .aide { font-weight: 400; font-size: 14px; color: var(--texte-secondaire); margin: 0 0 6px; }
  .description-modele { display: grid; gap: 6px; font-weight: 600; margin-top: 10px; }
  .description-modele textarea { font: inherit; font-weight: 400; padding: 10px 12px; border: 1.5px solid var(--bord-fort); border-radius: 14px; width: 100%; background: #fff; color: var(--encre); resize: vertical; }
  .actions-ia { margin: 10px 0 0; }
  .message-ia { margin: 12px 0 0; padding: 10px 12px; border-radius: 12px; background: var(--fond); font-weight: 600; font-size: 14px; line-height: 1.5; }
  .message-ia.ok { background: var(--lavande-pastille); color: var(--lavande-texte); }

  .pastilles-couleur { display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0; }
  .pastille-couleur { width: 44px; height: 44px; min-width: 44px; border-radius: 999px; background: var(--pastille); border: 2px solid var(--bord-fort); padding: 0; box-shadow: none; }
  .pastille-couleur.actif { border: 3px solid var(--encre); box-shadow: 0 0 0 3px var(--carte), 0 0 0 5px var(--bleu); }
  .matieres { display: flex; background: var(--fond); border-radius: 999px; padding: 5px; gap: 2px; }
  .matieres button { flex: 1; min-height: 42px; border: 0; border-radius: 999px; background: transparent; color: var(--encre); font-size: 14px; box-shadow: none; }
  .matieres button.actif { background: var(--encre); color: #fff; }

  .carte-sombre-panneau { background: var(--carte-sombre); color: #fff; border-color: var(--carte-sombre); }
  .carte-sombre-panneau h2 { color: #fff; }
  .puces-pieces { display: flex; gap: 10px; flex-wrap: wrap; margin: 6px 0; }
  .puce-piece { background: rgb(255 255 255 / 0.1); border-radius: 14px; padding: 10px 14px; font-size: 13px; font-weight: 600; }
  .texte-sombre-doux { margin: 6px 0 0; font-size: 13px; line-height: 1.5; color: #b9b8d3; }
  .piece-nom { margin: 10px 0 4px; font-size: 15px; color: #fff; }
  .enregistrer { display: grid; gap: 12px; border-top: 1px solid rgb(255 255 255 / 0.22); padding-top: 14px; margin-top: 14px; }
  .enregistrer label { display: grid; gap: 6px; font-weight: 600; }
  .enregistrer input { min-height: 48px; font: inherit; padding: 10px 12px; border: 2px solid var(--bord-fort); border-radius: 10px; width: 100%; background: #fff; color: var(--encre); }
  .enregistrer details { display: grid; gap: 10px; }
  .enregistrer .coche-option { display: flex; gap: 10px; align-items: center; font-weight: 600; min-height: 44px; }
  .enregistrer .coche-option input { min-height: auto; width: auto; }
  .options-choix { border: 0; padding: 0; margin: 0; display: grid; gap: 4px; }
  .options-choix legend { font-weight: 600; padding: 0; margin-bottom: 4px; }
  .enregistrer summary { min-height: 48px; display: flex; align-items: center; font-weight: 700; cursor: pointer; }
  table { border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid rgb(255 255 255 / 0.35); padding: 5px 10px; text-align: left; font-weight: 400; }
  th { font-weight: 600; }
  @media (max-width: 760px) {
    .onglets-panneaux { display: flex; position: sticky; top: 0; z-index: 2; background: var(--fond); padding: 6px 0; }
    .panneau { display: none; }
    .panneau.panneau-actif { display: block; }
    .loupe-scene { margin-left: 0; }
    .bandeau-indicatif { max-width: none; }
  }
</style>
