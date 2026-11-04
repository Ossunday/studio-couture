#!/usr/bin/env node
/**
 * Diagnostic de l'assistant IA (phase 11) — à lancer par le propriétaire,
 * depuis la racine du projet, avec l'environnement réel :
 *
 *   node --env-file="$HOME\studio-couture.env" scripts/diagnostic-assistant.mjs "un pantalon très ample"
 *   node --env-file="$HOME\studio-couture.env" scripts/diagnostic-assistant.mjs --photo chemin\image.jpg
 *
 * But : voir enfin la réponse BRUTE du modèle quand l'interface affiche
 * « Ce vêtement n'est pas encore disponible » (statut hors_catalogue).
 *
 * Il charge le VRAI code serveur (`construireSystemeReconnaissance`,
 * `creerClientAnthropique`, `extraireTexteReponse`, `validerReconnaissance`,
 * `reconnaitreModele`, `lireConfigIa`, et `validerPhoto` / `versBase64` pour
 * l'option --photo) via le chargeur SSR de Vite — déjà installé dans le
 * projet, aucune dépendance ajoutée (ni vite-node ni tsx ne sont présents).
 * L'appel réseau passe par un fetch d'observation qui capture la requête et
 * la réponse brutes SANS les modifier, puis laisse le vrai client extraire
 * le texte et le vrai `reconnaitreModele` conclure.
 *
 * Sécurité d'affichage : la clé n'est jamais affichée, l'URL complète non
 * plus (seul l'hôte de l'endpoint), et aucune donnée base64 (la photo est
 * résumée à son type et à la longueur de l'encodage).
 */
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

// ---------------------------------------------------------------- arguments
const args = process.argv.slice(2);
let cheminPhoto = null;
const morceauxTexte = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--photo') {
    cheminPhoto = args[i + 1] ?? null;
    i += 1;
  } else {
    morceauxTexte.push(args[i]);
  }
}
const texteDemande = morceauxTexte.join(' ').trim();

if (!cheminPhoto && texteDemande.length < 3) {
  console.error('Usage :');
  console.error('  node --env-file="$HOME\\studio-couture.env" scripts/diagnostic-assistant.mjs "un pantalon très ample"');
  console.error('  node --env-file="$HOME\\studio-couture.env" scripts/diagnostic-assistant.mjs --photo chemin\\image.jpg');
  process.exit(2);
}

// ------------------------------------------------- chargement du vrai code
// Le chargeur SSR de Vite se place à la racine du projet (dossier courant
// au lancement, comme la commande documentée ci-dessus).
let serveur;
let ia;
let photoModule;
try {
  const { createServer } = await import('vite');
  serveur = await createServer({ logLevel: 'silent', appType: 'custom', server: { middlewareMode: true } });
  ia = await serveur.ssrLoadModule('/src/lib/server/ia/suggestion-modele.ts');
  photoModule = await serveur.ssrLoadModule('/src/lib/server/ia/photo.ts');
} catch (e) {
  console.error(`Chargement du code du projet impossible : ${e instanceof Error ? e.message : String(e)}`);
  process.exit(2);
}

try {
  await diagnostiquer();
} finally {
  await serveur.close().catch(() => {});
}

