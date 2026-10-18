import XlsxPopulate from 'xlsx-populate';
import path from 'path';
import { buildGroupsEngine, TournamentSeed } from '../utils/group-generator';
import { createKnockoutDraw, KnockoutSeed } from '../utils/knockout';
import { randomUUID } from 'crypto';

const letrasMayusculas = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'Ñ',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
];

export const generateTournamentExcel = async (tournamentInfo: any, playersInput: any[]) => {
  const templatePath = path.join(__dirname, '../../public/assets/Planillas Maestra.xlsx');

  // Normalizamos a los jugadores
  const players = playersInput.map((p, index) => ({
    id: p.id || randomUUID(),
    name: p.name || 'Sin Nombre',
    clubName: p.clubName || '',
    seedValue: p.seedValue !== undefined ? p.seedValue : 10000 - index,
  }));

  const workbook = await XlsxPopulate.fromFileAsync(templatePath);

  // ==========================================
  // 1. RELLENAR HOJA 1
  // ==========================================
  const hoja1 = workbook.sheet('Hoja1');
  hoja1.cell('B1').value(tournamentInfo.name);
  hoja1
    .cell('B2')
    .value(new Date(tournamentInfo.dateStart || new Date()).toLocaleDateString('es-ES'));
  hoja1.cell('B3').value(tournamentInfo.levelTournament || 'General');
  hoja1.cell('B4').value(players.length);

  let currentRow = 7;
  players.forEach((player, index) => {
    hoja1.cell(`A${currentRow}`).value(index + 1);
    hoja1.cell(`B${currentRow}`).value(player.name);
    hoja1.cell(`C${currentRow}`).value(player.clubName);
    currentRow++;
  });

  // ==========================================
  // 2. CALCULAR GRUPOS Y CLONAR PESTAÑAS
  // ==========================================
  const seeds: TournamentSeed[] = players.map((p) => ({ id: p.id, seedValue: p.seedValue }));
  // Lógica inteligente: Si nos pasan los jugadores por grupo, calculamos cuántos grupos hacen falta
  let numGroups = tournamentInfo.numGroup;

  if (!numGroups && tournamentInfo.numGroupPlayers) {
    numGroups = Math.ceil(players.length / Number(tournamentInfo.numGroupPlayers));
  } else if (!numGroups) {
    numGroups = 2; // Fallback por seguridad
  }

  const groupsData = buildGroupsEngine(seeds, numGroups);

  const templateGroupNames: Record<number, string> = {
    3: 'Zona de 3 (01)',
    4: 'Zona de 4(01)',
    5: 'Zona de 5(01)',
  };

  const sheetsToKeep = ['Hoja1', 'Llave Final']; // Aquí iremos guardando las pestañas que NO queremos borrar

  groupsData.forEach((group, index) => {
    const numPlayers = group.players.length;
    const templateName = templateGroupNames[numPlayers];
    if (!templateName) throw new Error(`No hay plantilla para un grupo de ${numPlayers} jugadores`);

    const templateSheet = workbook.sheet(templateName);
    const newSheetName = `Grupo ${letrasMayusculas[index]}`;
    sheetsToKeep.push(newSheetName); // La protegemos del borrado

    const newSheet = workbook.cloneSheet(templateSheet, newSheetName);

    newSheet.cell('C8').value(`${tournamentInfo.name} - ${letrasMayusculas[index]}`);
    newSheet
      .cell('C9')
      .value(new Date(tournamentInfo.dateStart || new Date()).toLocaleDateString('es-ES'));
    newSheet.cell('C12').value(tournamentInfo.levelTournament || 'General');
    newSheet.cell('P2').value(index + 1);
    newSheet.cell('A13').value(`Grupo ${letrasMayusculas[index]}`);

    // Rellenar lista de jugadores y clubes
    const startRowTop = 18;
    group.players.forEach((playerId, pIndex) => {
      const playerObj = players.find((p) => p.id === playerId);
      const row = startRowTop + pIndex * 2;
      newSheet.cell(`G${row}`).value(playerObj?.name || 'Desconocido');
      newSheet.cell(`N${row}`).value(playerObj?.clubName || '');
    });

    // Rellenar los cruces de abajo
    for (let r = 29; r <= 80; r++) {
      const cellValue = newSheet.cell(`A${r}`).value();
      if (typeof cellValue === 'number' && cellValue >= 1 && cellValue <= numPlayers) {
        const playerId = group.players[cellValue - 1];
        const playerObj = players.find((p) => p.id === playerId);
        newSheet.cell(`B${r}`).value(playerObj?.name || '');
      }
    }
  });

  // ==========================================
  // 3. GENERAR EL CUADRO DE ELIMINATORIAS (LLAVES)
  // ==========================================
  const playersKnockout = tournamentInfo.playersKnockout || 2; // Cuántos pasan por grupo
  const classifiedPlayers: KnockoutSeed[] = [];

  // 3.1 Fabricamos a los clasificados "virtuales"
  groupsData.forEach((group, index) => {
    for (let pos = 1; pos <= playersKnockout; pos++) {
      classifiedPlayers.push({
        id: `${pos}º Grupo ${letrasMayusculas[index]}`, // Lo usamos de nombre visual
        position: pos,
        groupNumber: index + 1,
      });
    }
  });

  // 3.2 Calculamos los cruces usando nuestro motor puro
  const firstRoundMatches = createKnockoutDraw(classifiedPlayers, 'Siembra', false);

  // 3.3 Aplanamos el array (P1, P2, P3, P4...) poniendo EXENTO donde no hay jugador
  const drawSlots: string[] = [];
  firstRoundMatches.forEach((match) => {
    drawSlots.push(match.playerOne ? match.playerOne.id : 'EXENTO');
    drawSlots.push(match.playerTwo ? match.playerTwo.id : 'EXENTO');
  });

  const bracketSize = drawSlots.length; // 8, 16, 32 o 64
  let bracketTemplateName = `LlaveSEx${bracketSize}`;
  if (bracketSize === 32) bracketTemplateName = 'LlaveSEx32 C'; // Excepción por el nombre en la plantilla

  const bracketSheet = workbook.sheet(bracketTemplateName);

  if (bracketSheet) {
    const finalBracketSheet = workbook.cloneSheet(bracketSheet, 'Llave Final');

    // Escaneamos la columna B en busca de las semillas (1.0, 2.0...) e inyectamos al lado (Columna C)
    for (let r = 5; r <= 150; r++) {
      const val = finalBracketSheet.cell(`B${r}`).value();
      if (typeof val === 'number' && val >= 1 && val <= bracketSize) {
        const playerName = drawSlots[val - 1];
        finalBracketSheet.cell(`C${r}`).value(playerName);
      }
    }
  }

  // ==========================================
  // 4. LIMPIEZA EXTREMA Y REORDENAMIENTO
  // ==========================================
  // Borramos todas las pestañas de la plantilla maestra que no estén en "sheetsToKeep"
  workbook.sheets().forEach((sheet: any) => {
    if (!sheetsToKeep.includes(sheet.name())) {
      sheet.delete();
    }
  });

  const buffer = await workbook.outputAsync();
  return buffer;
};
