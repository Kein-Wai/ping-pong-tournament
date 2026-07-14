import { z } from 'zod'; // Asegúrate de importar Zod arriba del todo si no lo tienes
const scoreSchema = z.number().int().min(0, 'La puntuación no puede ser negativa').optional();

export const createMatchSchema = z
  .object({
    playerOneId: z.uuid('El ID del Jugador 1 debe ser un UUID válido'),
    playerTwoId: z.uuid('El ID del Jugador 2 debe ser un UUID válido'),
    dateStart: z.iso
      .datetime('Formato de fecha inválido. Usa ISO 8601 (ej. 2026-07-15T10:30:00Z)')
      .optional(),
    tournamentId: z.uuid().optional(),
    groupId: z.uuid().optional(),
    knockoutId: z.uuid().optional(),
    leagueId: z.uuid().optional(),

    setOnePlayerOne: scoreSchema,
    setOnePlayerTwo: scoreSchema,
    setTwoPlayerOne: scoreSchema,
    setTwoPlayerTwo: scoreSchema,
    setThreePlayerOne: scoreSchema,
    setThreePlayerTwo: scoreSchema,
    setFourPlayerOne: scoreSchema,
    setFourPlayerTwo: scoreSchema,
    setFivePlayerOne: scoreSchema,
    setFivePlayerTwo: scoreSchema,
    setSixPlayerOne: scoreSchema,
    setSixPlayerTwo: scoreSchema,
    setSevenPlayerOne: scoreSchema,
    setSevenPlayerTwo: scoreSchema,
  })
  .superRefine((data, ctx) => {
    // Creamos un mapa de los sets para iterarlos fácilmente y no repetir código
    const setsToValidate = [
      { p1: 'setOnePlayerOne', p2: 'setOnePlayerTwo', name: 'Set 1' },
      { p1: 'setTwoPlayerOne', p2: 'setTwoPlayerTwo', name: 'Set 2' },
      { p1: 'setThreePlayerOne', p2: 'setThreePlayerTwo', name: 'Set 3' },
      { p1: 'setFourPlayerOne', p2: 'setFourPlayerTwo', name: 'Set 4' },
      { p1: 'setFivePlayerOne', p2: 'setFivePlayerTwo', name: 'Set 5' },
      { p1: 'setSixPlayerOne', p2: 'setSixPlayerTwo', name: 'Set 6' },
      { p1: 'setSevenPlayerOne', p2: 'setSevenPlayerTwo', name: 'Set 7' },
    ] as const;

    for (const set of setsToValidate) {
      const score1 = data[set.p1];
      const score2 = data[set.p2];

      // REGLA 0: Si ambos son undefined o ambos son 0, el set no se ha jugado aún. Es válido.
      if ((score1 === undefined && score2 === undefined) || (score1 === 0 && score2 === 0)) {
        continue;
      }

      // REGLA 1: Si envían la puntuación de un jugador, DEBEN enviar la del otro.
      if (score1 === undefined || score2 === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `Falta la puntuación del rival en el ${set.name}.`,
          path: [score1 === undefined ? set.p1 : set.p2],
        });
        continue;
      }

      // Extraemos las matemáticas para comprobar las reglas del Ping Pong
      const maxScore = Math.max(score1, score2);
      const diff = Math.abs(score1 - score2);

      // REGLA 2: Alguien tiene que haber llegado al menos a 11 puntos
      if (maxScore < 11) {
        ctx.addIssue({
          code: 'custom',
          message: `En el ${set.name}, al menos un jugador debe llegar a 11 puntos.`,
          path: [set.p1],
        });
      }

      // REGLA 3: Diferencia mínima de 2 puntos para ganar
      if (diff < 2) {
        ctx.addIssue({
          code: 'custom',
          message: `En el ${set.name}, debe haber una diferencia mínima de 2 puntos (hay ${diff}).`,
          path: [set.p2],
        });
      }
    }
  });
