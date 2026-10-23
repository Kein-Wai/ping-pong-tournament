import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AnalysisType,
  ClubStatus,
  DominantHand,
  EventRegion,
  ExerciseCategory,
  FeedbackStatus,
  FeedbackType,
  KnockoutType,
  LevelTournament,
  ManualMatchType,
  MatchFormat,
  MatchLocation,
  MatchStatus,
  OpponentLevel,
  PlayerLevel,
  PlayerTournamentStatus,
  Playstyle,
  PointCategory,
  PointPlacement,
  PointSubcategory,
  RoundKnockouts,
  Rounds,
  RubberType,
  SkillUpdateStatus,
  SortGroups,
  SortKnockout,
  TournamentStatus,
  TrainingStatus,
  TypeKnockout,
  TypeTournament,
  TypeUser,
  UpdateSourceType,
  UserClubStatus,
} from '@prisma/client';

/**
 * El cliente no puede importar @prisma/client (su build solo monta la carpeta
 * client/, sin el schema de la API), asi que mantiene un ESPEJO de los enums
 * en client/src/types/enums.ts.
 *
 * Este test es el contrato que impide que el espejo se desvíe: si se anade o
 * renombra un valor en el schema, este test falla hasta que el cliente se
 * actualiza.
 */
const CLIENT_ENUMS_PATH = resolve(__dirname, '../../../client/src/types/enums.ts');

const readClientEnums = (): string => {
  try {
    return readFileSync(CLIENT_ENUMS_PATH, 'utf-8');
  } catch {
    throw new Error(
      `No se encuentra el espejo de enums del cliente en ${CLIENT_ENUMS_PATH}. ` +
        'El cliente debe mantener client/src/types/enums.ts sincronizado con el schema.',
    );
  }
};

const clientEnumsSource = readClientEnums();

/** Extrae los valores de un bloque `export const X = { ... } as const;`. */
const clientEnumValues = (name: string): string[] => {
  const match = clientEnumsSource.match(
    new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\} as const;`),
  );
  if (!match) {
    throw new Error(`El enum ${name} no existe en el espejo del cliente.`);
  }

  return [...match[1].matchAll(/(\w+):\s*'([^']+)'/g)].map(([, , value]) => value);
};

const prismaEnumValues = (values: Record<string, string>): string[] => Object.values(values);

describe('Contrato de enums entre la API y el cliente (/api/contracts)', () => {
  const enums: Array<[string, Record<string, string>]> = [
    ['TypeUser', TypeUser],
    ['MatchStatus', MatchStatus],
    ['TournamentStatus', TournamentStatus],
    ['PlayerTournamentStatus', PlayerTournamentStatus],
    ['TypeTournament', TypeTournament],
    ['TypeKnockout', TypeKnockout],
    ['SortKnockout', SortKnockout],
    ['SortGroups', SortGroups],
    ['Rounds', Rounds],
    ['RoundKnockouts', RoundKnockouts],
    ['LevelTournament', LevelTournament],
    ['PlayerLevel', PlayerLevel],
    ['TrainingStatus', TrainingStatus],
    ['ClubStatus', ClubStatus],
    ['UserClubStatus', UserClubStatus],
    ['DominantHand', DominantHand],
    ['Playstyle', Playstyle],
    ['RubberType', RubberType],
    ['SkillUpdateStatus', SkillUpdateStatus],
    ['UpdateSourceType', UpdateSourceType],
    ['AnalysisType', AnalysisType],
    ['PointCategory', PointCategory],
    ['PointSubcategory', PointSubcategory],
    ['PointPlacement', PointPlacement],
    ['ManualMatchType', ManualMatchType],
    ['MatchFormat', MatchFormat],
    ['MatchLocation', MatchLocation],
    ['OpponentLevel', OpponentLevel],
    ['ExerciseCategory', ExerciseCategory],
    ['FeedbackType', FeedbackType],
    ['FeedbackStatus', FeedbackStatus],
    ['EventRegion', EventRegion],
    ['KnockoutType', KnockoutType],
  ];

  it.each(enums)('el enum %s del cliente coincide con el de Prisma', (name, prismaValues) => {
    const expected = prismaEnumValues(prismaValues).sort();
    const actual = clientEnumValues(name).sort();

    expect(actual).toEqual(expected);
  });
});
