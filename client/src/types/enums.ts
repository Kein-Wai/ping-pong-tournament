/**
 * Enums del dominio del cliente.
 *
 * Son el ESPEJO de los enums de Prisma (api/prisma/schema.prisma). El cliente
 * no puede importar @prisma/client porque su build (y su imagen de Docker)
 * solo montan la carpeta client/, sin el schema de la API.
 *
 * Para que el espejo no se desviese, la API tiene un test de contrato
 * (api/src/contracts/enums.test.ts) que compara estos valores con los enums
 * reales de Prisma. Si se anade un valor en el schema y no aqui, ese test
 * falla.
 *
 * Se declaran como objetos const y no como `enum` de TypeScript porque el
 * tsconfig del cliente usa `erasableSyntaxOnly`.
 */

/** Rol del usuario dentro de la plataforma. */
export const TypeUser = {
  SuperAdmin: 'SuperAdmin',
  AdminClub: 'AdminClub',
  Player: 'Player',
} as const;
export type TypeUser = (typeof TypeUser)[keyof typeof TypeUser];

/** Estado de un partido. */
export const MatchStatus = {
  Programado: 'Programado',
  Iniciado: 'Iniciado',
  Abierto: 'Abierto',
  Completado: 'Completado',
  Cancelado: 'Cancelado',
} as const;
export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

/** Estado de un torneo. */
export const TournamentStatus = {
  Programado: 'Programado',
  Iniciado: 'Iniciado',
  Grupos: 'Grupos',
  R128avos: 'R128avos',
  R64avos: 'R64avos',
  R32avos: 'R32avos',
  R16avos: 'R16avos',
  Octavos: 'Octavos',
  Cuartos: 'Cuartos',
  Semifinales: 'Semifinales',
  Final: 'Final',
  Completado: 'Completado',
  Cancelado: 'Cancelado',
} as const;
export type TournamentStatus = (typeof TournamentStatus)[keyof typeof TournamentStatus];

/** Estado de un jugador dentro de un torneo. */
export const PlayerTournamentStatus = {
  Pendiente: 'Pendiente',
  Confirmado: 'Confirmado',
  NoPresentado: 'NoPresentado',
} as const;
export type PlayerTournamentStatus =
  (typeof PlayerTournamentStatus)[keyof typeof PlayerTournamentStatus];

/** Tipo de torneo. */
export const TypeTournament = {
  Interno: 'Interno',
  Abierto: 'Abierto',
  Oficial: 'Oficial',
} as const;
export type TypeTournament = (typeof TypeTournament)[keyof typeof TypeTournament];

/** Como se reparte la semilla en el cuadro de eliminatorias. */
export const TypeKnockout = {
  LlaveA: 'LlaveA',
  LlaveAB: 'LlaveAB',
} as const;
export type TypeKnockout = (typeof TypeKnockout)[keyof typeof TypeKnockout];

/** Orden de la semilla en el cuadro de eliminatorias. */
export const SortKnockout = {
  Siembra: 'Siembra',
  Aleatorio: 'Aleatorio',
} as const;
export type SortKnockout = (typeof SortKnockout)[keyof typeof SortKnockout];

/** Orden de reparto de jugadores en los grupos. */
export const SortGroups = {
  Snake: 'Snake',
  Aleatorio: 'Aleatorio',
} as const;
export type SortGroups = (typeof SortGroups)[keyof typeof SortGroups];

/** Formato de la fase de un torneo. */
export const Rounds = {
  TodosvsTodos: 'TodosvsTodos',
  GruposKnockout: 'GruposKnockout',
  Knockout: 'Knockout',
} as const;
export type Rounds = (typeof Rounds)[keyof typeof Rounds];

/** Ronda de eliminatorias. */
export const RoundKnockouts = {
  R128avos: 'R128avos',
  R64avos: 'R64avos',
  R32avos: 'R32avos',
  R16avos: 'R16avos',
  Octavos: 'Octavos',
  Cuartos: 'Cuartos',
  Semifinales: 'Semifinales',
  Final: 'Final',
} as const;
export type RoundKnockouts = (typeof RoundKnockouts)[keyof typeof RoundKnockouts];

