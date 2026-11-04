import { definitionMensuration } from '$lib/domain/mensurations-saisie';
import { MessageError, formatCm, t, type Lang, type TranslationKey } from '../i18n';
import type { FormulePatron } from './types';
import type { PieceBrouillon } from './brouillon';
import { genererPatronPantalonLarge, type OptionsPantalonLarge } from './pantalon-large/geometry';
import { FORMULES_PANTALON_LARGE } from './pantalon-large/formulas';
import { genererPatronJupeDroite } from './jupe-droite/geometry';
import { FORMULES_JUPE_DROITE } from './jupe-droite/formulas';
import { genererPatronRobeFourreau } from './robe-fourreau/geometry';
import { FORMULES_ROBE_FOURREAU } from './robe-fourreau/formulas';

/**
 * REGISTRE UNIQUE DES MODÈLES — source de vérité des écrans.
 * Chaque entrée déclare des CLÉS de traduction (jamais de texte) : la
 * traduction se fait à l’affichage via t(lang, …Cle).
 */
export type ModelePatron = 'pantalon_large' | 'jupe_droite' | 'robe_fourreau';

export type ValeurOption = number | string;
export type OptionsModele = Record<string, ValeurOption>;

export interface OptionModeleDef {
  /** Clé de stockage (ex. largeurBasPieceCm, encolure). */
  cle: string;
  /** Nom du champ de formulaire / paramètre d'URL (ex. largeur_bas_cm). */
  code: string;
  libelleCle: TranslationKey;
  type: 'nombre' | 'choix' | 'case';
  min?: number;
  max?: number;
  choix?: readonly { valeur: string; libelleCle: TranslationKey }[];
  defaut?: ValeurOption;
  placeholderCle?: TranslationKey;
  /** Indication non traduisible (ex. valeur numérique « 4 »), fallback si pas de placeholderCle. */
  placeholder?: string;
}

export interface MesureModeleDef {
  code: string;
  libelleCle: TranslationKey;
  /** Clé du libellé court des résumés. */
  courtCle: TranslationKey;
  minCm: number;
  maxCm: number;
}

export interface PresetModele {
  id: string;
  libelleCle: TranslationKey;
  valeurs: Record<string, number>;
}

export interface EntreeModele {
  id: ModelePatron;
  titreCle: TranslationKey;
  actionCle: TranslationKey;
  accrocheCle: TranslationKey;
  champs: readonly string[];
  mesures: readonly MesureModeleDef[];
  options: readonly OptionModeleDef[];
  aVue3d: boolean;
  assistantIa: boolean;
  presets: readonly PresetModele[];
  formules: readonly FormulePatron[];
  genererPieces: (mesures: Record<string, number>, options: OptionsModele) => PieceBrouillon[];
  lireOptions: (lire: (code: string) => string | null | undefined) => OptionsModele;
}

export class ModeleIndisponibleError extends MessageError {
  constructor(brut: unknown) {
    super('validation.modeleIndisponibleDetail', { valeur: String(brut ?? '') });
    this.name = 'ModeleIndisponibleError';
  }
}

/** Clés « longues » existantes pour les mesures longueur_* (sinon libelleCle de base). */
const LIBELLES_LONGS: Record<string, TranslationKey> = {
  longueur_pantalon_cm: 'mesure.longueur_pantalon_cm.long',
  longueur_jupe_cm: 'mesure.longueur_jupe_cm.long',
  longueur_dos_cm: 'mesure.longueur_dos_cm.long',
  longueur_robe_cm: 'mesure.longueur_robe_cm.long'
};

function mesuresDef(codes: readonly string[]): MesureModeleDef[] {
  return codes.map((code) => {
    const def = definitionMensuration(code);
    return {
      code,
      libelleCle: LIBELLES_LONGS[code] ?? def.libelleCle,
      courtCle: `mesure.court.${code}` as TranslationKey,
      minCm: def.minCm,
      maxCm: def.maxCm
    };
  });
}

type Lire = (code: string) => string | null | undefined;

