<script lang="ts">
  import IllustrationMesure from '$lib/illustrations/IllustrationMesure.svelte';
  import IllustrationModele from '$lib/illustrations/IllustrationModele.svelte';
  import VisionneusePatron from '$lib/design/VisionneusePatron.svelte';
  import LoupeTissu from '$lib/demo/LoupeTissu.svelte';
  import ApercuTroisVues from '$lib/demo/ApercuTroisVues.svelte';
  import type { VuesApercu } from '$lib/demo/planche';
  import { COULEURS_TISSU, MATIERES, couleurTissu, type MatiereId } from '$lib/demo/tissus';
  import Epingle from '$lib/design/icones/Epingle.svelte';
  import { definitionMensuration, validerMensurationSaisie } from '$lib/domain/mensurations-saisie';
  import { preparerPiece } from '$lib/patterns/apercu-rendu';
  import { genererPiecesPlacees, MODELES, validerMesuresPatron } from '$lib/patterns/saisie-patron';

  const PRESETS = {
    petite: { libelle: 'Petite', tour_taille_cm: '64', tour_hanches_cm: '88', hauteur_fourche_cm: '24', longueur_pantalon_cm: '96' },
    moyenne: { libelle: 'Moyenne', tour_taille_cm: '82', tour_hanches_cm: '100', hauteur_fourche_cm: '27', longueur_pantalon_cm: '105' },
    forte: { libelle: 'Forte', tour_taille_cm: '110', tour_hanches_cm: '128', hauteur_fourche_cm: '31', longueur_pantalon_cm: '108' }
  } as const;
  type ClePreset = keyof typeof PRESETS;

  const AIDES: Record<string, { aide: string; exemple: string }> = {
    tour_taille_cm: { aide: 'Faites le tour au creux naturel de la taille, ruban à plat, sans serrer.', exemple: 'Exemple courant : 82 cm.' },
    tour_hanches_cm: { aide: 'Faites le tour à l’endroit le plus fort des hanches et des fesses.', exemple: 'Exemple courant : 100 cm.' },
    hauteur_fourche_cm: { aide: 'Assise sur une chaise dure, mesurez le long du côté, de la taille jusqu’à la chaise.', exemple: 'Exemple courant : 27 cm.' },
    longueur_pantalon_cm: { aide: 'Debout, mesurez le long du côté, de la taille jusqu’au sol (ou à la cheville souhaitée).', exemple: 'Exemple courant : 105 cm.' }
  };

  const GUIDES: Record<number, string> = {
    1: 'Commencez ici : choisissez le pantalon large. La jupe droite arrive bientôt, elle reste donc désactivée.',
    2: 'Touchez Petite, Moyenne ou Forte pour remplir les mesures d’un coup, puis ajustez chaque champ si besoin avant de continuer.',
    3: 'Bienvenue dans la salle d’essayage : touchez une mesure, un tissu ou la vue — le patron brouillon se redessine en direct, sans rien enregistrer.',
    4: 'Dernière étape : téléchargez le PDF A4 à l’échelle 1:1, puis vérifiez le carré de contrôle de 10 cm à la règle avant toute coupe.'
  };

  const ETAPES = ['Choisir le modèle', 'Mesures', 'Patron', 'Résultat'] as const;
  const champs = MODELES.pantalon_large.champs.map((code) => {
    const def = definitionMensuration(code);
    return { code, libelle: def.libelle, minCm: def.minCm, maxCm: def.maxCm, pasCm: 0.5, ...AIDES[code]! };
  });

  // --- Salle d'essayage (étape 3) : état en direct, dernier patron valide conservé ---
  let valeursLive = $state<Record<string, string>>({ tour_taille_cm: '', tour_hanches_cm: '', hauteur_fourche_cm: '', longueur_pantalon_cm: '' });
  let erreursLive = $state<Record<string, string>>({});
  let messageConfirme = $state('');
  let presetLive = $state<ClePreset | ''>('');
  let couleurId = $state('bleu-denim');
  let matiere = $state<MatiereId>('denim');
  let vue = $state<'3d' | 'plat'>('plat');
  let message3d = $state('');
  let vues3d = $state<VuesApercu | null>(null);
  const tissuTexte = $derived(`${couleurTissu(couleurId).libelle} · ${MATIERES.find((m) => m.id === matiere)?.libelle ?? matiere}`);
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
        message3d = 'Le chargement de la 3D a échoué : voici le patron à plat.';
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
        erreurs[champ.code] = e instanceof Error ? e.message : 'Vérifiez cette mesure.';
      }
    }
    if (Object.keys(erreurs).length > 0) {
      erreursLive = erreurs; // dernier patron valide conservé : mesuresValidees inchangées
      messageConfirme = '';
      return false;
    }
    try {
      mesuresValidees = validerMesuresPatron('pantalon_large', (code) => String(candidat[code]));
    } catch (e) {
      erreursLive = codeModifie ? { [codeModifie]: e instanceof Error ? e.message : 'Vérifiez vos mesures.' } : {};
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
    valeursLive = { ...valeursLive, [code]: String(valeur).replace('.', ',') };
    planifierMaj(code);
  }
  function choisirPresetLive(cle: ClePreset) {
    const p = PRESETS[cle];
    presetLive = cle;
    valeursLive = { tour_taille_cm: p.tour_taille_cm, tour_hanches_cm: p.tour_hanches_cm, hauteur_fourche_cm: p.hauteur_fourche_cm, longueur_pantalon_cm: p.longueur_pantalon_cm };
    if (minuteur) clearTimeout(minuteur);
    tenterMajLive();
  }
  function confirmerMesures() {
    if (minuteur) clearTimeout(minuteur);
    if (tenterMajLive()) messageConfirme = 'Mesures confirmées : le patron ci-contre est à jour.';
  }
  const nombreLive = (code: string, min: number) => {
    const v = Number((valeursLive[code] ?? '').replace(',', '.'));
    return Number.isFinite(v) ? v : min;
  };

  let etape = $state(1);
  // « Moyenne » sélectionnée par défaut dès l'ouverture, mesures préremplies :
  // « Voir mon patron » affiche le plan sans autre clic. Petite/Forte restent choisissables.
  let valeurs = $state<Record<string, string>>({
    tour_taille_cm: PRESETS.moyenne.tour_taille_cm,
    tour_hanches_cm: PRESETS.moyenne.tour_hanches_cm,
    hauteur_fourche_cm: PRESETS.moyenne.hauteur_fourche_cm,
    longueur_pantalon_cm: PRESETS.moyenne.longueur_pantalon_cm
  });
  let presetActif = $state<ClePreset | ''>('moyenne');
  let erreur = $state('');
  let aideOuverte = $state(true);

  function aller(n: number) {
    etape = Math.min(4, Math.max(1, n));
    aideOuverte = true;
    erreur = '';
  }
  function choisirPreset(cle: ClePreset) {
    const p = PRESETS[cle];
    presetActif = cle;
    valeurs = { tour_taille_cm: p.tour_taille_cm, tour_hanches_cm: p.tour_hanches_cm, hauteur_fourche_cm: p.hauteur_fourche_cm, longueur_pantalon_cm: p.longueur_pantalon_cm };
    erreur = '';
  }

  let mesuresValidees = $state<Record<string, number> | null>(null);
  function voirPatron() {
    try {
      mesuresValidees = validerMesuresPatron('pantalon_large', (code) => valeurs[code]);
      valeursLive = Object.fromEntries(Object.entries(mesuresValidees).map(([k, v]) => [k, String(v).replace('.', ',')]));
      erreursLive = {};
      messageConfirme = '';
      aller(3);
    } catch (e) {
      erreur = e instanceof Error ? e.message : 'Vérifiez vos mesures, puis réessayez.';
    }
  }

  const rendu = $derived.by(() => {
    if (!mesuresValidees) return null;
    const { pieces, largeur, hauteur } = genererPiecesPlacees('pantalon_large', mesuresValidees);
    return { pieces: pieces.map(preparerPiece), largeur: Math.ceil(largeur), hauteur: Math.ceil(hauteur) };
  });
  const mesures3d = $derived(
    mesuresValidees
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
    const params = new URLSearchParams(Object.fromEntries(Object.entries(mesuresValidees).map(([k, v]) => [k, String(v)])));
    return `/demo/pdf?${params.toString()}`;
  });
  const resume = $derived(
    mesuresValidees ? champs.map((c) => `${c.libelle.replace(' (cm)', '')} : ${String(mesuresValidees![c.code]).replace('.', ',')} cm`) : []
  );
