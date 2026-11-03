import { describe, expect, it } from 'vitest';
import { preparerPatronCote, MESURES_DEMONSTRATION } from './patron-cote';
import { analyserPantalonLarge } from '../patterns/pantalon-large/geometry';

describe('PatronCote — valeurs du moteur', () => {
  it('affiche les valeurs calculées pour le jeu de démonstration', () => {
    const d = preparerPatronCote(MESURES_DEMONSTRATION);
    const analyse = analyserPantalonLarge(MESURES_DEMONSTRATION);
    expect(d.valeurs.taille).toBe('82');
    expect(d.valeurs.hanches).toBe('100');
    expect(d.valeurs.fourche).toBe('27');
    expect(d.valeurs.longueur).toBe('105');
    expect(d.valeurs.ceinture).toBe(String(Math.round(analyse.longueurCeintureCm)));
    expect(d.valeurs.ceintureHauteur).toBe('4');
    expect(d.devant.basValeur).toBe(d.valeurs.basDevant);
    expect(d.ariaLabel).toContain('Taille 82 centimètres');
  });

  it('changer une mesure change la cote correspondante', () => {
    const avant = preparerPatronCote(MESURES_DEMONSTRATION);
    const apres = preparerPatronCote({ ...MESURES_DEMONSTRATION, tourTailleCm: 90 });
    expect(apres.valeurs.taille).toBe('90');
    expect(apres.valeurs.ceinture).not.toBe(avant.valeurs.ceinture);
    const plusLong = preparerPatronCote({ ...MESURES_DEMONSTRATION, longueurPantalonCm: 112 });
    expect(plusLong.valeurs.longueur).toBe('112');
    expect(plusLong.hauteurTotale).toBeGreaterThan(avant.hauteurTotale);
    expect(plusLong.devant.coupe).not.toBe(avant.devant.coupe);
  });
});