/** Lecture générique et stricte des options d'un modèle (formulaire ou URL). */
export function lireOptionsDepuisDefs(defs: readonly OptionModeleDef[], lire: Lire): OptionsModele {
  const options: OptionsModele = {};
  for (const def of defs) {
    const brut = (lire(def.code) ?? '').toString().trim();
    if (def.type === 'nombre') {
      if (!brut) continue;
      const v = Number(brut.replace(',', '.'));
      if (!Number.isFinite(v) || (def.min !== undefined && v < def.min) || (def.max !== undefined && v > def.max)) {
        throw new MessageError('validation.optionNombre', { min: def.min!, max: def.max! }, def.libelleCle);
      }
      options[def.cle] = v;
    } else if (def.type === 'choix') {
      if (!brut) continue;
      if (!(def.choix ?? []).some((c) => c.valeur === brut)) {
        throw new MessageError('validation.optionChoix', {}, def.libelleCle);
      }
      options[def.cle] = brut;
    } else {
      if (brut === 'on' || brut === String(def.defaut ?? '')) options[def.cle] = def.defaut ?? 'oui';
    }
  }
  return options;
}

/** Écrit les options connues d'un patron dans des paramètres d'URL (aperçu/PDF). */
export function parametresOptionsModele(params: URLSearchParams, entree: EntreeModele, options: OptionsModele): void {
  for (const def of entree.options) {
    const v = options[def.cle];
    if (v !== undefined && v !== '') params.set(def.code, String(v));
  }
}

const OPTIONS_PANTALON: readonly OptionModeleDef[] = [
  { cle: 'largeurBasPieceCm', code: 'largeur_bas_cm', libelleCle: 'option.largeurBasPieceCm', type: 'nombre', min: 18, max: 40, placeholderCle: 'option.placeholderBas' },
  { cle: 'profondeurPliCm', code: 'profondeur_pli_cm', libelleCle: 'option.profondeurPliCm', type: 'nombre', min: 0, max: 8, placeholder: '4' },
  { cle: 'hauteurCeintureFinieCm', code: 'hauteur_ceinture_cm', libelleCle: 'option.hauteurCeintureFinieCm', type: 'nombre', min: 3, max: 6, placeholder: '4' }
];

function optionsPantalonNumeriques(options: OptionsModele): OptionsPantalonLarge {
  const num = (cle: string) => (typeof options[cle] === 'number' ? (options[cle] as number) : undefined);
  return {
    largeurBasPieceCm: num('largeurBasPieceCm'),
    profondeurPliCm: num('profondeurPliCm'),
    hauteurCeintureFinieCm: num('hauteurCeintureFinieCm')
  };
}

const OPTIONS_ROBE: readonly OptionModeleDef[] = [
  {
    cle: 'encolure',
    code: 'encolure',
    libelleCle: 'option.encolure',
    type: 'choix',
    defaut: 'ronde',
    choix: [
      { valeur: 'ronde', libelleCle: 'option.choix.ronde' },
      { valeur: 'fendue_v', libelleCle: 'option.choix.fendue_v' }
    ]
  },
  {
    cle: 'manches',
    code: 'manches',
    libelleCle: 'option.manches',
    type: 'choix',
    defaut: 'sans_manches',
    choix: [
      { valeur: 'sans_manches', libelleCle: 'option.choix.sans_manches' },
      { valeur: 'manche_courte', libelleCle: 'option.choix.manche_courte' }
    ]
  },
  { cle: 'fermetureDos', code: 'fermeture_dos', libelleCle: 'option.fermetureDos', type: 'case', defaut: 'glissiere' }
];