/** Nivel del torneo. */
export const LevelTournament = {
  Principiante: 'Principiante',
  Intermedio: 'Intermedio',
  Avanzado: 'Avanzado',
  Federado: 'Federado',
  Mixto: 'Mixto',
} as const;
export type LevelTournament = (typeof LevelTournament)[keyof typeof LevelTournament];

/** Nivel de un jugador. */
export const PlayerLevel = {
  Iniciacion: 'Iniciacion',
  Principiante: 'Principiante',
  Intermedio: 'Intermedio',
  Avanzado: 'Avanzado',
  Profesional: 'Profesional',
} as const;
export type PlayerLevel = (typeof PlayerLevel)[keyof typeof PlayerLevel];

/** Estado de un plan de entrenamiento. */
export const TrainingStatus = {
  Activo: 'Activo',
  Completado: 'Completado',
  Cancelado: 'Cancelado',
} as const;
export type TrainingStatus = (typeof TrainingStatus)[keyof typeof TrainingStatus];

/** Estado de un club. */
export const ClubStatus = {
  Pendiente: 'Pendiente',
  Aprobado: 'Aprobado',
  Inactivo: 'Inactivo',
} as const;
export type ClubStatus = (typeof ClubStatus)[keyof typeof ClubStatus];

/** Estado de un usuario dentro de un club. */
export const UserClubStatus = {
  Registrado: 'Registrado',
  Pendiente: 'Pendiente',
  Aprobado: 'Aprobado',
  Rechazado: 'Rechazado',
} as const;
export type UserClubStatus = (typeof UserClubStatus)[keyof typeof UserClubStatus];

/** Mano dominante. */
export const DominantHand = {
  Diestro: 'Diestro',
  Zurdo: 'Zurdo',
} as const;
export type DominantHand = (typeof DominantHand)[keyof typeof DominantHand];

/** Estilo de juego. */
export const Playstyle = {
  Ofensivo: 'Ofensivo',
  Defensivo: 'Defensivo',
} as const;
export type Playstyle = (typeof Playstyle)[keyof typeof Playstyle];

/** Tipo de goma. */
export const RubberType = {
  LISA: 'LISA',
  PICOS_CORTOS: 'PICOS_CORTOS',
  PICOS_MEDIOS: 'PICOS_MEDIOS',
  PICOS_LARGOS: 'PICOS_LARGOS',
  ANTISPIN: 'ANTISPIN',
} as const;
export type RubberType = (typeof RubberType)[keyof typeof RubberType];

/** Estado de una mejora de skill pendiente de aplicar. */
export const SkillUpdateStatus = {
  EXPECTED: 'EXPECTED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
} as const;
export type SkillUpdateStatus = (typeof SkillUpdateStatus)[keyof typeof SkillUpdateStatus];

/** Origen de una mejora de skill. */
export const UpdateSourceType = {
  EntrenamientoGeneral: 'EntrenamientoGeneral',
  EntrenamientoEspecifico: 'EntrenamientoEspecifico',
  Partido: 'Partido',
} as const;
export type UpdateSourceType = (typeof UpdateSourceType)[keyof typeof UpdateSourceType];

/** Tipo de analisis de un punto. */
export const AnalysisType = {
  Rapido: 'Rapido',
  Extenso: 'Extenso',
} as const;
export type AnalysisType = (typeof AnalysisType)[keyof typeof AnalysisType];

/** Categoria de un punto. */
export const PointCategory = {
  Servicio: 'Servicio',
  Ataque: 'Ataque',
  Defensa: 'Defensa',
  Resto: 'Resto',
  FalloSaque: 'FalloSaque',
  ErrorNoForzado: 'ErrorNoForzado',
  ErrorForzado: 'ErrorForzado',
  Movilidad: 'Movilidad',
  SinRazon: 'SinRazon',
} as const;
export type PointCategory = (typeof PointCategory)[keyof typeof PointCategory];

