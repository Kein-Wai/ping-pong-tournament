import { describe, it, expect } from 'vitest';
import { SortKnockout } from '@prisma/client';
import { createKnockoutDraw } from '../../src/utils/knockout'; // Ajusta la ruta

// ============================================================================
// HELPER: Generador de Jugadores Clasificados
// Simula que vienen de 4 grupos distintos de forma equitativa
// ============================================================================
const generateMockPlayers = (numPlayers: number) => {
  const players = [];
  let currentGroup = 1;
  let currentPosition = 1;
  const totalGroups = 4; // Simulamos 4 grupos (A, B, C, D)

  for (let i = 1; i <= numPlayers; i++) {
    players.push({
      id: `Jugador_${i}`,
      position: currentPosition,
      groupNumber: currentGroup,
      // Etiqueta visual para el console.log (Ej: "G1-P1" es el 1º del Grupo 1)
      label: `[G${currentGroup}-P${currentPosition}] Jugador ${i}`,
    });

    currentGroup++;
    if (currentGroup > totalGroups) {
      currentGroup = 1; // Volvemos al Grupo 1 pero a por los 2ºs clasificados
      currentPosition++;
    }
  }
  return players;
};

// ============================================================================
// HELPER: Imprimir el cuadro en consola de forma bonita
// ============================================================================
const printBracket = (numPlayers: number, matches: any[]) => {
  const bracketSize = matches.length * 2;
  console.log(`\n🏆 CUADRO GENERADO PARA ${numPlayers} JUGADORES (Bracket de ${bracketSize}) 🏆`);
  console.log('-------------------------------------------------------------------');

  matches.forEach((match, index) => {
    const p1 = match.playerOne ? match.playerOne.label : '👻 BYE (Exento)';
    const p2 = match.playerTwo ? match.playerTwo.label : '👻 BYE (Exento)';

    // Marcamos si es un partido de la parte ALTA (Top) o BAJA (Bottom) del cuadro
    const isTopHalf = index < matches.length / 2;
    const halfLabel = isTopHalf ? 'ALTA' : 'BAJA';

    console.log(`Partido ${index + 1} (Mitad ${halfLabel}):\t${p1}  VS  ${p2}`);
  });
  console.log('-------------------------------------------------------------------\n');
};

// ============================================================================
// SUITE DE TESTS
// ============================================================================
describe('Algoritmo de Cruces y Siembra (Seeding ITTF)', () => {
  // Los escenarios exactos que has pedido
  const testCases = [6, 9, 12, 16, 23, 32];

  testCases.forEach((numPlayers) => {
    it(`Debería generar un cuadro correcto para ${numPlayers} jugadores`, () => {
      // 1. Generamos los clasificados simulados
      const players = generateMockPlayers(numPlayers);

      // 2. Ejecutamos tu función con el sistema protegido (Siembra)
      const firstRoundMatches = createKnockoutDraw(players, SortKnockout.Siembra, false);

      // 3. Cálculos matemáticos esperados
      const expectedBracketSize = Math.pow(2, Math.ceil(Math.log2(numPlayers))); // Potencia de 2
      const expectedMatches = expectedBracketSize / 2;
      const expectedByes = expectedBracketSize - numPlayers;

      // 4. Imprimimos el resultado para que lo inspecciones visualmente
      printBracket(numPlayers, firstRoundMatches);

      // 5. Aserciones de Zod/Vitest
      // Comprobamos que el número de partidos es la mitad del tamaño del bracket
      expect(firstRoundMatches.length).toBe(expectedMatches);

      // Comprobamos que el algoritmo ha insertado el número exacto de exentos (Byes)
      let calculatedByes = 0;
      firstRoundMatches.forEach((match) => {
        if (!match.playerOne) calculatedByes++;
        if (!match.playerTwo) calculatedByes++;

        // Un partido nunca debería tener dos Byes enfrentándose entre sí
        expect(match.playerOne || match.playerTwo).toBeTruthy();
      });

      expect(calculatedByes).toBe(expectedByes);
    });
  });
});
