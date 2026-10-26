import { describe, it, expect } from 'vitest';
import {
  buildTournamentExportData,
  buildBracket,
  buildGroups,
  buildGroupSheets,
  normalizePlayers,
  resolveGroupCount,
  GROUP_TEMPLATE_NAMES,
} from './excel-data';

const TOURNAMENT = {
  name: 'Torneo Test',
  dateStart: '2026-07-13T00:00:00.000Z',
  levelTournament: 'Intermedio',
  numGroup: 2,
  numGroupPlayers: 4,
  playersKnockout: 2,
};

const PLAYERS = [
  { id: 'p1', name: 'Ana', clubName: 'Club A', seedValue: 100 },
  { id: 'p2', name: 'Beto', clubName: 'Club A', seedValue: 90 },
  { id: 'p3', name: 'Carla', clubName: 'Club B', seedValue: 80 },
  { id: 'p4', name: 'Dani', clubName: 'Club B', seedValue: 70 },
  { id: 'p5', name: 'Eva', clubName: 'Club C', seedValue: 60 },
  { id: 'p6', name: 'Fede', clubName: 'Club C', seedValue: 50 },
  { id: 'p7', name: 'Gina', clubName: 'Club D', seedValue: 40 },
  { id: 'p8', name: 'Hugo', clubName: 'Club D', seedValue: 30 },
];

