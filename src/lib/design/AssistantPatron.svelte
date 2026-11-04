<script lang="ts">
  import { formatCm, t, type Lang, type TranslationKey } from '$lib/i18n';
  import { REGISTRE_MODELES, parametresOptionsModele, type ModelePatron, type OptionsModele } from '$lib/patterns/registre';

  /**
   * Assistant IA de la page « Créer un patron pour <cliente> » (phase 11) :
   * petit chat texte + photo, au-dessus du choix manuel du modèle.
   *
   * Garanties affichées : la bulle de réponse est CONSTRUITE ICI, à partir du
   * seul JSON validé par le serveur (modèle du registre + options ramenées
   * dans leurs plages) — jamais le texte libre du modèle IA. « Utiliser ces
   * réglages » ouvre la salle d'essayage du modèle reconnu, options
   * préremplies et modifiables ; le patron reste calculé par le moteur avec
   * les mesures de la cliente. IA absente ou en panne : la carte annonce
   * « Assistant bientôt disponible » et le choix manuel, juste dessous,
   * reste seul maître. L’onglet Audio est visible mais désactivé.
   */
  let {
    lang = 'fr',
    clienteId,
    csrfToken,
    disponible = false
  }: {
    lang?: Lang;
    clienteId: string;
    csrfToken: string;
    disponible?: boolean;
  } = $props();

  type ModeEntree = 'texte' | 'photo' | 'audio';
  interface Bulle {
    role: 'utilisatrice' | 'assistant' | 'resultat';
    texte?: string;
    modele?: ModelePatron;
    options?: OptionsModele;
  }

  let mode = $state<ModeEntree>('texte');
  let texte = $state('');
  let fichier = $state<File | null>(null);
  let consentement = $state(false);
  let enCours = $state(false);
  let indisponible = $state(false);
  let bulles = $state<Bulle[]>([]);

  const actif = $derived(disponible && !indisponible);
  const TAILLE_MAX = 5 * 1024 * 1024;

  function ajouter(bulle: Bulle) {
    bulles = [...bulles, bulle];
  }

  function messageStatut(donnees: { cle?: string }): string {
    const cle = donnees.cle;
    if (cle && (cle.startsWith('assistant.') || cle.startsWith('ia.'))) return t(lang, cle as TranslationKey);
    return t(lang, 'assistant.reponseInvalide');
  }

  /** Traite une réponse serveur : seul le JSON validé devient une bulle résultat. */
  function traiterReponse(donnees: { statut?: string; cle?: string; modele?: string; options?: OptionsModele }) {
    if (donnees.statut === 'ok' && donnees.modele && donnees.modele in REGISTRE_MODELES) {
      ajouter({ role: 'resultat', modele: donnees.modele as ModelePatron, options: donnees.options ?? {} });
      return;
    }
    if (donnees.statut === 'hors_catalogue') {
      ajouter({ role: 'assistant', texte: t(lang, 'assistant.horsCatalogue') });
      return;
    }
    if (donnees.statut === 'illisible') {
      ajouter({ role: 'assistant', texte: t(lang, 'assistant.illisible') });
      return;
    }
    if (donnees.statut === 'indisponible' || donnees.statut === 'refuse' || donnees.statut === 'echec' || donnees.statut === 'non_configuree') {
      indisponible = true;
      ajouter({ role: 'assistant', texte: t(lang, 'assistant.bientot') });
      return;
    }
    ajouter({ role: 'assistant', texte: messageStatut(donnees) });
  }

  async function envoyerTexte() {
    const valeur = texte.trim();
    if (!actif || enCours || valeur.length < 3) return;
    ajouter({ role: 'utilisatrice', texte: valeur });
    enCours = true;
    try {
      const reponse = await fetch('/api/suggestion-modele', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ reconnaissance: true, texte: valeur })
      });
      traiterReponse(await reponse.json().catch(() => ({ statut: 'indisponible' })));
    } catch {
      indisponible = true;
      ajouter({ role: 'assistant', texte: t(lang, 'assistant.bientot') });
    } finally {
      enCours = false;
    }
  }

  /**
   * Réencodage navigateur de la photo (canvas → JPEG) : les métadonnées du
   * fichier d’origine (EXIF, GPS…) ne partent pas. Le serveur revérifie de
   * toute façon la signature, la taille et retire les métadonnées restantes.
   */
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
    ajouter({ role: 'utilisatrice', texte: `📷 ${fichier.name}` });
    enCours = true;
    try {
      const blob = await reencoderPhoto(fichier);
      const formulaire = new FormData();
      formulaire.set('photo', blob, blob.type === 'image/jpeg' ? 'photo.jpg' : fichier.name);
      formulaire.set('consentement', 'on');
      const reponse = await fetch('/api/suggestion-modele', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        body: formulaire
      });
      traiterReponse(await reponse.json().catch(() => ({ statut: 'indisponible' })));
    } catch {
      indisponible = true;
      ajouter({ role: 'assistant', texte: t(lang, 'assistant.bientot') });
    } finally {
      enCours = false;
    }
  }

  function lignesOptions(bulle: Bulle): string[] {
    if (!bulle.modele) return [];
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

  function hrefUtiliser(bulle: Bulle): string {
    const params = new URLSearchParams({ modele: bulle.modele ?? '' });
    if (bulle.modele) parametresOptionsModele(params, REGISTRE_MODELES[bulle.modele], bulle.options ?? {});
    return `/clientes/${clienteId}/patron/nouveau?${params.toString()}`;
  }
</script>

<section class="assistant" aria-label={t(lang, 'assistant.titre')}>
  <h2>{t(lang, 'assistant.titre')}</h2>
  <p class="aide">{t(lang, 'assistant.intro')}</p>

  {#if !actif}
    <p class="bientot" role="status">{t(lang, 'assistant.bientot')}</p>
    <p class="aide">{t(lang, 'assistant.conseilManuel')}</p>
  {/if}

  {#if bulles.length > 0}
    <div class="conversation" aria-live="polite">
      {#each bulles as bulle}
        {#if bulle.role === 'resultat' && bulle.modele}
          {@const entree = REGISTRE_MODELES[bulle.modele]}
          {@const lignes = lignesOptions(bulle)}
          <div class="bulle resultat">
            <strong>{t(lang, 'assistant.reconnu', { modele: t(lang, entree.titreCle) })}</strong>
            {#if entree.options.length === 0}
              <p>{t(lang, 'assistant.aucuneOptionModele')}</p>
            {:else if lignes.length > 0}
              <p>{t(lang, 'assistant.optionsProposees')}</p>
              <ul>
                {#each lignes as ligne}<li>{ligne}</li>{/each}
              </ul>
            {/if}
            <p><a class="bouton-utiliser" href={hrefUtiliser(bulle)}>{t(lang, 'assistant.utiliser')}</a></p>
          </div>
        {:else}
          <p class="bulle {bulle.role}">{bulle.texte}</p>
        {/if}
      {/each}
      {#if enCours}<p class="bulle assistant">{t(lang, 'assistant.enCours')}</p>{/if}
    </div>
  {/if}

  <div class="entrees" role="group" aria-label={t(lang, 'assistant.titre')}>
    <button type="button" class:actif={mode === 'texte'} aria-pressed={mode === 'texte'} onclick={() => (mode = 'texte')}>{t(lang, 'assistant.decrire')}</button>
    <button type="button" class:actif={mode === 'photo'} aria-pressed={mode === 'photo'} onclick={() => (mode = 'photo')}>{t(lang, 'assistant.photo')}</button>
    <button type="button" disabled aria-disabled="true" title={t(lang, 'assistant.badgeBientot')}>
      {t(lang, 'assistant.audio')} <span class="badge">{t(lang, 'assistant.badgeBientot')}</span>
    </button>
  </div>

  {#if mode === 'texte'}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        void envoyerTexte();
      }}
    >
      <label>{t(lang, 'assistant.texteLibelle')}
        <textarea bind:value={texte} rows="3" maxlength="300" disabled={!actif} placeholder={t(lang, 'assistant.placeholderTexte')}></textarea>
      </label>
      <p class="actions">
        <button type="submit" disabled={!actif || enCours || texte.trim().length < 3}>{enCours ? t(lang, 'assistant.enCours') : t(lang, 'assistant.envoyer')}</button>
      </p>
    </form>
  {:else if mode === 'photo'}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        void envoyerPhoto();
      }}
    >
      <label>{t(lang, 'assistant.choisirPhoto')}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={!actif}
          onchange={(e) => (fichier = e.currentTarget.files?.[0] ?? null)}
        />
      </label>
      <p class="aide">{t(lang, 'assistant.photoAide')}</p>
      <label class="coche">
        <input type="checkbox" bind:checked={consentement} disabled={!actif} />
        <span>{t(lang, 'assistant.consentement')}</span>
      </label>
      <p class="actions">
        <button type="submit" disabled={!actif || enCours || !fichier}>{enCours ? t(lang, 'assistant.enCours') : t(lang, 'assistant.analyserPhoto')}</button>
      </p>
    </form>
  {/if}
</section>

<style>
  .assistant { border: 1px solid var(--bord); border-radius: var(--rayon-carte); padding: 20px 16px; background: var(--carte); box-shadow: var(--ombre-petite); margin: 18px 0; display: grid; gap: 10px; }
  .assistant h2 { margin: 0; font-size: 20px; }
  .aide { margin: 0; font-size: 14px; color: var(--encre-douce); line-height: 1.5; }
  .bientot { margin: 0; padding: 10px 12px; border-radius: 12px; background: var(--fond); font-weight: 700; }
  .conversation { display: grid; gap: 8px; }
  .bulle { margin: 0; padding: 10px 14px; border-radius: 16px; line-height: 1.5; max-width: 92%; }
  .bulle.utilisatrice { justify-self: end; background: var(--encre); color: #fff; border-bottom-right-radius: 4px; }
  .bulle.assistant { justify-self: start; background: var(--fond); border-bottom-left-radius: 4px; }
  .bulle.resultat { justify-self: start; background: var(--lavande-pastille, var(--fond)); border-bottom-left-radius: 4px; }
  .bulle.resultat p { margin: 6px 0 0; }
  .bulle.resultat ul { margin: 4px 0 0; padding-left: 20px; }
  .bouton-utiliser { display: inline-block; padding: 10px 16px; border-radius: 999px; background: var(--encre); color: #fff; text-decoration: none; font-weight: 700; }
  .entrees { display: flex; gap: 8px; flex-wrap: wrap; }
  .entrees button { min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1.5px solid var(--bord-fort); background: var(--carte); color: var(--encre); font: inherit; cursor: pointer; }
  .entrees button.actif { background: var(--encre); border-color: var(--encre); color: #fff; }
  .entrees button[disabled] { opacity: 0.55; cursor: not-allowed; }
  .badge { font-size: 12px; font-weight: 700; }
  form { display: grid; gap: 10px; }
  label { display: grid; gap: 6px; font-weight: 600; }
  textarea { font: inherit; font-weight: 400; padding: 10px 12px; border: 1.5px solid var(--bord-fort); border-radius: 14px; width: 100%; background: #fff; color: var(--encre); resize: vertical; }
  .coche { display: flex; gap: 10px; align-items: flex-start; font-weight: 600; line-height: 1.45; }
  .coche input { min-height: auto; width: auto; margin-top: 4px; }
  .actions { margin: 0; }
  .actions button { min-height: 44px; padding: 0 18px; border-radius: 999px; border: 0; background: var(--encre); color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
  .actions button[disabled] { opacity: 0.5; cursor: not-allowed; }
</style>
