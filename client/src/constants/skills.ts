/** Habilidades técnicas del jugador: clave del modelo y etiqueta en pantalla, en el orden en que se muestran. */
export const SKILL_FIELDS = [
  { key: 'derechaPlano', label: 'Derecha Plano' },
  { key: 'revesPlano', label: 'Revés Plano' },
  { key: 'topspinDerecha', label: 'Topspin Derecha' },
  { key: 'topspinReves', label: 'Topspin Revés' },
  { key: 'corte', label: 'Corte' },
  { key: 'bloqueoDerecha', label: 'Bloqueo Derecha' },
  { key: 'bloqueoReves', label: 'Bloqueo Revés' },
  { key: 'servicio', label: 'Servicio' },
  { key: 'recepcion', label: 'Recepción' },
  { key: 'movilidad', label: 'Movilidad' },
  { key: 'fortalezaMental', label: 'Fortaleza Mental' },
  { key: 'experiencia', label: 'Experiencia' },
] as const;

/**
 * Habilidades con las etiquetas que usan los modales de edición y consolidación del
 * perfil de jugador (JugadorPerfil): mismo orden y claves que SKILL_FIELDS, pero con
 * etiquetas abreviadas distintas.
 */
export const PROFILE_SKILL_KEYS = [
  { key: 'derechaPlano', label: 'Plano Derecha' },
  { key: 'revesPlano', label: 'Plano Revés' },
  { key: 'topspinDerecha', label: 'Top Derecha' },
  { key: 'topspinReves', label: 'Top Revés' },
  { key: 'corte', label: 'Corte' },
  { key: 'bloqueoDerecha', label: 'Bloqueo Der.' },
  { key: 'bloqueoReves', label: 'Bloqueo Rev.' },
  { key: 'servicio', label: 'Servicio' },
  { key: 'recepcion', label: 'Recepción' },
  { key: 'movilidad', label: 'Movilidad' },
  { key: 'fortalezaMental', label: 'Fortaleza Mental' },
  { key: 'experiencia', label: 'Experiencia / Táctica' },
] as const;