</script>

<svelte:head><title>Démo guidée — Studio Couture</title></svelte:head>

<main>
  <p><a href="/">← Retour à l’accueil</a></p>
  <h1>Démo guidée</h1>
  <p class="chapeau">Sans compte, sans photo : un modèle, quatre mesures, un patron brouillon. Rien n’est enregistré.</p>

  <section class="alerte" role="alert">
    <strong>Brouillon non validé.</strong>
    Ces formules sont marquées « à valider » : un maître tailleur ne les a pas encore confirmées. Essayez d’abord sur un tissu peu coûteux.
  </section>

  <div class="progression-wrap">
    <ol class="progression" aria-label="Progression de la démo">
      {#each ETAPES as nom, i}
        <li aria-current={etape === i + 1 ? 'step' : undefined} class:fait={etape > i + 1} class:actuel={etape === i + 1}>
          <span class="pastille">{i + 1}</span> {nom}
        </li>
      {/each}
    </ol>
    <button type="button" class="bouton bouton-discret" onclick={() => (aideOuverte = true)}>Aide</button>
  </div>
  <div class="barre" aria-hidden="true"><span style="width: {etape * 25}%"></span></div>

  {#if aideOuverte}
    <aside class="bulle" aria-label="Bulle de guidage">
      <Epingle />
      <p>{GUIDES[etape]}</p>
      <button type="button" onclick={() => (aideOuverte = false)}>Fermer l’aide</button>
    </aside>
  {/if}

  {#if etape > 1}
    <p><button type="button" onclick={() => aller(etape - 1)}>← Retour</button></p>
  {/if}

  {#if etape === 1}
    <section aria-labelledby="titre-etape-1">
      <h2 id="titre-etape-1">1. Choisir le modèle</h2>
      <div class="modeles">
        <article class="carte modele">
          <IllustrationModele modele="pantalon_large" />
          <h3>Pantalon large</h3>
          <p>Taille haute, jambes amples, 4 mesures au mètre ruban.</p>
          <button type="button" class="bouton-action" onclick={() => aller(2)}>Choisir le pantalon large</button>
        </article>
        <article class="carte modele bientot">
          <IllustrationModele modele="jupe_droite" />
          <h3>Jupe droite</h3>
          <p>Bientôt dans la démo.</p>
          <button type="button" disabled>Bientôt</button>
        </article>
      </div>
    </section>
  {:else if etape === 2}
    <section aria-labelledby="titre-etape-2">
      <h2 id="titre-etape-2">2. Mesures</h2>
      <p>Choisissez une silhouette pour préremplir, puis ajustez au mètre ruban, en centimètres.</p>
      <div class="presets" role="group" aria-label="Silhouettes prédéfinies">
        {#each Object.entries(PRESETS) as [cle, p]}
          <button type="button" class:actif={presetActif === cle} onclick={() => choisirPreset(cle as ClePreset)}>{p.libelle}</button>
        {/each}
      </div>
      {#if erreur}<p class="alerte" role="alert">{erreur}</p>{/if}
      <form class="grille" onsubmit={(e) => { e.preventDefault(); voirPatron(); }}>
        {#each champs as champ}
          <div class="champ">
            <IllustrationMesure code={champ.code} />
            <label>{champ.libelle}
              <input name={champ.code} inputmode="decimal" required placeholder="ex. 82,5" bind:value={valeurs[champ.code]} />
              <span class="aide">{champ.aide} {champ.exemple} Plage acceptée : {champ.minCm} à {champ.maxCm} cm.</span>
            </label>
          </div>
        {/each}
        <button type="submit" class="bouton-action">Voir mon patron</button>
      </form>
    </section>
  {:else if etape === 3 && rendu}
    <section aria-labelledby="titre-etape-3">
      <h2 id="titre-etape-3">3. Salle d’essayage — patron brouillon coté</h2>
      <p class="resume">{resume.join(' · ')}</p>
      <p>Modifiez une mesure ou un tissu : le patron se redessine en direct. Une valeur hors plage garde le dernier patron valide.</p>

      <div class="essayage">
        <div class="scene-essayage carte-scene">
          <div class="scene-haut">
            <div class="bascule" role="group" aria-label="Choix de la vue">
              <button type="button" class:actif={vue === '3d'} aria-pressed={vue === '3d'} onclick={activerVue3d}>Vue 3D</button>
              <button type="button" class:actif={vue === 'plat'} aria-pressed={vue === 'plat'} onclick={() => (vue = 'plat')}>Patron à plat</button>
            </div>
            <LoupeTissu couleurId={couleurId} matiere={matiere} />
          </div>
          <div class="ombre-sol" aria-hidden="true"></div>
          {#if message3d}<p class="erreur-mesure" role="alert">{message3d}</p>{/if}
          {#if vue === '3d' && Scene3D && mesures3d}
            <Scene3D mesures={mesures3d} couleurId={couleurId} matiere={matiere} onIndisponible={repli3d} onVues={(v: VuesApercu) => (vues3d = v)} />
          {:else}
            <VisionneusePatron pieces={rendu.pieces} largeur={rendu.largeur} hauteur={rendu.hauteur} couleurTissu={couleurChoisie.hex} matiereTissu={matiere} />
          {/if}
          {#if vues3d && vue === '3d'}
            <ApercuTroisVues vues={vues3d} mesuresTexte={resume.join(' · ')} tissuTexte={tissuTexte} />
          {:else if message3d}
            <p>Aperçu en 3 images indisponible ici : le patron à plat ci-dessus reste consultable et téléchargeable en PDF.</p>
          {/if}
        </div>

        <div class="tiroir">
          <div class="onglets-panneaux" role="tablist" aria-label="Panneaux de la salle d’essayage">
            <button type="button" role="tab" aria-selected={panneauMobile === 'mesures'} onclick={() => (panneauMobile = 'mesures')}>Mesures</button>
            <button type="button" role="tab" aria-selected={panneauMobile === 'tissu'} onclick={() => (panneauMobile = 'tissu')}>Tissu</button>
            <button type="button" role="tab" aria-selected={panneauMobile === 'patron'} onclick={() => (panneauMobile = 'patron')}>Patron</button>
          </div>

          <section class="carte panneau" class:panneau-actif={panneauMobile === 'mesures'} aria-label="Vos mesures">
            <h3>Vos mesures</h3>
            <div class="presets" role="group" aria-label="Silhouettes prédéfinies">
              {#each Object.entries(PRESETS) as [cle, p]}
                <button type="button" class:actif={presetLive === cle} onclick={() => choisirPresetLive(cle as ClePreset)}>{p.libelle}</button>
              {/each}
            </div>
            {#each champs as champ}
              <div class="pastille-mesure">
                <label for="live-{champ.code}">{champ.libelle}</label>
                <div class="pastille-ligne">
                  <input id="live-{champ.code}" name="live-{champ.code}" type="text" inputmode="decimal" value={valeursLive[champ.code]} oninput={(e) => { valeursLive = { ...valeursLive, [champ.code]: e.currentTarget.value }; planifierMaj(champ.code); }} aria-invalid={erreursLive[champ.code] ? 'true' : undefined} aria-describedby={erreursLive[champ.code] ? `err-${champ.code}` : undefined} />
                  <span aria-hidden="true">cm</span>
                </div>
                <input type="range" min={champ.minCm} max={champ.maxCm} step={champ.pasCm} value={nombreLive(champ.code, champ.minCm)} oninput={(e) => majDepuisCurseur(champ.code, e.currentTarget.valueAsNumber)} aria-label="Curseur {champ.libelle}" />
                <span class="aide">Plage : {champ.minCm} à {champ.maxCm} cm, pas de {String(champ.pasCm).replace('.', ',')} cm.</span>
                {#if erreursLive[champ.code]}<p class="erreur-mesure" id="err-{champ.code}" role="alert">{erreursLive[champ.code]}</p>{/if}
              </div>
            {/each}
            <button type="button" class="bouton bouton-action" onclick={confirmerMesures}>Confirmer</button>
            {#if messageConfirme}<p class="confirme" role="status">{messageConfirme}</p>{/if}
          </section>

          <section class="carte panneau" class:panneau-actif={panneauMobile === 'tissu'} aria-label="Tissu">
            <h3>Tissu</h3>
            <p id="tissu-choisi" aria-live="polite">{couleurChoisie.libelle} · {MATIERES.find((m) => m.id === matiere)?.libelle}</p>
            <div class="pastilles-couleur" role="group" aria-label="Couleur du tissu">
              {#each COULEURS_TISSU as c}
                <button type="button" class="pastille-couleur" class:actif={couleurId === c.id} style="--pastille: {c.hex}" aria-pressed={couleurId === c.id} aria-label="Couleur {c.libelle}" title={c.libelle} onclick={() => (couleurId = c.id)}></button>
              {/each}
            </div>
            <div class="matieres" role="group" aria-label="Matière">
              {#each MATIERES as m}
                <button type="button" class:actif={matiere === m.id} aria-pressed={matiere === m.id} onclick={() => (matiere = m.id)}>{m.libelle}</button>
              {/each}
            </div>
            <p class="aide">La couleur remplit les pièces du patron à plat ; la loupe, à côté de la scène, montre la matière en gros plan.</p>
          </section>

          <section class="carte panneau" class:panneau-actif={panneauMobile === 'patron'} aria-label="Votre patron">
            <h3>Votre patron</h3>
            {#each rendu.pieces as piece}
              <h4>{piece.nom}</h4>
              <table>
                <tbody>
                  {#each piece.tableau as ligne}<tr><th scope="row">{ligne.libelle}</th><td>{ligne.valeur} cm</td></tr>{/each}
                </tbody>
              </table>
            {/each}
            <p><a class="bouton bouton-action" href={hrefPdf} download>Télécharger le PDF A4 1:1</a></p>
            <p>Après impression en taille réelle, vérifiez le <strong>carré de contrôle de 10 cm</strong> à la règle avant de couper.</p>
          </section>
        </div>
      </div>
      <p><button type="button" class="bouton-action" onclick={() => aller(4)}>Voir le résultat et le PDF</button></p>
    </section>
  {:else if etape === 4}
    <section aria-labelledby="titre-etape-4">
      <h2 id="titre-etape-4">4. Résultat</h2>
      <p class="resume">{resume.join(' · ')}</p>
      {#if vues3d}
        <ApercuTroisVues vues={vues3d} mesuresTexte={resume.join(' · ')} tissuTexte={tissuTexte} afficherPlanche />
      {:else}
        <section class="carte">
          <h3>Aperçu en 3 images</h3>
          <p>Ouvrez la « Vue 3D » à l’étape 3 pour générer l’aperçu en 3 images. En attendant, voici le patron à plat.</p>
          {#if rendu}<VisionneusePatron pieces={rendu.pieces} largeur={rendu.largeur} hauteur={rendu.hauteur} couleurTissu={couleurChoisie.hex} matiereTissu={matiere} />{/if}
        </section>
      {/if}
      <p><a class="bouton bouton-action" href={hrefPdf} download>Télécharger le PDF A4 1:1</a></p>
      <section class="carte">
        <h3>Avant de couper</h3>
        <p>Imprimez sans mise à l’échelle (« taille réelle »), assemblez les pages, puis vérifiez le <strong>carré de contrôle de 10 cm</strong> à la règle. S’il ne mesure pas 10 cm, réimprimez en taille réelle.</p>
      </section>
      <section class="carte">
        <h3>Et ensuite</h3>
        <ol>
          <li>Coupez une toile d’essayage dans un tissu bon marché.</li>
          <li>Faites valider les formules par votre maître tailleur avant un tissu précieux.</li>
          <li>Revenez à l’étape 3 pour revoir le volume en 3D (généré des cotes, pas un drapé simulé), et bientôt : devis de tissu.</li>
        </ol>
      </section>
      <p>
        <button type="button" onclick={() => aller(1)}>Recommencer la démo</button>
        <a class="bouton bouton-discret" href="/connexion">Espace atelier (connexion)</a>
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
  .bientot { opacity: 0.72; }
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