async function diagnostiquer() {
  const { construireSystemeReconnaissance, creerClientAnthropique, extraireTexteReponse, lireConfigIa, reconnaitreModele, validerReconnaissance } = ia;
  const { PhotoInvalideError, validerPhoto, versBase64 } = photoModule;

  // ------------------------------------------------------------ capture
  // Le fetch d'observation délègue au vrai fetch, mémorise la requête
  // (prompt système, message utilisateur expurgé de tout base64) et le
  // corps JSON de la réponse, puis rend au vrai client une réponse dont
  // `json()` rejoue ce corps : le code réel travaille sur les vraies données.
  const capture = { systeme: null, utilisateur: null, statutHttp: null, corps: null };
  const fetchCapture = async (url, init = {}) => {
    try {
      const corpsRequete = JSON.parse(init.body ?? '{}');
      capture.systeme = typeof corpsRequete.system === 'string' ? corpsRequete.system : null;
      const contenu = corpsRequete.messages?.[0]?.content;
      if (typeof contenu === 'string') {
        capture.utilisateur = contenu;
      } else if (Array.isArray(contenu)) {
        capture.utilisateur = contenu
          .map((bloc) => {
            if (bloc?.type === 'text') return `[bloc text] ${bloc.text}`;
            if (bloc?.type === 'image') {
              const longueur = typeof bloc.source?.data === 'string' ? bloc.source.data.length : 0;
              return `[bloc image] media_type=${bloc.source?.media_type ?? '?'} — base64 masqué (${longueur} caractères)`;
            }
            return `[bloc ${bloc?.type ?? '?'}]`;
          })
          .join('\n');
      }
    } catch {
      // Requête illisible : on laisse le vrai appel se faire quand même.
    }
    const reponse = await fetch(url, init);
    capture.statutHttp = reponse.status;
    if (!reponse.ok) return reponse; // le vrai client lèvera « Assistant indisponible. »
    const corps = await reponse.json().catch(() => null);
    capture.corps = corps;
    return { ok: true, status: reponse.status, json: async () => corps };
  };

  // --------------------------------------------------------- configuration
  console.log('=== Configuration (présence seulement — clé et URL complète jamais affichées) ===');
  for (const nom of ['STUDIO_COUTURE_IA_API_KEY', 'STUDIO_COUTURE_IA_BASE_URL', 'STUDIO_COUTURE_IA_MODELE']) {
    console.log(`${nom} : ${(process.env[nom] ?? '').trim() ? 'présente' : 'ABSENTE'}`);
  }
  const config = lireConfigIa(process.env);
  if (!config) {
    console.log('Configuration incomplète ou invalide : reconnaitreModele répondrait « non_configuree ». Arrêt avant tout appel.');
    console.log('');
    console.log('=== (a) Prompt système qui SERAIT envoyé (construireSystemeReconnaissance) ===');
    console.log(construireSystemeReconnaissance());
    process.exitCode = 2;
    return;
  }
  let hote = '(hôte illisible)';
  try {
    hote = new URL(config.baseUrl).host;
  } catch {
    /* déjà validé par lireConfigIa */
  }
  console.log(`Endpoint : hôte ${hote} (chemin /v1/messages ajouté par le vrai client)`);
  console.log(`Modèle configuré : ${config.modele}`);

  // -------------------------------------------------------------- entrée
  let entree;
  if (cheminPhoto) {
    let octets;
    try {
      octets = new Uint8Array(await readFile(cheminPhoto));
    } catch {
      console.error(`Photo introuvable ou illisible : ${basename(cheminPhoto)}`);
      process.exitCode = 2;
      return;
    }
    let photo;
    try {
      photo = validerPhoto(octets);
    } catch (e) {
      if (e instanceof PhotoInvalideError) {
        console.error(`Photo refusée par validerPhoto : ${e.raison} (fichier ${basename(cheminPhoto)}, ${octets.length} octets)`);
      } else {
        console.error(`Erreur de validation de la photo : ${e instanceof Error ? e.message : String(e)}`);
      }
      process.exitCode = 2;
      return;
    }
    const donneesBase64 = versBase64(photo.donnees);
    console.log('');
    console.log('=== Entrée photo (validerPhoto + versBase64 du vrai code) ===');
    console.log(`Fichier : ${basename(cheminPhoto)} — type détecté ${photo.mediaType}, ${photo.donnees.length} octets après retrait des métadonnées`);
    console.log(`Base64 : masqué (${donneesBase64.length} caractères, jamais affiché)`);
    entree = { type: 'photo', image: { mediaType: photo.mediaType, donneesBase64 } };
  } else {
    console.log('');
    console.log('=== Entrée texte ===');
    console.log(texteDemande);
    entree = { type: 'texte', texte: texteDemande };
  }

  // --------------------------------------------------------- vrai appel
  const client = creerClientAnthropique(config, fetchCapture);
  const resultat = await reconnaitreModele(entree, { client });

  console.log('');
  console.log('=== (a) Prompt système envoyé (capturé dans la requête réelle) ===');
  console.log(capture.systeme ?? construireSystemeReconnaissance());
  console.log('');
  console.log('=== Message utilisateur envoyé (base64 masqué) ===');
  console.log(capture.utilisateur ?? '(non capturé)');
  console.log('');
  console.log(`=== Réponse HTTP : statut ${capture.statutHttp ?? '(aucun appel abouti)'} ===`);

  console.log('');
  console.log('=== (b) Types de blocs reçus (dans l’ordre) ===');
  const contenu = capture.corps?.content;
  if (Array.isArray(contenu)) {
    console.log(contenu.map((bloc) => (bloc && typeof bloc === 'object' && typeof bloc.type === 'string' ? bloc.type : '?')).join(', ') || '(aucun bloc)');
    if (typeof capture.corps?.stop_reason === 'string') console.log(`stop_reason : ${capture.corps.stop_reason}`);
  } else {
    console.log('(aucun corps JSON exploitable — échec HTTP, délai dépassé ou réponse non-JSON)');
  }

  console.log('');
  console.log('=== (c) Texte BRUT exact du/des bloc(s) text (sans retouche) ===');
  const blocsTexte = Array.isArray(contenu) ? contenu.filter((bloc) => bloc && typeof bloc === 'object' && bloc.type === 'text' && typeof bloc.text === 'string') : [];
  if (blocsTexte.length === 0) {
    console.log('(aucun bloc text)');
  } else {
    blocsTexte.forEach((bloc, i) => {
      console.log(`--- début bloc text #${i + 1} ---`);
      console.log(bloc.text);
      console.log(`--- fin bloc text #${i + 1} ---`);
    });
  }

  console.log('');
  console.log('=== (d) validerReconnaissance appliqué à ce texte brut ===');
  // « vetement_vu » : description préalable demandée au modèle (phase 12),
  // jamais affichée dans l’application — ici seulement pour diagnostiquer
  // un hors_catalogue photo : que voyait le modèle avant de décider ?
  try {
    const brutParse = JSON.parse(extraireTexteReponse(capture.corps));
    if (brutParse && typeof brutParse.vetement_vu === 'string') {
      console.log(`vetement_vu (vu par le modèle, tronqué à 300 caractères) : ${brutParse.vetement_vu.slice(0, 300)}`);
    } else {
      console.log('vetement_vu : (absent de la réponse)');
    }
    if (Array.isArray(brutParse?.candidats)) console.log(`candidats : ${brutParse.candidats.join(', ')}`);
  } catch {
    console.log('vetement_vu : (réponse non-JSON, rien à extraire)');
  }
  try {
    const texteExtrait = extraireTexteReponse(capture.corps);
    try {
      console.log(JSON.stringify(validerReconnaissance(texteExtrait), null, 2));
    } catch (e) {
      console.log(`ERREUR de validation : ${e instanceof Error ? `${e.name} — ${e.message}` : String(e)}`);
      console.log('(reconnaitreModele traduit cette erreur en statut « invalide »)');
    }
  } catch (e) {
    console.log(`ERREUR d’extraction du texte : ${e instanceof Error ? `${e.name} — ${e.message}` : String(e)}`);
    console.log('(reconnaitreModele traduit cette erreur en statut « echec »)');
  }

  console.log('');
  console.log('=== (e) Statut final de reconnaitreModele (le vrai code, même appel) ===');
  console.log(JSON.stringify(resultat, null, 2));
  console.log('');
  console.log('Lecture : si (c) contient un JSON de modèle du catalogue mais que (e) vaut');
  console.log('hors_catalogue, le problème est dans notre chaîne ; si (c) contient déjà');
  console.log('{"modele":"hors_catalogue"}, c’est le modèle (ou son prompt) qui le décide.');
}
