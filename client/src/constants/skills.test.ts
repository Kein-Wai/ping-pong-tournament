import { describe, it, expect } from 'vitest';
import { PROFILE_SKILL_KEYS, SKILL_FIELDS } from './skills';

describe('SKILL_FIELDS', () => {
  it('define las doce habilidades en el orden en que se muestran', () => {
    expect(SKILL_FIELDS.map((skill) => skill.key)).toEqual([
      'derechaPlano',
      'revesPlano',
      'topspinDerecha',
      'topspinReves',
      'corte',
      'bloqueoDerecha',
      'bloqueoReves',
      'servicio',
      'recepcion',
      'movilidad',
      'fortalezaMental',
      'experiencia',
    ]);
  });

  it('asigna a cada clave su etiqueta en español', () => {
    expect(SKILL_FIELDS.map((skill) => skill.label)).toEqual([
      'Derecha Plano',
      'Revés Plano',
      'Topspin Derecha',
      'Topspin Revés',
      'Corte',
      'Bloqueo Derecha',
      'Bloqueo Revés',
      'Servicio',
      'Recepción',
      'Movilidad',
      'Fortaleza Mental',
      'Experiencia',
    ]);
  });

  it('no repite claves', () => {
    const keys = SKILL_FIELDS.map((skill) => skill.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('PROFILE_SKILL_KEYS', () => {
  it('tiene las mismas claves y el mismo orden que SKILL_FIELDS', () => {
    expect(PROFILE_SKILL_KEYS.map((skill) => skill.key)).toEqual(SKILL_FIELDS.map((skill) => skill.key));
  });

  it('usa las etiquetas abreviadas del perfil', () => {
    expect(PROFILE_SKILL_KEYS.map((skill) => skill.label)).toEqual([
      'Plano Derecha',
      'Plano Revés',
      'Top Derecha',
      'Top Revés',
      'Corte',
      'Bloqueo Der.',
      'Bloqueo Rev.',
      'Servicio',
      'Recepción',
      'Movilidad',
      'Fortaleza Mental',
      'Experiencia / Táctica',
    ]);
  });
});