/** Subcategoria de un punto. */
export const PointSubcategory = {
  Cortado: 'Cortado',
  Topeado: 'Topeado',
  SinEfecto: 'SinEfecto',
  Derecha: 'Derecha',
  Reves: 'Reves',
} as const;
export type PointSubcategory = (typeof PointSubcategory)[keyof typeof PointSubcategory];

/** Lado de la mesa en el que se produce el punto. */
export const PointPlacement = {
  Derecha: 'Derecha',
  Reves: 'Reves',
  Centro: 'Centro',
} as const;
export type PointPlacement = (typeof PointPlacement)[keyof typeof PointPlacement];

/** Tipo de analisis manual. */
export const ManualMatchType = {
  Liga: 'Liga',
  Competicion: 'Competicion',
  Amistoso: 'Amistoso',
} as const;
export type ManualMatchType = (typeof ManualMatchType)[keyof typeof ManualMatchType];

/** Formato del partido. */
export const MatchFormat = {
  Individual: 'Individual',
  Equipos: 'Equipos',
} as const;
export type MatchFormat = (typeof MatchFormat)[keyof typeof MatchFormat];

/** Local o visitante. */
export const MatchLocation = {
  Casa: 'Casa',
  Fuera: 'Fuera',
} as const;
export type MatchLocation = (typeof MatchLocation)[keyof typeof MatchLocation];

/** Nivel del rival. */
export const OpponentLevel = {
  Peor: 'Peor',
  Igual: 'Igual',
  Mejor: 'Mejor',
} as const;
export type OpponentLevel = (typeof OpponentLevel)[keyof typeof OpponentLevel];

/** Tipo de exercise. */
export const ExerciseCategory = {
  Control_CT: 'Control_CT',
  Bloqueo_Contraataque: 'Bloqueo_Contraataque',
  Movilidad_Lateral: 'Movilidad_Lateral',
  Movilidad_Pivot: 'Movilidad_Pivot',
  Semi_Variables: 'Semi_Variables',
  Recepcion_Flip_Reves: 'Recepcion_Flip_Reves',
  Recepciones_Cortas: 'Recepciones_Cortas',
  Recepciones_Largas: 'Recepciones_Largas',
  Recepciones_Cortas_Largas: 'Recepciones_Cortas_Largas',
  Recepcion_Saques_Intermedios: 'Recepcion_Saques_Intermedios',
  Saques_Largos: 'Saques_Largos',
  Servicios_Ataque: 'Servicios_Ataque',
  Individuales: 'Individuales',
} as const;
export type ExerciseCategory = (typeof ExerciseCategory)[keyof typeof ExerciseCategory];

/** Tipo de feedback del usuario. */
export const FeedbackType = {
  Bug: 'Bug',
  Sugerencia: 'Sugerencia',
} as const;
export type FeedbackType = (typeof FeedbackType)[keyof typeof FeedbackType];

/** Estado de un feedback. */
export const FeedbackStatus = {
  Pendiente: 'Pendiente',
  Revisado: 'Revisado',
  Resuelto: 'Resuelto',
} as const;
export type FeedbackStatus = (typeof FeedbackStatus)[keyof typeof FeedbackStatus];

/** Ambito geografico de un evento. */
export const EventRegion = {
  Club: 'Club',
  Local: 'Local',
  Regional: 'Regional',
  Provincial: 'Provincial',
  Autonomico: 'Autonomico',
  Nacional: 'Nacional',
  Internacional: 'Internacional',
} as const;
export type EventRegion = (typeof EventRegion)[keyof typeof EventRegion];

/** Tipo de llave: A o A y B. */
export const KnockoutType = {
  A: 'A',
  B: 'B',
} as const;
export type KnockoutType = (typeof KnockoutType)[keyof typeof KnockoutType];
