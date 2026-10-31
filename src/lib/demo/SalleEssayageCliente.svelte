<script lang="ts">
  import VisionneusePatron from '$lib/design/VisionneusePatron.svelte';
  import LoupeTissu from '$lib/demo/LoupeTissu.svelte';
  import ApercuTroisVues from '$lib/demo/ApercuTroisVues.svelte';
  import type { VuesApercu } from '$lib/demo/planche';
  import { COULEURS_TISSU, MATIERES, couleurTissu, type MatiereId } from '$lib/demo/tissus';
  import { definitionMensuration, validerMensurationSaisie } from '$lib/domain/mensurations-saisie';
  import { preparerPiece } from '$lib/patterns/apercu-rendu';
  import { genererPiecesPlacees, MODELES, validerMesuresPatron, type ModelePatron } from '$lib/patterns/saisie-patron';
  import type { OptionsPantalonLarge } from '$lib/patterns/pantalon-large/geometry';

  /**
   * Salle d'essayage connectée : mêmes composants que la démo publique
   * (mesures en direct, tissu, patron à plat, 3D et aperçu 3 images), mais les
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
    optionsInitiales = {}
  }: {
    modele: ModelePatron;
    mesuresInitiales: Record<string, number>;
    nomInitial: string;
    csrfToken: string;
    actionEnregistrer: string;
    libelleEnregistrer: string;
    tissuInitial?: { couleurId: string; matiereId: string };
    optionsInitiales?: Record<string, number>;
  } = $props();

  const champs = $derived(MODELES[modele].champs.map((code) => {
    const def = definitionMensuration(code);
    return { code, libelle: def.libelle, minCm: def.minCm, maxCm: def.maxCm, pasCm: 0.5 };
  }));
  const fmt = (v: number) => String(v).replace('.', ',');

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
  let minuteur: ReturnType<typeof setTimeout> | undefined;

  // Options du pantalon (jamais obligatoires) : chaînes du formulaire, converties si valides.
  // svelte-ignore state_referenced_locally
  let optionsTexte = $state<Record<string, string>>({
    largeur_bas_cm: optionsInitiales.largeurBasPieceCm !== undefined ? fmt(optionsInitiales.largeurBasPieceCm) : '',
    profondeur_pli_cm: optionsInitiales.profondeurPliCm !== undefined ? fmt(optionsInitiales.profondeurPliCm) : '',
    hauteur_ceinture_cm: optionsInitiales.hauteurCeintureFinieCm !== undefined ? fmt(optionsInitiales.hauteurCeintureFinieCm) : ''
  });
  let erreurOptions = $state('');
  const optionsValides = $derived.by((): OptionsPantalonLarge => {
    const lire = (code: string, min: number, max: number) => {
      const brut = (optionsTexte[code] ?? '').trim().replace(',', '.');
      if (!brut) return undefined;
      const v = Number(brut);
      return Number.isFinite(v) && v >= min && v <= max ? v : undefined;
    };
    return {
      largeurBasPieceCm: lire('largeur_bas_cm', 18, 40),
      profondeurPliCm: lire('profondeur_pli_cm', 0, 8),
      hauteurCeintureFinieCm: lire('hauteur_ceinture_cm', 3, 6)
    };
  });
  function verifierOptions() {
    const bornes: Record<string, [number, number]> = { largeur_bas_cm: [18, 40], profondeur_pli_cm: [0, 8], hauteur_ceinture_cm: [3, 6] };
    for (const [code, [min, max]] of Object.entries(bornes)) {
      const brut = (optionsTexte[code] ?? '').trim().replace(',', '.');
      if (brut && (!Number.isFinite(Number(brut)) || Number(brut) < min || Number(brut) > max)) {
        erreurOptions = `Option « ${code.replaceAll('_', ' ')} » : entrez un nombre entre ${min} et ${max} cm (ou laissez vide).`;
        return;
      }
    }
    erreurOptions = '';
  }

  const couleurChoisie = $derived(couleurTissu(couleurId));
  const tissuTexte = $derived(`${couleurChoisie.libelle} · ${MATIERES.find((m) => m.id === matiere)?.libelle ?? matiere}`);
  const rendu = $derived.by(() => {
    const { pieces, largeur, hauteur } = genererPiecesPlacees(modele, mesuresValidees, modele === 'pantalon_large' ? optionsValides : {});
    return { pieces: pieces.map(preparerPiece), largeur: Math.ceil(largeur), hauteur: Math.ceil(hauteur) };
  });
  const resume = $derived(champs.map((c) => `${c.libelle.replace(' (cm)', '')} : ${fmt(mesuresValidees[c.code]!)} cm`));
  const mesures3d = $derived(
    modele === 'pantalon_large'
      ? {
          tourTailleCm: mesuresValidees.tour_taille_cm!,
          tourHanchesCm: mesuresValidees.tour_hanches_cm!,
          hauteurFourcheCm: mesuresValidees.hauteur_fourche_cm!,
          longueurPantalonCm: mesuresValidees.longueur_pantalon_cm!
        }
      : null
  );
  const hrefPdf = $derived.by(() => {
    const params = new URLSearchParams({ modele, nom: nomInitial });
    for (const [k, v] of Object.entries(mesuresValidees)) params.set(k, String(v));
    if (optionsValides.largeurBasPieceCm !== undefined) params.set('largeur_bas_cm', String(optionsValides.largeurBasPieceCm));
    if (optionsValides.profondeurPliCm !== undefined) params.set('profondeur_pli_cm', String(optionsValides.profondeurPliCm));
    if (optionsValides.hauteurCeintureFinieCm !== undefined) params.set('hauteur_ceinture_cm', String(optionsValides.hauteurCeintureFinieCm));
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
        message3d = 'Le chargement de la 3D a échoué : voici le patron à plat.';
      }
    }
  }
  function repli3d(message: string) {
    vue = 'plat';
    message3d = message;
  }

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
      erreursLive = erreurs; // dernier patron valide conservé
      return false;
    }
    try {
      mesuresValidees = validerMesuresPatron(modele, (code) => String(candidat[code]));
    } catch (e) {
      erreursLive = codeModifie ? { [codeModifie]: e instanceof Error ? e.message : 'Vérifiez vos mesures.' } : {};
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
</script>

<div class="essayage">
  <div class="scene-essayage carte-scene">
    <div class="scene-haut">
      {#if modele === 'pantalon_large'}
        <div class="bascule" role="group" aria-label="Choix de la vue">
          <button type="button" class:actif={vue === '3d'} aria-pressed={vue === '3d'} onclick={activerVue3d}>Vue 3D</button>
          <button type="button" class:actif={vue === 'plat'} aria-pressed={vue === 'plat'} onclick={() => (vue = 'plat')}>Patron à plat</button>
        </div>
      {/if}
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

    <section class="carte panneau" class:panneau-actif={panneauMobile === 'mesures'} aria-label="Mesures de la cliente">
      <h3>Mesures</h3>
      <p class="aide">Préremplies depuis la fiche — ajustez ici pour ce patron. La fiche n’est pas modifiée.</p>
      {#each champs as champ}
        <div class="pastille-mesure">
          <label for="live-{champ.code}">{champ.libelle}</label>
          <div class="pastille-ligne">
            <input id="live-{champ.code}" name="live-{champ.code}" type="text" inputmode="decimal" value={valeursLive[champ.code]} oninput={(e) => { valeursLive = { ...valeursLive, [champ.code]: e.currentTarget.value }; planifierMaj(champ.code); }} aria-invalid={erreursLive[champ.code] ? 'true' : undefined} aria-describedby={erreursLive[champ.code] ? `err-${champ.code}` : undefined} />
            <span aria-hidden="true">cm</span>
          </div>
          <input type="range" min={champ.minCm} max={champ.maxCm} step={champ.pasCm} value={nombreLive(champ.code, champ.minCm)} oninput={(e) => majDepuisCurseur(champ.code, e.currentTarget.valueAsNumber)} aria-label="Curseur {champ.libelle}" />
          <span class="aide">Plage : {champ.minCm} à {champ.maxCm} cm, pas de {fmt(champ.pasCm)} cm.</span>
          {#if erreursLive[champ.code]}<p class="erreur-mesure" id="err-{champ.code}" role="alert">{erreursLive[champ.code]}</p>{/if}
        </div>
      {/each}
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
      <h3>Ce patron</h3>
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

      <form method="post" action={actionEnregistrer} class="enregistrer">
        <input type="hidden" name="_csrf" value={csrfToken} />
        <input type="hidden" name="modele" value={modele} />
        {#each champs as champ}
          <input type="hidden" name={champ.code} value={mesuresValidees[champ.code]} />
        {/each}
        <input type="hidden" name="couleur_id" value={couleurId} />
        <input type="hidden" name="matiere_id" value={matiere} />
        <label class="nom-patron">Nom du patron
          <input name="nom_patron" value={nomInitial} required minlength="2" maxlength="80" />
        </label>
        {#if modele === 'pantalon_large'}
          <details>
            <summary>Options du modèle (facultatif)</summary>
            <label>Largeur du bas par pièce (cm)
              <input name="largeur_bas_cm" inputmode="decimal" placeholder="calculée : jambe droite" bind:value={optionsTexte.largeur_bas_cm} oninput={verifierOptions} />
            </label>
            <label>Profondeur du pli devant (cm)
              <input name="profondeur_pli_cm" inputmode="decimal" placeholder="4" bind:value={optionsTexte.profondeur_pli_cm} oninput={verifierOptions} />
            </label>
            <label>Hauteur finie de la ceinture (cm)
              <input name="hauteur_ceinture_cm" inputmode="decimal" placeholder="4" bind:value={optionsTexte.hauteur_ceinture_cm} oninput={verifierOptions} />
            </label>
            {#if erreurOptions}<p class="erreur-mesure" role="alert">{erreurOptions}</p>{/if}
          </details>
        {/if}
        <button type="submit" class="bouton bouton-action">{libelleEnregistrer}</button>
      </form>
    </section>
  </div>
</div>

<style>
  .essayage { display: grid; gap: 16px; margin: 16px 0; }
  @media (min-width: 1024px) { .essayage { grid-template-columns: minmax(0, 65fr) minmax(0, 35fr); align-items: start; } }
  .carte-scene { border: 1px solid var(--laiton); border-radius: 20px; padding: 16px; background: linear-gradient(160deg, var(--ivoire), #efe6d4 55%, #e7ddcb); box-shadow: var(--ombre); position: relative; overflow: hidden; }
  .scene-haut { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; justify-content: space-between; }
  .bascule { display: inline-flex; border: 2px solid var(--vert); border-radius: 999px; overflow: hidden; background: var(--papier); }
  .bascule button { min-height: 48px; border: 0; border-radius: 0; background: transparent; color: var(--encre); }
  .bascule button.actif { background: var(--vert); color: #fff; }
  .ombre-sol { height: 18px; margin: 4px 12% -6px; border-radius: 50%; background: radial-gradient(ellipse at center, rgb(30 26 23 / 0.22), transparent 70%); }
  .tiroir { display: grid; gap: 0; min-width: 0; }
  .onglets-panneaux { display: none; gap: 8px; }
  .onglets-panneaux button { min-height: 48px; flex: 1; }
  .onglets-panneaux button[aria-selected='true'] { background: var(--terracotta); border-color: var(--terracotta); color: #fff; }
  .pastille-mesure { border: 1px solid var(--bord); border-top: 3px solid var(--laiton); border-radius: var(--rayon); padding: 12px; margin: 10px 0; background: var(--papier); display: grid; gap: 8px; }
  .pastille-mesure label { font-weight: 700; }
  .pastille-ligne { display: flex; gap: 8px; align-items: center; }
  .pastille-ligne input { min-height: 48px; width: 7rem; max-width: 45%; font: inherit; padding: 8px; border: 2px solid var(--vert); border-radius: 10px; }
  .pastille-mesure input[type='range'] { width: 100%; min-height: 48px; accent-color: var(--terracotta); }
  .erreur-mesure { margin: 0; padding: 8px 10px; border-radius: 8px; background: var(--rouge-doux); font-weight: 600; }
  .aide { font-weight: 400; font-size: 15px; }
  .pastilles-couleur { display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0; }
  .pastille-couleur { width: 48px; height: 48px; min-width: 48px; border-radius: 999px; background: var(--pastille); border: 3px solid var(--bord); padding: 0; }
  .pastille-couleur.actif { border-color: var(--terracotta); box-shadow: 0 0 0 3px var(--papier), 0 0 0 6px var(--terracotta); }
  .matieres { display: flex; flex-wrap: wrap; gap: 8px; }
  .matieres button { min-height: 48px; }
  .matieres button.actif { background: var(--terracotta); border-color: var(--terracotta); color: #fff; }
  .enregistrer { display: grid; gap: 12px; border-top: 3px solid var(--laiton); padding-top: 14px; margin-top: 14px; }
  .enregistrer label { display: grid; gap: 6px; font-weight: 600; }
  .enregistrer input { min-height: 48px; font: inherit; padding: 10px 12px; border: 2px solid var(--vert); border-radius: 10px; width: 100%; background: #fff; color: var(--encre); }
  .enregistrer details { display: grid; gap: 10px; }
  .enregistrer summary { min-height: 48px; display: flex; align-items: center; font-weight: 700; cursor: pointer; }
  @media (max-width: 760px) {
    .essayage { grid-template-columns: minmax(0, 1fr); }
    .onglets-panneaux { display: flex; position: sticky; top: 0; z-index: 2; background: var(--ivoire); padding: 6px 0; }
    .panneau { display: none; }
    .panneau.panneau-actif { display: block; }
  }
  table { border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #8a7d67; padding: 5px 10px; text-align: left; font-weight: 400; }
  th { font-weight: 600; }
</style>