const PRESETS_PANTALON: readonly PresetModele[] = [
  { id: 'petite', libelleCle: 'preset.petite', valeurs: { tour_taille_cm: 64, tour_hanches_cm: 88, hauteur_fourche_cm: 24, longueur_pantalon_cm: 96 } },
  { id: 'moyenne', libelleCle: 'preset.moyenne', valeurs: { tour_taille_cm: 82, tour_hanches_cm: 100, hauteur_fourche_cm: 27, longueur_pantalon_cm: 105 } },
  { id: 'forte', libelleCle: 'preset.forte', valeurs: { tour_taille_cm: 110, tour_hanches_cm: 128, hauteur_fourche_cm: 31, longueur_pantalon_cm: 108 } }
];

export const REGISTRE_MODELES: Record<ModelePatron, EntreeModele> = {
  pantalon_large: {
    id: 'pantalon_large',
    titreCle: 'modele.pantalon_large.titre',
    actionCle: 'modele.pantalon_large.choix',
    accrocheCle: 'modele.pantalon_large.accroche',
    champs: ['tour_taille_cm', 'tour_hanches_cm', 'hauteur_fourche_cm', 'longueur_pantalon_cm'],
    mesures: mesuresDef(['tour_taille_cm', 'tour_hanches_cm', 'hauteur_fourche_cm', 'longueur_pantalon_cm']),
    options: OPTIONS_PANTALON,
    aVue3d: true,
    assistantIa: true,
    presets: PRESETS_PANTALON,
    formules: FORMULES_PANTALON_LARGE,
    genererPieces: (mesures, options) =>
      genererPatronPantalonLarge(
        {
          tourTailleCm: mesures['tour_taille_cm']!,
          tourHanchesCm: mesures['tour_hanches_cm']!,
          hauteurFourcheCm: mesures['hauteur_fourche_cm']!,
          longueurPantalonCm: mesures['longueur_pantalon_cm']!
        },
        optionsPantalonNumeriques(options)
      ),
    lireOptions: (lire) => lireOptionsDepuisDefs(OPTIONS_PANTALON, lire)
  },
  jupe_droite: {
    id: 'jupe_droite',
    titreCle: 'modele.jupe_droite.titre',
    actionCle: 'modele.jupe_droite.choix',
    accrocheCle: 'modele.jupe_droite.accroche',
    champs: ['tour_taille_cm', 'tour_hanches_cm', 'longueur_jupe_cm'],
    mesures: mesuresDef(['tour_taille_cm', 'tour_hanches_cm', 'longueur_jupe_cm']),
    options: [],
    aVue3d: false,
    assistantIa: false,
    presets: [
      { id: 'petite', libelleCle: 'preset.petite', valeurs: { tour_taille_cm: 64, tour_hanches_cm: 88, longueur_jupe_cm: 55 } },
      { id: 'moyenne', libelleCle: 'preset.moyenne', valeurs: { tour_taille_cm: 76, tour_hanches_cm: 100, longueur_jupe_cm: 60 } },
      { id: 'forte', libelleCle: 'preset.forte', valeurs: { tour_taille_cm: 96, tour_hanches_cm: 122, longueur_jupe_cm: 65 } }
    ],
    formules: FORMULES_JUPE_DROITE,
    genererPieces: (mesures) =>
      genererPatronJupeDroite({
        tourTailleCm: mesures['tour_taille_cm']!,
        tourHanchesCm: mesures['tour_hanches_cm']!,
        longueurJupeCm: mesures['longueur_jupe_cm']!
      }),
    lireOptions: () => ({})
  },
  robe_fourreau: {
    id: 'robe_fourreau',
    titreCle: 'modele.robe_fourreau.titre',
    actionCle: 'modele.robe_fourreau.choix',
    accrocheCle: 'modele.robe_fourreau.accroche',
    champs: ['tour_poitrine_cm', 'tour_taille_cm', 'tour_hanches_cm', 'longueur_dos_cm', 'longueur_robe_cm', 'largeur_epaules_cm'],
    mesures: mesuresDef(['tour_poitrine_cm', 'tour_taille_cm', 'tour_hanches_cm', 'longueur_dos_cm', 'longueur_robe_cm', 'largeur_epaules_cm']),
    options: OPTIONS_ROBE,
    aVue3d: false,
    assistantIa: false,
    presets: [
      { id: 'petite', libelleCle: 'preset.petite', valeurs: { tour_poitrine_cm: 80, tour_taille_cm: 64, tour_hanches_cm: 88, longueur_dos_cm: 38, longueur_robe_cm: 95, largeur_epaules_cm: 36 } },
      { id: 'moyenne', libelleCle: 'preset.moyenne', valeurs: { tour_poitrine_cm: 92, tour_taille_cm: 76, tour_hanches_cm: 100, longueur_dos_cm: 40, longueur_robe_cm: 100, largeur_epaules_cm: 38 } },
      { id: 'forte', libelleCle: 'preset.forte', valeurs: { tour_poitrine_cm: 116, tour_taille_cm: 96, tour_hanches_cm: 124, longueur_dos_cm: 43, longueur_robe_cm: 105, largeur_epaules_cm: 42 } }
    ],
    formules: FORMULES_ROBE_FOURREAU,
    genererPieces: (mesures, options) =>
      genererPatronRobeFourreau(
        {
          tourPoitrineCm: mesures['tour_poitrine_cm']!,
          tourTailleCm: mesures['tour_taille_cm']!,
          tourHanchesCm: mesures['tour_hanches_cm']!,
          longueurDosCm: mesures['longueur_dos_cm']!,
          longueurRobeCm: mesures['longueur_robe_cm']!,
          largeurEpaulesCm: mesures['largeur_epaules_cm']!
        },
        {
          encolure: typeof options['encolure'] === 'string' ? options['encolure'] : undefined,
          manches: typeof options['manches'] === 'string' ? options['manches'] : undefined,
          fermetureDos: typeof options['fermetureDos'] === 'string' ? options['fermetureDos'] : undefined
        }
      ),
    lireOptions: (lire) => lireOptionsDepuisDefs(OPTIONS_ROBE, lire)
  }
};

