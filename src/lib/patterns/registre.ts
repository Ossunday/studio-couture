import { definitionMensuration } from '$lib/domain/mensurations-saisie';
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
 *
 * Chaque modèle y déclare : identifiant, titre, mesures obligatoires (bornes
 * de `mensurations-saisie`), options (bornées ou à choix), générateur de
 * pièces, formules, présence d'une vue 3D, morphologies de référence et
 * libellés. Aucun écran ne doit connaître un modèle en particulier : il lit
 * cette table, et tout identifiant inconnu est une erreur explicite
 * (« Modèle indisponible »), jamais un repli silencieux sur un autre modèle.
 *
 * Les pièces générées portent leurs cotes comme DONNÉES (`PieceBrouillon.cotes` :
 * départ, arrivée, valeur, libellé) : la cotation générique les dessine sans
 * aucun libellé propre à un vêtement.
 */
export type ModelePatron = 'pantalon_large' | 'jupe_droite' | 'robe_fourreau';

export type ValeurOption = number | string;
export type OptionsModele = Record<string, ValeurOption>;

export interface OptionModeleDef {
  /** Clé de stockage (ex. largeurBasPieceCm, encolure). */
  cle: string;
  /** Nom du champ de formulaire / paramètre d'URL (ex. largeur_bas_cm). */
  code: string;
  libelle: string;
  type: 'nombre' | 'choix' | 'case';
  min?: number;
  max?: number;
  choix?: readonly { valeur: string; libelle: string }[];
  defaut?: ValeurOption;
  placeholder?: string;
}

export interface MesureModeleDef {
  code: string;
  libelle: string;
  /** Libellé court des résumés (« Taille 82 · Hanches 100 »). */
  court: string;
  minCm: number;
  maxCm: number;
}

export interface PresetModele {
  id: string;
  libelle: string;
  valeurs: Record<string, number>;
}

export interface EntreeModele {
  id: ModelePatron;
  titre: string;
  /** Libellé du bouton de choix (« Choisir le pantalon large »…). */
  actionChoix: string;
  /** Phrase courte des cartes de choix. */
  accroche: string;
  champs: readonly string[];
  mesures: readonly MesureModeleDef[];
  options: readonly OptionModeleDef[];
  aVue3d: boolean;
  /** Assistant IA de la phase 8 : seuls les modèles déclarés ici l'affichent. */
  assistantIa: boolean;
  presets: readonly PresetModele[];
  formules: readonly FormulePatron[];
  genererPieces: (mesures: Record<string, number>, options: OptionsModele) => PieceBrouillon[];
  lireOptions: (lire: (code: string) => string | null | undefined) => OptionsModele;
}

export class ModeleIndisponibleError extends Error {
  constructor(brut: unknown) {
    super(`Modèle indisponible : « ${String(brut ?? '')} ».`);
    this.name = 'ModeleIndisponibleError';
  }
}

