import type {
  AnalysisType,
  DominantHand,
  MatchStatus,
  OpponentLevel,
  PointCategory,
  PointPlacement,
  PointSubcategory,
  Playstyle,
  RubberType,
} from './enums';

/** Marcador de un set desde el punto de vista del usuario. */
export interface SetScore {
  myScore: number;
  oppScore: number;
}

/** Punto registrado en el análisis profundo: a qué set pertenece, quién lo ganó y por qué. */
export interface TrackedPoint {
  id: string;
  setNumber: number;
  pointOrder: number;
  /** `true` si lo gané yo. */
  isWon: boolean;
  category?: PointCategory | null;
  subcategory?: PointSubcategory | null;
  placement?: PointPlacement | null;
}

/** Partido manual tal como lo consume la pantalla de análisis. */
export interface TrackedMatch {
  id: string;
  opponentName: string;
  opponentHand?: DominantHand | null;
  opponentStyle?: Playstyle | null;
  opponentLevel?: OpponentLevel | null;
  opponentRubberForehand?: RubberType | null;
  opponentRubberBackhand?: RubberType | null;
  status: MatchStatus;
  analysisType?: AnalysisType | null;
  setsToWin: number;
  mySets: number;
  opponentSets: number;
  planningNotes?: string | null;
  lightNotes?: string | null;
  setScores?: SetScore[] | null;
  points?: TrackedPoint[];
}

/** Planificación previa al partido, guardada como JSON en `planningNotes`. */
export interface PlanningNotes {
  myServe?: string;
  theirServe?: string;
  strategy?: string;
}

/** Puntos de un set agrupados por rótulo, con el marcador del set. */
export interface SetSummary {
  wonCategories: Record<string, number>;
  lostCategories: Record<string, number>;
  myScore: number;
  oppScore: number;
}

/** Tanteo que se está escribiendo para un set en el análisis rápido: vacío hasta que se rellena. */
export interface QuickSetScore {
  myScore: number | '';
  oppScore: number | '';
}
