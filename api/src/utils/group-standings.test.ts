import { describe, it, expect } from 'vitest';
import { computeGroupStandings, GroupClassification } from './group-standings';
import { ScoredMatch } from './match';

const classification = (id: string, playerId: string): GroupClassification => ({
  id,
  playerId,
});

const buildMatch = (
  playerOneId: string,
  playerTwoId: string,
  sets: Array<[number, number]>,
): ScoredMatch => ({
  playerOneId,
  playerTwoId,
  setOnePlayerOne: sets[0]?.[0] ?? null,
  setOnePlayerTwo: sets[0]?.[1] ?? null,
  setTwoPlayerOne: sets[1]?.[0] ?? null,
  setTwoPlayerTwo: sets[1]?.[1] ?? null,
  setThreePlayerOne: sets[2]?.[0] ?? null,
  setThreePlayerTwo: sets[2]?.[1] ?? null,
  setFourPlayerOne: sets[3]?.[0] ?? null,
  setFourPlayerTwo: sets[3]?.[1] ?? null,
  setFivePlayerOne: sets[4]?.[0] ?? null,
  setFivePlayerTwo: sets[4]?.[1] ?? null,
  setSixPlayerOne: sets[5]?.[0] ?? null,
  setSixPlayerTwo: sets[5]?.[1] ?? null,
  setSevenPlayerOne: sets[6]?.[0] ?? null,
  setSevenPlayerTwo: sets[6]?.[1] ?? null,
});

const standingOf = (standings: ReturnType<typeof computeGroupStandings>, playerId: string) => {
  const standing = standings.find((row) => row.playerId === playerId);
  if (!standing) throw new Error(`No hay clasificacion para ${playerId}`);

  return standing;
};

