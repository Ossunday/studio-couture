<script lang="ts">
  import { tick } from 'svelte';
  import { page } from '$app/state';
  import { formatCm, t, type Lang, type TranslationKey } from '$lib/i18n';
  import { resoudreMessageAssistant } from '$lib/design/assistant-statut';
  import { LISTE_MODELES, REGISTRE_MODELES, parametresOptionsModele, type ModelePatron, type OptionsModele } from '$lib/patterns/registre';

  /**
   * Assistant IA flottant (phase 12) : bouton rond « AI » sur toutes les
   * pages connectées, petite boîte de chat blanche. Vrai chat en mémoire de
   * page seulement (rien n’est enregistré) : description, photo (mêmes
   * règles que photo.ts côté serveur), question libre, puis — si besoin —
   * taille (cm) et corpulence pour des MESURES APPROXIMATIVES estimées.
   * Bulles construites par l’application depuis le JSON validé par le
   * serveur ; seul le court conseil filtré côté serveur est affiché tel
   * quel. Les estimations sont étiquetées et préremplissent un formulaire
   * modifiable : rien n’entre dans la fiche cliente sans validation.
   */
  let {
    lang = 'fr',
    csrfToken,
    disponible = false,
    clientes = []
  }: {
    lang?: Lang;
    csrfToken: string;
    disponible?: boolean;
    clientes?: { id: string; nom: string }[];
  } = $props();

  type Bulle =
    | { role: 'utilisatrice' | 'assistant'; texte: string }
    | { role: 'resultat'; modele: ModelePatron; options: OptionsModele; estimations: Record<string, number>; conseil?: string }
    | { role: 'candidats'; candidats: ModelePatron[] }
    | { role: 'propositions' };

  let ouvert = $state(false);
  let bulles = $state<Bulle[]>([]);
  let texte = $state('');
  let fichier = $state<File | null>(null);
  let consentement = $state(false);
  let enCours = $state(false);
  let indisponible = $state(false);
  let etapeAttente = $state(0);
  let enAttente = $state<{ modele: ModelePatron; options: OptionsModele } | null>(null);
  let tailleSaisie = $state('');
  let corpulence = $state<'petite' | 'moyenne' | 'forte'>('moyenne');
  let tailleConnue = $state<number | undefined>(undefined);
  let clienteChoisie = $state('');
  let boutonRef = $state<HTMLButtonElement | null>(null);
  let saisieRef = $state<HTMLInputElement | null>(null);
  let minuteurAttente: ReturnType<typeof setInterval> | undefined;

  const actif = $derived(disponible && !indisponible);
  const TAILLE_MAX = 5 * 1024 * 1024;
  const LIBELLES_ATTENTE: TranslationKey[] = ['assistant.attente.reflexion', 'assistant.attente.analyse', 'assistant.attente.redaction', 'assistant.attente.termine'];
  const CORPULENCES = [
    { valeur: 'petite', cle: 'assistant.corpulence.petite' },
    { valeur: 'moyenne', cle: 'assistant.corpulence.moyenne' },
    { valeur: 'forte', cle: 'assistant.corpulence.forte' }
  ] as const;

  const clientePageId = $derived.by(() => {
    const m = /^\/clientes\/([^/]+)/.exec(page.url.pathname);
    return m?.[1] ?? '';
  });
  const clienteEffective = $derived(clientePageId || clienteChoisie);

  function ajouter(bulle: Bulle) {
    bulles = [...bulles, bulle];
  }

  function demarrerAttente() {
    etapeAttente = 0;
    const reduit = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduit) return;
    minuteurAttente = setInterval(() => {
      etapeAttente = (etapeAttente + 1) % LIBELLES_ATTENTE.length;
    }, 1100);
  }

  function arreterAttente() {
    if (minuteurAttente) clearInterval(minuteurAttente);
    minuteurAttente = undefined;
  }

  async function basculer() {
    ouvert = !ouvert;
    if (ouvert) {
      if (bulles.length === 0) ajouter({ role: 'assistant', texte: t(lang, 'assistant.salutation') });
      await tick();
      saisieRef?.focus();
    } else {
      boutonRef?.focus();
    }
  }

  function fermer() {
    ouvert = false;
    boutonRef?.focus();
  }

  function surTouche(e: KeyboardEvent) {
    if (ouvert && e.key === 'Escape') fermer();
  }

  function demanderTaille(modele: ModelePatron, options: OptionsModele) {
    enAttente = { modele, options };
    ajouter({ role: 'assistant', texte: t(lang, 'assistant.demandeTaille') });
  }

  function traiterReponse(donnees: {
    statut?: string;
    cle?: string;
    modele?: string;
    options?: OptionsModele;
    estimations?: Record<string, number>;
    conseil?: string;
    candidats?: string[];
  }) {
    if (donnees.statut === 'ok' && donnees.modele && donnees.modele in REGISTRE_MODELES) {
      const modele = donnees.modele as ModelePatron;
      const estimations = donnees.estimations ?? {};
      ajouter({ role: 'resultat', modele, options: donnees.options ?? {}, estimations, conseil: donnees.conseil });
      if (Object.keys(estimations).length === 0 && tailleConnue === undefined) demanderTaille(modele, donnees.options ?? {});
      else enAttente = null;
      return;
    }
    if (donnees.statut === 'candidats' && Array.isArray(donnees.candidats) && donnees.candidats.length > 0) {
      ajouter({ role: 'candidats', candidats: donnees.candidats.filter((c): c is ModelePatron => c in REGISTRE_MODELES) });
      return;
    }
    if (donnees.statut === 'conseil' && donnees.conseil) {
      ajouter({ role: 'assistant', texte: donnees.conseil });
      return;
    }
    if (donnees.statut === 'hors_catalogue') {
      ajouter({ role: 'assistant', texte: t(lang, 'assistant.horsCatalogue') });
      ajouter({ role: 'propositions' });
      return;
    }
    const resolution = resoudreMessageAssistant(donnees.statut === 'ok' ? 'invalide' : donnees.statut, donnees.cle);
    if (resolution?.rendIndisponible) indisponible = true;
    ajouter({ role: 'assistant', texte: t(lang, resolution?.cleMessage ?? 'assistant.reponseInvalide') });
  }

  async function envoyerTexte() {
    const valeur = texte.trim();
    if (!actif || enCours || valeur.length < 3) return;
    ajouter({ role: 'utilisatrice', texte: valeur });
    texte = '';
    enCours = true;
    demarrerAttente();
    try {
      const reponse = await fetch('/api/suggestion-modele', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ reconnaissance: true, texte: valeur, tailleCm: tailleConnue, corpulence: tailleConnue !== undefined ? corpulence : undefined })
      });
      traiterReponse(await reponse.json().catch(() => ({ statut: 'indisponible' })));
    } catch {
      indisponible = true;
      ajouter({ role: 'assistant', texte: t(lang, 'assistant.bientot') });
    } finally {
      arreterAttente();
      enCours = false;
    }
  }

  /** Réencodage navigateur (canvas → JPEG) : les métadonnées d’origine ne partent pas ; le serveur revérifie tout. */
  async function reencoderPhoto(source: File): Promise<Blob> {
    try {
      const bitmap = await createImageBitmap(source);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const contexte = canvas.getContext('2d');
      if (!contexte) return source;
      contexte.drawImage(bitmap, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
      return blob ?? source;
    } catch {
      return source;
    }
  }

  async function envoyerPhoto() {
    if (!actif || enCours || !fichier) return;
    if (!consentement) {
      ajouter({ role: 'assistant', texte: t(lang, 'assistant.consentementRequis') });
      return;
    }
    if (fichier.size > TAILLE_MAX) {
      ajouter({ role: 'assistant', texte: t(lang, 'assistant.photoTropGrande') });
      return;
    }
    if (fichier.type && !['image/jpeg', 'image/png', 'image/webp'].includes(fichier.type)) {
      ajouter({ role: 'assistant', texte: t(lang, 'assistant.photoTypeRefuse') });
      return;
    }
    const nom = fichier.name;
    ajouter({ role: 'utilisatrice', texte: `📷 ${nom}` });
    enCours = true;
    demarrerAttente();
    try {
      const blob = await reencoderPhoto(fichier);
      const formulaire = new FormData();
      formulaire.set('photo', blob, blob.type === 'image/jpeg' ? 'photo.jpg' : nom);
      formulaire.set('consentement', 'on');
      if (tailleConnue !== undefined) {
        formulaire.set('tailleCm', String(tailleConnue));
        formulaire.set('corpulence', corpulence);
      }
      const reponse = await fetch('/api/suggestion-modele', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        body: formulaire
      });
      fichier = null;
      consentement = false;
      traiterReponse(await reponse.json().catch(() => ({ statut: 'indisponible' })));
    } catch {
      indisponible = true;
      ajouter({ role: 'assistant', texte: t(lang, 'assistant.bientot') });
    } finally {
      arreterAttente();
      enCours = false;
    }
  }

  function envoyer() {
    if (fichier) void envoyerPhoto();
    else void envoyerTexte();
  }

  async function estimer() {
    if (!enAttente || enCours) return;
    const taille = Number(tailleSaisie.replace(',', '.'));
    if (!Number.isFinite(taille) || taille < 100 || taille > 230) {
      ajouter({ role: 'assistant', texte: t(lang, 'assistant.questionTailleManquante') });
      return;
    }
    tailleConnue = taille;
    const { modele, options } = enAttente;
    enCours = true;
    demarrerAttente();
    try {
      const reponse = await fetch('/api/suggestion-modele', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ estimation: true, modele, tailleCm: taille, corpulence })
      });
      const donnees = await reponse.json().catch(() => ({ statut: 'indisponible' }));
      if (donnees.statut === 'ok' && donnees.estimations) {
        enAttente = null;
        ajouter({ role: 'assistant', texte: t(lang, 'assistant.merciTaille', { modele: t(lang, REGISTRE_MODELES[modele].titreCle) }) });
        ajouter({ role: 'resultat', modele, options, estimations: donnees.estimations, conseil: donnees.conseil });
      } else {
        traiterReponse(donnees);
      }
    } catch {
      indisponible = true;
      ajouter({ role: 'assistant', texte: t(lang, 'assistant.bientot') });
    } finally {
      arreterAttente();
      enCours = false;
    }
  }

  function choisirModele(modele: ModelePatron) {
    ajouter({ role: 'resultat', modele, options: {}, estimations: {} });
    if (tailleConnue === undefined) demanderTaille(modele, {});
  }

  function lignesOptions(bulle: Extract<Bulle, { role: 'resultat' }>): string[] {
    const entree = REGISTRE_MODELES[bulle.modele];
    const lignes: string[] = [];
    for (const def of entree.options) {
      const v = bulle.options?.[def.cle];
      if (v === undefined || v === '') continue;
      if (def.type === 'nombre' && typeof v === 'number') {
        lignes.push(`${t(lang, def.libelleCle)} : ${formatCm(lang, v)} ${t(lang, 'commun.cm')}`);
      } else if (def.type === 'choix') {
        const choix = (def.choix ?? []).find((c) => c.valeur === v);
        lignes.push(`${t(lang, def.libelleCle)} : ${choix ? t(lang, choix.libelleCle) : String(v)}`);
      } else {
        lignes.push(t(lang, def.libelleCle));
      }
    }
    return lignes;
  }

  function lignesEstimations(bulle: Extract<Bulle, { role: 'resultat' }>): string[] {
    const entree = REGISTRE_MODELES[bulle.modele];
    return entree.mesures
      .filter((m) => bulle.estimations[m.code] !== undefined)
      .map((m) => `${t(lang, m.libelleCle)} : ${formatCm(lang, bulle.estimations[m.code]!)} ${t(lang, 'commun.cm')}`);
  }

  function hrefFormulaire(bulle: Extract<Bulle, { role: 'resultat' }>): string {
    const entree = REGISTRE_MODELES[bulle.modele];
    const params = new URLSearchParams({ modele: bulle.modele });
    parametresOptionsModele(params, entree, bulle.options ?? {});
    const codes = Object.keys(bulle.estimations);
    for (const code of codes) params.set(code, String(bulle.estimations[code]));
    if (codes.length > 0) params.set('estimation_ia', '1');
    return clienteEffective ? `/clientes/${clienteEffective}/patron/nouveau?${params.toString()}` : `/patron/mesures?${params.toString()}`;
  }
