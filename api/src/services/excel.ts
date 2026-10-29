import XlsxPopulate from 'xlsx-populate';
import path from 'path';
import {
  buildTournamentExportData,
  PlayerExportInput,
  TournamentExportData,
  TournamentExportInfo,
} from './excel-data';

const TEMPLATE_PATH = path.join(process.cwd(), 'public/assets/Planillas Maestra.xlsx');

/**
 * Rellena la hoja 1 con los datos del torneo y la lista de jugadores.
 *
 * ADAPTER: solo escribe celdas. Los datos llegan ya calculados.
 */
/**
 * Tipos estructurales minimos de xlsx-populate (la libreria no los publica).
 * Solo se declara lo que la exportacion usa de verdad.
 */
interface ExcelCell {
  value(value?: unknown): ExcelCell | unknown;
}

interface ExcelSheet {
  cell(address: string): ExcelCell;
  name(): string;
  delete(): void;
}

interface ExcelWorkbook {
  sheet(name: string): ExcelSheet;
  cloneSheet(sheet: ExcelSheet, name: string): ExcelSheet;
  sheets(): ExcelSheet[];
  outputAsync(): Promise<Buffer>;
}

const fillMainSheet = (workbook: ExcelWorkbook, data: TournamentExportData): void => {
  const sheet = workbook.sheet('Hoja1');

  sheet.cell('B1').value(data.tournament.name);
  sheet.cell('B2').value(data.tournament.date);
  sheet.cell('B3').value(data.tournament.level);
  sheet.cell('B4').value(data.tournament.playerCount);

  data.playerRows.forEach((row) => {
    sheet.cell(`A${row.row}`).value(row.position);
    sheet.cell(`B${row.row}`).value(row.name);
    sheet.cell(`C${row.row}`).value(row.clubName);
  });
};

/**
 * Clona la hoja-plantilla de cada grupo y la rellena con sus jugadores.
 *
 * ADAPTER: solo escribe celdas. Los datos llegan ya calculados.
 */
const fillGroupSheets = (workbook: ExcelWorkbook, data: TournamentExportData): void => {
  data.groups.forEach((group) => {
    const templateSheet = workbook.sheet(group.templateName);
    const sheet = workbook.cloneSheet(templateSheet, group.sheetName);

    sheet.cell('C8').value(`${data.tournament.name} - ${group.letter}`);
    sheet.cell('C9').value(data.tournament.date);
    sheet.cell('C12').value(data.tournament.level);
    sheet.cell('P2').value(group.groupNumber);
    sheet.cell('A13').value(`Grupo ${group.letter}`);

    group.playerRows.forEach((player) => {
      sheet.cell(`G${player.row}`).value(player.name);
      sheet.cell(`N${player.row}`).value(player.clubName);
    });

    group.bracketRows.forEach((bracketRow) => {
      sheet.cell(`B${bracketRow.row}`).value(bracketRow.name);
    });
  });
};

/**
 * Clona la hoja-plantilla del cuadro y la rellena con las semillas.
 *
 * ADAPTER: solo escribe celdas. Los datos llegan ya calculados.
 */
const fillBracketSheet = (workbook: ExcelWorkbook, data: TournamentExportData): void => {
  const templateSheet = workbook.sheet(data.bracket.templateName);
  if (!templateSheet) return;

  const sheet = workbook.cloneSheet(templateSheet, 'Llave Final');

  // Las semillas estan numeradas en la columna B; la C lleva su nombre.
  for (let row = 5; row <= 150; row++) {
    const seed = sheet.cell(`B${row}`).value();
    if (typeof seed === 'number' && seed >= 1 && seed <= data.bracket.bracketSize) {
      sheet.cell(`C${row}`).value(data.bracket.drawSlots[seed - 1]);
    }
  }
};

/**
 * Elimina de la plantilla las pestanas que no forman parte de la exportacion.
 *
 * ADAPTER: solo manipula el libro.
 */
const removeUnusedSheets = (workbook: ExcelWorkbook, sheetsToKeep: string[]): void => {
  workbook.sheets().forEach((sheet: ExcelSheet) => {
    if (!sheetsToKeep.includes(sheet.name())) {
      sheet.delete();
    }
  });
};

/**
 * Genera el Excel de un torneo a partir de la plantilla maestra.
 *
 * El calculo del reparto, los grupos y el cuadro vive en `excel-data` (puro y
 * testeable); aqui solo se vuelcan los datos en las celdas de la plantilla.
 */
export const generateTournamentExcel = async (
  tournamentInfo: TournamentExportInfo,
  playersInput: PlayerExportInput[],
) => {
  const data = buildTournamentExportData(tournamentInfo, playersInput);

  const workbook = (await XlsxPopulate.fromFileAsync(TEMPLATE_PATH)) as unknown as ExcelWorkbook;

  fillMainSheet(workbook, data);
  fillGroupSheets(workbook, data);
  fillBracketSheet(workbook, data);
  removeUnusedSheets(workbook, data.sheetsToKeep);

  return workbook.outputAsync();
};