function mesuresDef(codes: readonly string[], libelles: Record<string, string> = {}, courts: Record<string, string> = {}): MesureModeleDef[] {
  return codes.map((code) => {
    const def = definitionMensuration(code);
    return {
      code,
      libelle: libelles[code] ?? def.libelle.replace(' (cm)', ''),
      court: courts[code] ?? libelles[code] ?? def.libelle.replace(' (cm)', ''),
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
        throw new Error(`Vérifiez : ${def.libelle.toLowerCase()} — entrez un nombre entre ${def.min} et ${def.max} cm.`);
      }
      options[def.cle] = v;
    } else if (def.type === 'choix') {
      if (!brut) continue;
      if (!(def.choix ?? []).some((c) => c.valeur === brut)) {
        throw new Error(`Vérifiez : ${def.libelle.toLowerCase()} — choisissez une valeur proposée.`);
      }
      options[def.cle] = brut;
    } else {
      // case à cocher : présente et cochée seulement si le champ vaut « on » ou la valeur par défaut déclarée.
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
  { cle: 'largeurBasPieceCm', code: 'largeur_bas_cm', libelle: 'Largeur du bas par pièce', type: 'nombre', min: 18, max: 40, placeholder: 'calculée : jambe droite' },
  { cle: 'profondeurPliCm', code: 'profondeur_pli_cm', libelle: 'Profondeur du pli devant', type: 'nombre', min: 0, max: 8, placeholder: '4' },
  { cle: 'hauteurCeintureFinieCm', code: 'hauteur_ceinture_cm', libelle: 'Hauteur finie de la ceinture', type: 'nombre', min: 3, max: 6, placeholder: '4' }
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
    libelle: 'Encolure',
    type: 'choix',
    defaut: 'ronde',
    choix: [
      { valeur: 'ronde', libelle: 'Ronde' },
      { valeur: 'fendue_v', libelle: 'Ronde fendue en V' }
    ]
  },
  {
    cle: 'manches',
    code: 'manches',
    libelle: 'Manches',
    type: 'choix',
    defaut: 'sans_manches',
    choix: [
      { valeur: 'sans_manches', libelle: 'Sans manches' },
      { valeur: 'manche_courte', libelle: 'Petite manche courte' }
    ]
  },
  { cle: 'fermetureDos', code: 'fermeture_dos', libelle: 'Fermeture dos à glissière', type: 'case', defaut: 'glissiere' }
];

const PRESETS_PANTALON: readonly PresetModele[] = [
  { id: 'petite', libelle: 'Petite', valeurs: { tour_taille_cm: 64, tour_hanches_cm: 88, hauteur_fourche_cm: 24, longueur_pantalon_cm: 96 } },
  { id: 'moyenne', libelle: 'Moyenne', valeurs: { tour_taille_cm: 82, tour_hanches_cm: 100, hauteur_fourche_cm: 27, longueur_pantalon_cm: 105 } },
  { id: 'forte', libelle: 'Forte', valeurs: { tour_taille_cm: 110, tour_hanches_cm: 128, hauteur_fourche_cm: 31, longueur_pantalon_cm: 108 } }
];

export const REGISTRE_MODELES: Record<ModelePatron, EntreeModele> = {
  pantalon_large: {
    id: 'pantalon_large',
    titre: 'Pantalon large',
    actionChoix: 'Choisir le pantalon large',
    accroche: '4 mesures, salle d’essayage 3D',
    champs: ['tour_taille_cm', 'tour_hanches_cm', 'hauteur_fourche_cm', 'longueur_pantalon_cm'],
    mesures: mesuresDef(
      ['tour_taille_cm', 'tour_hanches_cm', 'hauteur_fourche_cm', 'longueur_pantalon_cm'],
      { longueur_pantalon_cm: 'Longueur du pantalon' },
      { tour_taille_cm: 'Taille', tour_hanches_cm: 'Hanches', hauteur_fourche_cm: 'Fourche', longueur_pantalon_cm: 'Long.' }
    ),
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
    titre: 'Jupe droite',
    actionChoix: 'Choisir la jupe droite',
    accroche: '3 mesures, patron à plat',
    champs: ['tour_taille_cm', 'tour_hanches_cm', 'longueur_jupe_cm'],
    mesures: mesuresDef(
      ['tour_taille_cm', 'tour_hanches_cm', 'longueur_jupe_cm'],
      { longueur_jupe_cm: 'Longueur de jupe' },
      { tour_taille_cm: 'Taille', tour_hanches_cm: 'Hanches', longueur_jupe_cm: 'Long.' }
    ),
    options: [],
    aVue3d: false,
    assistantIa: false,
    presets: [
      { id: 'petite', libelle: 'Petite', valeurs: { tour_taille_cm: 64, tour_hanches_cm: 88, longueur_jupe_cm: 55 } },
      { id: 'moyenne', libelle: 'Moyenne', valeurs: { tour_taille_cm: 76, tour_hanches_cm: 100, longueur_jupe_cm: 60 } },
      { id: 'forte', libelle: 'Forte', valeurs: { tour_taille_cm: 96, tour_hanches_cm: 122, longueur_jupe_cm: 65 } }
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
    titre: 'Robe fourreau',
    actionChoix: 'Choisir la robe fourreau',
    accroche: '6 mesures, patron à plat, devant et dos',
    champs: ['tour_poitrine_cm', 'tour_taille_cm', 'tour_hanches_cm', 'longueur_dos_cm', 'longueur_robe_cm', 'largeur_epaules_cm'],
    mesures: mesuresDef(
      ['tour_poitrine_cm', 'tour_taille_cm', 'tour_hanches_cm', 'longueur_dos_cm', 'longueur_robe_cm', 'largeur_epaules_cm'],
      { longueur_dos_cm: 'Longueur nuque-taille', longueur_robe_cm: 'Longueur de robe' },
      {
        tour_poitrine_cm: 'Poitrine',
        tour_taille_cm: 'Taille',
        tour_hanches_cm: 'Hanches',
        longueur_dos_cm: 'Nuque-taille',
        longueur_robe_cm: 'Long.',
        largeur_epaules_cm: 'Épaules'
      }
    ),
    options: OPTIONS_ROBE,
    aVue3d: false,
    assistantIa: false,
    presets: [
      { id: 'petite', libelle: 'Petite', valeurs: { tour_poitrine_cm: 80, tour_taille_cm: 64, tour_hanches_cm: 88, longueur_dos_cm: 38, longueur_robe_cm: 95, largeur_epaules_cm: 36 } },
      { id: 'moyenne', libelle: 'Moyenne', valeurs: { tour_poitrine_cm: 92, tour_taille_cm: 76, tour_hanches_cm: 100, longueur_dos_cm: 40, longueur_robe_cm: 100, largeur_epaules_cm: 38 } },
      { id: 'forte', libelle: 'Forte', valeurs: { tour_poitrine_cm: 116, tour_taille_cm: 96, tour_hanches_cm: 124, longueur_dos_cm: 43, longueur_robe_cm: 105, largeur_epaules_cm: 42 } }
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

export const LISTE_MODELES: readonly EntreeModele[] = [REGISTRE_MODELES.pantalon_large, REGISTRE_MODELES.jupe_droite, REGISTRE_MODELES.robe_fourreau];

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

/** Résumé des mesures d'un patron, lu dans le registre (libellés courts). */
export function resumeMesures(
  entree: EntreeModele,
  mesures: Record<string, number>
): { code: string; libelle: string; court: string; valeur: number }[] {
  return entree.mesures
    .filter((m) => mesures[m.code] !== undefined)
    .map((m) => ({ code: m.code, libelle: m.libelle, court: m.court, valeur: mesures[m.code]! }));
}

export function texteResumeMesures(entree: EntreeModele, mesures: Record<string, number>): string {
  return resumeMesures(entree, mesures)
    .map((m) => `${m.court} ${String(m.valeur).replace('.', ',')}`)
    .join(' · ');
}