</script>

<svelte:window onkeydown={surTouche} />

<button bind:this={boutonRef} type="button" class="fab" aria-label={t(lang, 'assistant.ouvrir')} aria-expanded={ouvert} title={t(lang, 'assistant.ouvrir')} onclick={basculer}>
  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12 1.5c.7 5.8 4.7 9.8 10.5 10.5C16.7 12.7 12.7 16.7 12 22.5 11.3 16.7 7.3 12.7 1.5 12 7.3 11.3 11.3 7.3 12 1.5Z" fill="#1E1E22" /></svg>
  <span class="fab-texte" aria-hidden="true">AI</span>
</button>

{#if ouvert}
  <div class="boite" role="dialog" aria-label={t(lang, 'assistant.ouvrir')}>
    <header>
      <span class="etoile" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 1.5c.7 5.8 4.7 9.8 10.5 10.5C16.7 12.7 12.7 16.7 12 22.5 11.3 16.7 7.3 12.7 1.5 12 7.3 11.3 11.3 7.3 12 1.5Z" fill="#1E1E22" /></svg>
      </span>
      <strong>{t(lang, 'assistant.titre')}</strong>
      <button type="button" class="fermer" aria-label={t(lang, 'assistant.fermer')} onclick={fermer}>✕</button>
    </header>

    {#if !clientePageId}
      <label class="cliente">
        {t(lang, 'assistant.pourQuelleCliente')}
        <select bind:value={clienteChoisie} disabled={enCours}>
          <option value="">{t(lang, 'assistant.patronRapide')}</option>
          {#each clientes as cliente}<option value={cliente.id}>{cliente.nom}</option>{/each}
        </select>
      </label>
    {/if}

    <div class="conversation" aria-live="polite">
      {#each bulles as bulle}
        {#if bulle.role === 'resultat'}
          {@const entree = REGISTRE_MODELES[bulle.modele]}
          {@const lignes = lignesOptions(bulle)}
          {@const estimations = lignesEstimations(bulle)}
          <div class="bulle resultat">
            <strong>{t(lang, 'assistant.reconnu', { modele: t(lang, entree.titreCle) })}</strong>
            {#if entree.options.length === 0}
              <p>{t(lang, 'assistant.aucuneOptionModele')}</p>
            {:else if lignes.length > 0}
              <p>{t(lang, 'assistant.optionsProposees')}</p>
              <ul>{#each lignes as ligne}<li>{ligne}</li>{/each}</ul>
            {/if}
            {#if estimations.length > 0}
              <p>{t(lang, 'assistant.estimationsTitre')}</p>
              <ul>{#each estimations as ligne}<li>{ligne} <span class="badge-estimation">{t(lang, 'assistant.estimationBadge')}</span></li>{/each}</ul>
              <p class="avertissement">{t(lang, 'assistant.estimationAvertissement')}</p>
            {/if}
            {#if bulle.conseil}<p>{t(lang, 'assistant.conseilPrefixe')}{bulle.conseil}</p>{/if}
            <p><a class="bouton-formulaire" href={hrefFormulaire(bulle)}>{t(lang, 'assistant.ouvrirFormulaire')}</a></p>
          </div>
        {:else if bulle.role === 'candidats'}
          <div class="bulle assistant">
            <p>{t(lang, 'assistant.candidats')}</p>
            <p class="choix-modeles">
              {#each bulle.candidats as candidat}
                <button type="button" onclick={() => choisirModele(candidat)}>{t(lang, REGISTRE_MODELES[candidat].titreCle)}</button>
              {/each}
            </p>
          </div>
        {:else if bulle.role === 'propositions'}
          <div class="bulle assistant">
            <p>{t(lang, 'assistant.proposeModeles')}</p>
            <p class="choix-modeles">
              {#each LISTE_MODELES as entree}
                <button type="button" onclick={() => choisirModele(entree.id)}>{t(lang, entree.titreCle)}</button>
              {/each}
            </p>
          </div>
        {:else}
          <p class="bulle {bulle.role}">{bulle.texte}</p>
        {/if}
      {/each}
      {#if enCours}
        <p class="bulle assistant attente" role="status">
          <span class="orbe" aria-hidden="true"><span></span><span></span><span></span></span>
          {t(lang, LIBELLES_ATTENTE[etapeAttente] ?? 'assistant.attente.reflexion')}…
        </p>
      {/if}
    </div>

    {#if enAttente && !enCours}
      <div class="panneau-taille">
        <label>{t(lang, 'assistant.tailleLibelle')}
          <input bind:value={tailleSaisie} inputmode="decimal" placeholder="165" />
        </label>
        <div class="corpulences" role="group" aria-label={t(lang, 'assistant.corpulenceLibelle')}>
          {#each CORPULENCES as c}
            <button type="button" class:actif={corpulence === c.valeur} aria-pressed={corpulence === c.valeur} onclick={() => (corpulence = c.valeur)}>{t(lang, c.cle)}</button>
          {/each}
        </div>
        <p class="actions-taille">
          <button type="button" class="estimer" onclick={estimer}>{t(lang, 'assistant.estimer')}</button>
          <button type="button" onclick={() => (enAttente = null)}>{t(lang, 'assistant.passer')}</button>
        </p>
      </div>
    {/if}

    {#if fichier}
      <div class="photo-prete">
        <span>{t(lang, 'assistant.photoPrete', { nom: fichier.name })}</span>
        <button type="button" onclick={() => (fichier = null)}>{t(lang, 'assistant.retirerPhoto')}</button>
        <label class="coche">
          <input type="checkbox" bind:checked={consentement} />
          <span>{t(lang, 'assistant.consentementPersonne')}</span>
        </label>
      </div>
    {/if}

    {#if !actif}
      <p class="bientot" role="status">{t(lang, 'assistant.bientotChat')}</p>
    {/if}

    <form
      class="saisie"
      onsubmit={(e) => {
        e.preventDefault();
        envoyer();
      }}
    >
      <div class="pilule">
        <label class="trombone" aria-label={t(lang, 'assistant.joindrePhoto')} title={t(lang, 'assistant.joindrePhoto')}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M21 12.5v-.5a7 7 0 0 0-14 0v7a5 5 0 0 0 10 0v-7a3 3 0 0 0-6 0v6.5a1.5 1.5 0 0 0 3 0V12h-2v6a3.5 3.5 0 0 1-7 0v-6a9 9 0 0 1 18 0v.5Z" fill="currentColor" transform="rotate(45 12 12)"/></svg>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="cache"
            disabled={!actif || enCours}
            onchange={(e) => (fichier = e.currentTarget.files?.[0] ?? null)}
          />
        </label>
        <input bind:this={saisieRef} bind:value={texte} maxlength="300" disabled={!actif || enCours} placeholder={t(lang, 'assistant.placeholderChat')} aria-label={t(lang, 'assistant.placeholderChat')} />
        <button type="button" class="audio" disabled aria-disabled="true" title={t(lang, 'assistant.badgeBientot')}>
          {t(lang, 'assistant.audio')} · {t(lang, 'assistant.badgeBientot')}
        </button>
        <button type="submit" class="envoyer" aria-label={t(lang, 'assistant.envoyerMessage')} disabled={!actif || enCours || (!fichier && texte.trim().length < 3)}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 20V5.8M5.5 12 12 5.5 18.5 12" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </div>
    </form>
  </div>
{/if}

<style>
  .fab { position: fixed; right: 16px; bottom: 88px; z-index: 60; width: 58px; height: 58px; border-radius: 50%; border: 0; background: #d8b4fe; color: #1e1e22; display: grid; place-items: center; cursor: pointer; box-shadow: 0 10px 28px rgba(30, 30, 34, 0.28); }
  .fab svg { position: absolute; top: 7px; right: 7px; width: 20px; height: 20px; }
  .fab-texte { font-weight: 800; font-size: 17px; letter-spacing: 0.04em; margin-top: 12px; }
  .fab:focus-visible, .boite button:focus-visible, .boite a:focus-visible, .boite input:focus-visible, .boite select:focus-visible { outline: 3px solid #7c5cfc; outline-offset: 2px; }
  @media (min-width: 1024px) { .fab { bottom: 24px; right: 24px; } }

  .boite { position: fixed; right: 16px; bottom: 156px; z-index: 60; width: min(360px, calc(100vw - 32px)); max-height: 70vh; display: flex; flex-direction: column; gap: 10px; background: #fff; border-radius: 20px; box-shadow: 0 18px 48px rgba(30, 30, 34, 0.3); padding: 14px; }
  @media (min-width: 1024px) { .boite { bottom: 92px; right: 24px; } }
  .boite header { display: flex; align-items: center; gap: 8px; }
  .boite header strong { font-size: 17px; flex: 1; }
  .etoile { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #d8b4fe; }
  .fermer { border: 0; background: #f1f1f5; border-radius: 50%; width: 36px; height: 36px; font: inherit; cursor: pointer; }
  .cliente { display: grid; gap: 6px; font-weight: 600; font-size: 14px; }
  .cliente select { min-height: 44px; font: inherit; border: 1.5px solid #d9d9e2; border-radius: 12px; padding: 0 10px; background: #fff; }

  .conversation { display: grid; gap: 8px; overflow-y: auto; padding-right: 2px; }
  .bulle { margin: 0; padding: 10px 14px; border-radius: 16px; line-height: 1.5; max-width: 94%; font-size: 15px; }
  .bulle.utilisatrice { justify-self: end; background: #7c5cfc; color: #fff; border-bottom-right-radius: 4px; }
  .bulle.assistant { justify-self: start; background: #f3f3f7; border-bottom-left-radius: 4px; }
  .bulle.resultat { justify-self: start; background: #f6f1ff; border-bottom-left-radius: 4px; }
  .bulle.resultat p { margin: 6px 0 0; }
  .bulle.resultat ul { margin: 4px 0 0; padding-left: 20px; }
  .bouton-formulaire { display: inline-block; padding: 10px 16px; border-radius: 999px; background: #1e1e22; color: #fff; text-decoration: none; font-weight: 700; }
  .badge-estimation { font-size: 11px; font-weight: 700; background: #d8b4fe; border-radius: 999px; padding: 2px 7px; white-space: nowrap; }
  .avertissement { font-weight: 700; }
  .choix-modeles { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 0; }
  .choix-modeles button { min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1.5px solid #c9c9d6; background: #fff; font: inherit; font-weight: 600; cursor: pointer; }

  .attente { display: flex; align-items: center; gap: 9px; }
  .orbe { display: inline-flex; gap: 4px; }
  .orbe span { width: 7px; height: 7px; border-radius: 50%; background: #7c5cfc; animation: rebond 0.9s infinite ease-in-out; }
  .orbe span:nth-child(2) { animation-delay: 0.15s; background: #b45fd8; }
  .orbe span:nth-child(3) { animation-delay: 0.3s; background: #e56ba8; }
  @keyframes rebond { 0%, 100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-5px); opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .orbe span { animation: none; opacity: 0.8; }
    .fab, .boite { transition: none; }
  }

  .panneau-taille { display: grid; gap: 8px; background: #f9f7ff; border: 1px solid #e4dcff; border-radius: 14px; padding: 10px; }
  .panneau-taille label { display: grid; gap: 5px; font-weight: 600; font-size: 14px; }
  .panneau-taille input { min-height: 42px; font: inherit; padding: 8px 12px; border: 1.5px solid #d9d9e2; border-radius: 12px; background: #fff; }
  .corpulences { display: flex; gap: 8px; flex-wrap: wrap; }
  .corpulences button, .actions-taille button { min-height: 40px; padding: 0 14px; border-radius: 999px; border: 1.5px solid #c9c9d6; background: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  .corpulences button.actif { background: #1e1e22; color: #fff; border-color: #1e1e22; }
  .actions-taille { display: flex; gap: 8px; flex-wrap: wrap; margin: 0; }
  .actions-taille .estimer { background: #7c5cfc; border-color: #7c5cfc; color: #fff; }

  .photo-prete { display: grid; gap: 7px; font-size: 14px; background: #f3f3f7; border-radius: 12px; padding: 9px 11px; }
  .photo-prete button { justify-self: start; border: 0; background: none; font: inherit; font-weight: 700; cursor: pointer; text-decoration: underline; }
  .coche { display: flex; gap: 9px; align-items: flex-start; line-height: 1.4; }
  .coche input { margin-top: 3px; width: auto; min-height: auto; }
  .bientot { margin: 0; padding: 9px 12px; border-radius: 12px; background: #f3f3f7; font-size: 14px; line-height: 1.45; }

  .saisie { margin: 0; }
  .pilule { display: flex; align-items: center; gap: 6px; border-radius: 999px; padding: 3px; background: linear-gradient(100deg, #6aa8ff, #7c5cfc 45%, #e56ba8); }
  .pilule > input { flex: 1; min-width: 0; border: 0; background: #fff; border-radius: 999px; min-height: 44px; padding: 0 6px; font: inherit; }
  .trombone { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: #fff; color: #5b5b66; cursor: pointer; flex: none; }
  .cache { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }
  .audio { border: 0; background: #fff; border-radius: 999px; min-height: 44px; padding: 0 10px; font: inherit; font-size: 12px; font-weight: 700; color: #8a8a96; cursor: not-allowed; flex: none; }
  .envoyer { flex: none; width: 44px; height: 44px; border-radius: 50%; border: 0; background: #7c5cfc; display: grid; place-items: center; cursor: pointer; }
  .envoyer[disabled] { opacity: 0.45; cursor: not-allowed; }
</style>