describe('Tabla de clasificacion de grupo (api/src/utils/group-standings.ts)', () => {
  it('devuelve una fila por clasificacion, con posiciones correlativas', () => {
    const standings = computeGroupStandings(
      [classification('c1', 'p1'), classification('c2', 'p2'), classification('c3', 'p3')],
      [],
    );

    expect(standings).toHaveLength(3);
    expect(standings.map((row) => row.position)).toEqual([1, 2, 3]);
    expect(standings.map((row) => row.playerId)).toEqual(['p1', 'p2', 'p3']);
  });

  it('deja todas las metricas a cero cuando el grupo no ha jugado', () => {
    const standings = computeGroupStandings(
      [classification('c1', 'p1'), classification('c2', 'p2')],
      [],
    );

    expect(standingOf(standings, 'p1')).toMatchObject({
      played: 0,
      gamesWon: 0,
      gamesLost: 0,
      setsWon: 0,
      setsLost: 0,
      pointsWon: 0,
      pointsLost: 0,
      pointsClas: 0,
    });
  });

  it('acumula los sets y los puntos de cada partido', () => {
    const standings = computeGroupStandings(
      [classification('c1', 'p1'), classification('c2', 'p2')],
      [buildMatch('p1', 'p2', [[11, 5], [11, 7]])],
    );

    expect(standingOf(standings, 'p1')).toMatchObject({
      played: 1,
      setsWon: 2,
      setsLost: 0,
      pointsWon: 22,
      pointsLost: 12,
    });
    expect(standingOf(standings, 'p2')).toMatchObject({
      played: 1,
      setsWon: 0,
      setsLost: 2,
      pointsWon: 12,
      pointsLost: 22,
    });
  });

  it('acumula varios partidos del mismo jugador', () => {
    const standings = computeGroupStandings(
      [classification('c1', 'p1'), classification('c2', 'p2')],
      [
        buildMatch('p1', 'p2', [[11, 5], [11, 7]]),
        buildMatch('p1', 'p2', [[11, 9], [11, 8]]),
      ],
    );

    expect(standingOf(standings, 'p1')).toMatchObject({
      played: 2,
      setsWon: 4,
      setsLost: 0,
      pointsWon: 44,
      pointsLost: 29,
    });
  });

  it('otorga 2 puntos de clasificacion al ganador y 1 al perdedor', () => {
    const standings = computeGroupStandings(
      [classification('c1', 'p1'), classification('c2', 'p2')],
      [buildMatch('p1', 'p2', [[11, 5], [11, 7]])],
    );

    expect(standingOf(standings, 'p1')).toMatchObject({
      gamesWon: 1,
      gamesLost: 0,
      pointsClas: 2,
    });
    expect(standingOf(standings, 'p2')).toMatchObject({
      gamesWon: 0,
      gamesLost: 1,
      pointsClas: 1,
    });
  });

  it('no otorga puntos de clasificacion cuando el partido acaba en empate a sets', () => {
    const standings = computeGroupStandings(
      [classification('c1', 'p1'), classification('c2', 'p2')],
      [buildMatch('p1', 'p2', [[11, 5], [7, 11]])],
    );

    expect(standingOf(standings, 'p1')).toMatchObject({
      gamesWon: 0,
      gamesLost: 0,
      pointsClas: 0,
    });
    expect(standingOf(standings, 'p2')).toMatchObject({
      gamesWon: 0,
      gamesLost: 0,
      pointsClas: 0,
    });
  });

  it('desempata por puntos de clasificacion antes que por diferencia de sets', () => {
    // p1 gana 2 y pierde 2 (6 puntos de clasificacion, diferencia de sets 0).
    // p2 gana 2 (4 puntos de clasificacion, diferencia de sets +4).
    // Si se aplicara el desempate por sets, p2 seria el primero.
    const standings = computeGroupStandings(
      [
        classification('c1', 'p1'),
        classification('c2', 'p2'),
        classification('c3', 'p3'),
        classification('c4', 'p4'),
        classification('c5', 'p5'),
      ],
      [
        buildMatch('p1', 'p3', [[11, 5], [11, 7]]),
        buildMatch('p4', 'p1', [[11, 5], [11, 7]]),
        buildMatch('p1', 'p5', [[11, 5], [11, 7]]),
        buildMatch('p2', 'p1', [[11, 5], [11, 7]]),
        buildMatch('p2', 'p3', [[11, 5], [11, 7]]),
      ],
    );

    expect(standingOf(standings, 'p1').pointsClas).toBe(6);
    expect(standingOf(standings, 'p2').pointsClas).toBe(4);
    expect(standingOf(standings, 'p1').setsWon - standingOf(standings, 'p1').setsLost).toBe(0);
    expect(standingOf(standings, 'p2').setsWon - standingOf(standings, 'p2').setsLost).toBe(4);

    expect(standings[0].playerId).toBe('p1');
  });

  it('desempata por diferencia de sets antes que por diferencia de puntos', () => {
    // p1 y p2 empatan en puntos de clasificacion. p1 tiene mejor diferencia de
    // sets (+3 frente a +2) pero PEOR diferencia de puntos (-2 frente a +19),
    // asi que solo el desempate por sets puede poner a p1 por delante.
    const standings = computeGroupStandings(
      [
        classification('c1', 'p1'),
        classification('c2', 'p2'),
        classification('c3', 'p3'),
        classification('c4', 'p4'),
      ],
      [
        buildMatch('p1', 'p3', [[11, 10], [11, 10], [11, 10], [11, 10], [5, 11]]),
        buildMatch('p2', 'p4', [[11, 1], [11, 2]]),
      ],
    );

    expect(standingOf(standings, 'p1').pointsClas).toBe(standingOf(standings, 'p2').pointsClas);
    expect(standingOf(standings, 'p1').setsWon - standingOf(standings, 'p1').setsLost).toBe(3);
    expect(standingOf(standings, 'p2').setsWon - standingOf(standings, 'p2').setsLost).toBe(2);
    expect(
      standingOf(standings, 'p2').pointsWon - standingOf(standings, 'p2').pointsLost,
    ).toBeGreaterThan(standingOf(standings, 'p1').pointsWon - standingOf(standings, 'p1').pointsLost);

    expect(standings[0].playerId).toBe('p1');
  });

  it('desempata por diferencia de puntos cuando todo lo anterior empata', () => {
    // Mismos puntos de clasificacion, mismos sets ganados y perdidos: solo la
    // diferencia de puntos puede decidir (+15 frente a +5).
    const standings = computeGroupStandings(
      [
        classification('c1', 'p1'),
        classification('c2', 'p2'),
        classification('c3', 'p3'),
        classification('c4', 'p4'),
      ],
      [
        buildMatch('p1', 'p3', [[11, 5], [11, 2]]),
        buildMatch('p2', 'p4', [[11, 9], [11, 8]]),
      ],
    );

    expect(standingOf(standings, 'p1').pointsClas).toBe(standingOf(standings, 'p2').pointsClas);
    expect(standingOf(standings, 'p1').setsWon).toBe(standingOf(standings, 'p2').setsWon);
    expect(standingOf(standings, 'p1').setsLost).toBe(standingOf(standings, 'p2').setsLost);
    expect(
      standingOf(standings, 'p1').pointsWon - standingOf(standings, 'p1').pointsLost,
    ).toBeGreaterThan(standingOf(standings, 'p2').pointsWon - standingOf(standings, 'p2').pointsLost);

    expect(standings[0].playerId).toBe('p1');
  });

  it('ignora los partidos en los que participa alguien ajeno al grupo', () => {
    const standings = computeGroupStandings(
      [classification('c1', 'p1'), classification('c2', 'p2')],
      [buildMatch('p1', 'externo', [[11, 5], [11, 7]])],
    );

    expect(standingOf(standings, 'p1')).toMatchObject({ played: 0, setsWon: 0, pointsClas: 0 });
    expect(standingOf(standings, 'p2')).toMatchObject({ played: 0, setsWon: 0, pointsClas: 0 });
  });

  it('no muta las clasificaciones de entrada', () => {
    const classifications = [classification('c1', 'p1'), classification('c2', 'p2')];
    const snapshot = JSON.stringify(classifications);

    computeGroupStandings(classifications, [buildMatch('p1', 'p2', [[11, 5], [11, 7]])]);

    expect(JSON.stringify(classifications)).toBe(snapshot);
  });
});