/**
 * Ordre d’affichage des modèles, défini ici une seule fois :
 * pantalon large, robe fourreau, jupe droite (sur deux colonnes, la robe
 * est à droite du pantalon et la jupe en dessous). Tous les écrans qui
 * listent les modèles (démo, choix à la création d’un patron, accueil)
 * itèrent cette liste.
 */
export const LISTE_MODELES: readonly EntreeModele[] = [REGISTRE_MODELES.pantalon_large, REGISTRE_MODELES.robe_fourreau, REGISTRE_MODELES.jupe_droite];

export function estModelePatron(valeur: string | null | undefined): valeur is ModelePatron {
  return valeur === 'pantalon_large' || valeur === 'jupe_droite' || valeur === 'robe_fourreau';
}

/** Entrée du registre ou erreur explicite — jamais de modèle de substitution. */
export function exigerEntreeModele(valeur: unknown): EntreeModele {
  if (typeof valeur === 'string' && estModelePatron(valeur)) return REGISTRE_MODELES[valeur];
  throw new ModeleIndisponibleError(valeur);
}

/** Garde d'exhaustivité : le compilateur exige de traiter chaque modèle. */
export function assertJamais(valeur: never, contexte = ''): never {
  throw new ModeleIndisponibleError(contexte ? `${contexte}:${String(valeur)}` : valeur);
}

/** Résumé des mesures d'un patron, lu dans le registre (clés courtes). */
export function resumeMesures(
  entree: EntreeModele,
  mesures: Record<string, number>
): { code: string; libelleCle: TranslationKey; courtCle: TranslationKey; valeur: number }[] {
  return entree.mesures
    .filter((m) => mesures[m.code] !== undefined)
    .map((m) => ({ code: m.code, libelleCle: m.libelleCle, courtCle: m.courtCle, valeur: mesures[m.code]! }));
}

export function texteResumeMesures(entree: EntreeModele, mesures: Record<string, number>, lang: Lang = 'fr'): string {
  return resumeMesures(entree, mesures)
    .map((m) => `${t(lang, m.courtCle)} ${formatCm(lang, m.valeur)}`)
    .join(' · ');
}
