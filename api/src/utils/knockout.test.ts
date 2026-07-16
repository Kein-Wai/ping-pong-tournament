import { describe, it, expect } from 'vitest';
import { SortKnockout } from '@prisma/client';
import { createKnockoutDraw } from '../../src/utils/knockout';

const generateMockPlayers = (numPlayers: number) => {
  const players = [];
  let currentGroup = 1;
  let currentPosition = 1;
  const totalGroups = 4;

  for (let i = 1; i <= numPlayers; i++) {
    players.push({
      id: `Jugador_${i}`,
      position: currentPosition,
      groupNumber: currentGroup,

      label: `[G${currentGroup}-P${currentPosition}] Jugador ${i}`,
    });

    currentGroup++;
    if (currentGroup > totalGroups) {
      currentGroup = 1;
      currentPosition++;
    }
  }
  return players;
};

const printBracket = (numPlayers: number, matches: any[]) => {
  const bracketSize = matches.length * 2;
  console.log(`\n🏆 CUADRO GENERADO PARA ${numPlayers} JUGADORES (Bracket de ${bracketSize}) 🏆`);
  console.log('-------------------------------------------------------------------');

  matches.forEach((match, index) => {
    const p1 = match.playerOne ? match.playerOne.label : '👻 BYE (Exento)';
    const p2 = match.playerTwo ? match.playerTwo.label : '👻 BYE (Exento)';

    const isTopHalf = index < matches.length / 2;
    const halfLabel = isTopHalf ? 'ALTA' : 'BAJA';

    console.log(`Partido ${index + 1} (Mitad ${halfLabel}):\t${p1}  VS  ${p2}`);
  });
  console.log('-------------------------------------------------------------------\n');
};

describe('Algoritmo de Cruces y Siembra (Seeding ITTF)', () => {
  const testCases = [6, 9, 12, 16, 23, 32];

  testCases.forEach((numPlayers) => {
    it(`Debería generar un cuadro correcto para ${numPlayers} jugadores`, () => {
      const players = generateMockPlayers(numPlayers);

      const firstRoundMatches = createKnockoutDraw(players, SortKnockout.Siembra, false);

      const expectedBracketSize = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
      const expectedMatches = expectedBracketSize / 2;
      const expectedByes = expectedBracketSize - numPlayers;

      printBracket(numPlayers, firstRoundMatches);

      expect(firstRoundMatches.length).toBe(expectedMatches);

      let calculatedByes = 0;
      firstRoundMatches.forEach((match) => {
        if (!match.playerOne) calculatedByes++;
        if (!match.playerTwo) calculatedByes++;

        expect(match.playerOne || match.playerTwo).toBeTruthy();
      });

      expect(calculatedByes).toBe(expectedByes);
    });
  });
});