describe('Datos de exportacion a Excel (api/src/services/excel-data.ts)', () => {
  describe('normalizePlayers', () => {
    it('conserva los datos completos de un jugador', () => {
      const [player] = normalizePlayers([{ id: 'x1', name: 'Ana', clubName: 'Club A', seedValue: 10 }]);

      expect(player).toEqual({ id: 'x1', name: 'Ana', clubName: 'Club A', seedValue: 10 });
    });

    it('sustituye el nombre ausente por un valor por defecto', () => {
      const [player] = normalizePlayers([{ id: 'x1' }]);

      expect(player.name).toBe('Sin Nombre');
      expect(player.clubName).toBe('');
    });

    it('asigna una semilla descendente cuando no viene', () => {
      const players = normalizePlayers([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);

      expect(players.map((player) => player.seedValue)).toEqual([10000, 9999, 9998]);
    });

    it('genera un id cuando el jugador no lo trae', () => {
      const [player] = normalizePlayers([{ name: 'Sin id' }]);

      expect(player.id).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('resolveGroupCount', () => {
    it('usa el numero de grupos del torneo si viene', () => {
      expect(resolveGroupCount({ ...TOURNAMENT, numGroup: 3 }, 8)).toBe(3);
    });

    it('deduce los grupos de los jugadores por grupo cuando no vienen', () => {
      const info = { ...TOURNAMENT, numGroup: null };

      expect(resolveGroupCount(info, 9)).toBe(3);
    });

    it('usa 2 grupos como valor por defecto', () => {
      const info = { ...TOURNAMENT, numGroup: null, numGroupPlayers: null };

      expect(resolveGroupCount(info, 8)).toBe(2);
    });
  });

  describe('buildGroups', () => {
    it('reparte los jugadores en el numero de grupos indicado', () => {
      const groups = buildGroups(normalizePlayers(PLAYERS), 2);

      expect(groups).toHaveLength(2);
      expect(groups[0].players).toHaveLength(4);
      expect(groups[1].players).toHaveLength(4);
    });

    it('respeta la semilla: el mejor seed va al primer grupo', () => {
      const groups = buildGroups(normalizePlayers(PLAYERS), 2);

      expect(groups[0].players).toContain('p1');
    });
  });

  describe('buildGroupSheets', () => {
    it('exige una plantilla para el tamano del grupo', () => {
      const players = normalizePlayers(PLAYERS);
      const groups = buildGroups(players, 2);

      expect(() => buildGroupSheets(TOURNAMENT, players, groups)).not.toThrow();
    });

    it('falla con un mensaje claro si no hay plantilla para ese tamano', () => {
      const players = normalizePlayers(PLAYERS.slice(0, 7));
      const groups = buildGroups(players, 1);

      expect(() => buildGroupSheets(TOURNAMENT, players, groups)).toThrow(
        'No hay plantilla para un grupo de 7 jugadores',
      );
    });

    it('prepara una hoja por grupo con su letra y su nombre', () => {
      const players = normalizePlayers(PLAYERS);
      const groups = buildGroups(players, 2);
      const sheets = buildGroupSheets(TOURNAMENT, players, groups);

      expect(sheets).toHaveLength(2);
      expect(sheets[0].sheetName).toBe('Grupo A');
      expect(sheets[1].sheetName).toBe('Grupo B');
      expect(sheets[0].letter).toBe('A');
      expect(sheets[0].templateName).toBe(GROUP_TEMPLATE_NAMES[4]);
    });

    it('coloca a los jugadores en filas alternas de la hoja', () => {
      const players = normalizePlayers(PLAYERS);
      const groups = buildGroups(players, 2);
      const sheets = buildGroupSheets(TOURNAMENT, players, groups);

      expect(sheets[0].playerRows.map((row) => row.row)).toEqual([18, 20, 22, 24]);
    });

    it('prepara un cruce por cada jugador del grupo', () => {
      const players = normalizePlayers(PLAYERS);
      const groups = buildGroups(players, 2);
      const sheets = buildGroupSheets(TOURNAMENT, players, groups);

      expect(sheets[0].bracketRows).toHaveLength(4);
      expect(sheets[0].bracketRows[0].row).toBe(29);
    });
  });

  describe('buildBracket', () => {
    it('genera un cruce por cada clasificado de cada grupo', () => {
      const players = normalizePlayers(PLAYERS);
      const groups = buildGroups(players, 2);
      const bracket = buildBracket(TOURNAMENT, groups);

      // 2 grupos x 2 clasificados = 4 jugadores = 2 partidos
      expect(bracket.bracketSize).toBe(4);
      expect(bracket.drawSlots).toHaveLength(4);
    });

    it('usa la excepcion de nombre de la plantilla de 32', () => {
      const players = normalizePlayers(PLAYERS);
      const groups = buildGroups(players, 2);
      const bracket = buildBracket(TOURNAMENT, groups);

      expect(bracket.templateName).toBe('LlaveSEx4');
    });
  });

  describe('buildTournamentExportData', () => {
    it('devuelve todos los datos que la plantilla necesita', () => {
      const data = buildTournamentExportData(TOURNAMENT, PLAYERS);

      expect(data.tournament.name).toBe('Torneo Test');
      expect(data.tournament.level).toBe('Intermedio');
      expect(data.tournament.playerCount).toBe(8);
      expect(data.players).toHaveLength(8);
      expect(data.playerRows).toHaveLength(8);
      expect(data.groups).toHaveLength(2);
      expect(data.bracket.drawSlots).toHaveLength(4);
    });

    it('formatea la fecha en espanol', () => {
      const data = buildTournamentExportData(TOURNAMENT, PLAYERS);

      expect(data.tournament.date).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('protege las pestanas que deben sobrevivir a la limpieza', () => {
      const data = buildTournamentExportData(TOURNAMENT, PLAYERS);

      expect(data.sheetsToKeep).toContain('Hoja1');
      expect(data.sheetsToKeep).toContain('Llave Final');
      expect(data.sheetsToKeep).toContain('Grupo A');
      expect(data.sheetsToKeep).toContain('Grupo B');
    });

    it('las filas de la lista empiezan en la fila 7 y van correlativas', () => {
      const data = buildTournamentExportData(TOURNAMENT, PLAYERS);

      expect(data.playerRows[0].row).toBe(7);
      expect(data.playerRows[0].position).toBe(1);
      expect(data.playerRows[7].row).toBe(14);
    });
  });
});
