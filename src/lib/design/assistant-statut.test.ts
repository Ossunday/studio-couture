import { describe, expect, it } from 'vitest';
import { resoudreMessageAssistant } from './assistant-statut';
import { t } from '$lib/i18n';

describe('resoudreMessageAssistant — chaque statut a SON message', () => {
  it('mappe explicitement chaque statut vers sa clé propre', () => {
    const attendu: Record<string, string> = {
      hors_catalogue: 'assistant.horsCatalogue',
      illisible: 'assistant.illisible',
      invalide: 'assistant.reponseInvalide',
      indisponible: 'assistant.bientot',
      echec: 'assistant.bientot',
      non_configuree: 'assistant.bientot',
      refuse: 'assistant.bientot',
      limite: 'assistant.limite',
      consentement_requis: 'assistant.consentementRequis',
      photo_trop_grande: 'assistant.photoTropGrande',
      photo_invalide: 'assistant.photoTypeRefuse',
      photo_illisible: 'assistant.photoIllisible'
    };
    for (const [statut, cle] of Object.entries(attendu)) {
      expect(resoudreMessageAssistant(statut)?.cleMessage, `statut ${statut}`).toBe(cle);
    }
  });

  it('ok ne produit pas de message texte (carte résultat à part)', () => {
    expect(resoudreMessageAssistant('ok')).toBeNull();
  });

  it('un invalide du flux photo garde le message photo illisible', () => {
    expect(resoudreMessageAssistant('invalide', 'assistant.photoIllisible')?.cleMessage).toBe('assistant.photoIllisible');
    expect(resoudreMessageAssistant('invalide', 'assistant.reponseInvalide')?.cleMessage).toBe('assistant.reponseInvalide');
    expect(resoudreMessageAssistant('invalide')?.cleMessage).toBe('assistant.reponseInvalide');
  });

  it('seuls indisponible / panne / non configuré / refusé rendent l’assistant indisponible', () => {
    for (const statut of ['indisponible', 'echec', 'non_configuree', 'refuse']) {
      expect(resoudreMessageAssistant(statut)?.rendIndisponible, statut).toBe(true);
    }
    for (const statut of ['hors_catalogue', 'illisible', 'invalide', 'limite', 'consentement_requis', 'photo_trop_grande', 'photo_invalide', 'photo_illisible']) {
      expect(resoudreMessageAssistant(statut)?.rendIndisponible, statut).toBe(false);
    }
  });

  it('aucun cas par défaut ne retombe sur « pas encore disponible » (horsCatalogue)', () => {
    const texteHorsCatalogue = t('fr', 'assistant.horsCatalogue');
    const casParDefaut: (string | undefined | null)[] = [undefined, null, '', 'inconnu', 'OK', 'hors-catalogue', 'autre'];
    for (const statut of casParDefaut) {
      const resolution = resoudreMessageAssistant(statut);
      expect(resolution?.cleMessage, `statut ${String(statut)}`).toBe('assistant.reponseInvalide');
      expect(resolution && t('fr', resolution.cleMessage)).not.toBe(texteHorsCatalogue);
    }
    // Le texte « pas encore disponible » n'est atteint que par le statut explicite.
    const tousStatuts = [
      'ok', 'hors_catalogue', 'illisible', 'invalide', 'indisponible', 'limite', 'consentement_requis',
      'photo_trop_grande', 'photo_invalide', 'photo_illisible', 'echec', 'non_configuree', 'refuse'
    ];
    for (const statut of tousStatuts) {
      const resolution = resoudreMessageAssistant(statut);
      const atteintHorsCatalogue = resolution?.cleMessage === 'assistant.horsCatalogue';
      expect(atteintHorsCatalogue, `statut ${statut}`).toBe(statut === 'hors_catalogue');
    }
  });

  it('les messages des statuts distincts sont bien distincts en français', () => {
    const statutsDistincts = ['hors_catalogue', 'illisible', 'invalide', 'indisponible', 'limite', 'consentement_requis', 'photo_trop_grande', 'photo_invalide', 'photo_illisible'];
    const textes = statutsDistincts.map((s) => t('fr', resoudreMessageAssistant(s)!.cleMessage));
    expect(new Set(textes).size).toBe(textes.length);
  });
});
