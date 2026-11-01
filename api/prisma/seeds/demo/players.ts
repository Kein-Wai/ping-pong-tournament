import { PrismaClient, DominantHand, Playstyle, PlayerLevel, RubberType } from '@prisma/client';
import { Rng, daysFromToday } from './random';

const NOMBRES_M = ['Alejandro', 'Mateo', 'Hugo', 'Martín', 'Lucas', 'Leo', 'Daniel', 'Pablo', 'Álvaro', 'Adrián', 'Joaquín', 'Diego', 'Carlos', 'Javier', 'Marcos', 'Iván', 'Rubén', 'Sergio', 'Jorge', 'Raúl', 'Víctor', 'Andrés', 'Enrique', 'Ramón', 'Wei'];
const NOMBRES_F = ['Lucía', 'Sofía', 'Martina', 'María', 'Julia', 'Paula', 'Valeria', 'Emma', 'Daniela', 'Carla', 'Alba', 'Noa', 'Carmen', 'Elena', 'Sara', 'Irene', 'Marta', 'Laura', 'Ainhoa', 'Nuria', 'Mei'];
const APELLIDOS = ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Ruiz', 'Hernández', 'Jiménez', 'Díaz', 'Álvarez', 'Moreno', 'Muñoz', 'Alonso', 'Romero', 'Navarro', 'Gutiérrez', 'Torres', 'Domínguez', 'Gil', 'Vázquez', 'Serrano', 'Ramos', 'Blanco', 'Castro', 'Suárez', 'Ferrer', 'Roig', 'Safont', 'Beltrán', 'Peris', 'Climent', 'Chen', 'Zhang', 'Wang'];
/** Cuentas con login propio del dueño: se actualizan en su sitio (conservan su id y sus sesiones). */
export const NAMED_PLAYER_EMAILS = ['keinwaiplayer@hotmail.com', 'jlevin@hotmail.com'] as const;

/** Los jugadores aleatorios se reconocen por su email: es lo que permite borrar solo lo generado. */
export const RANDOM_PLAYER_EMAIL = { prefix: 'demo.jugador', suffix: '@pingpong.local' } as const;

const MOTES = ['El Rayo', 'Spinner', 'La Pared', 'Tormenta', 'Zurdo', 'Flash', 'Bloqueador', 'Ninja', 'Tigre', 'Martillo'];

/** Franja de nivel: rango de ELO y cuántos jugadores demo se generan en ella. */
interface LevelBand {
  level: PlayerLevel;
  minElo: number;
  maxElo: number;
  count: number;
  minAge: number;
  maxAge: number;
}

// Los umbrales de ELO son los del seed original (300 / 500 / 750 / 1200).
const LEVEL_BANDS: LevelBand[] = [
  { level: 'Iniciacion', minElo: 100, maxElo: 299, count: 12, minAge: 8, maxAge: 45 },
  { level: 'Principiante', minElo: 300, maxElo: 499, count: 14, minAge: 9, maxAge: 60 },
  { level: 'Intermedio', minElo: 500, maxElo: 749, count: 16, minAge: 11, maxAge: 65 },
  { level: 'Avanzado', minElo: 750, maxElo: 1199, count: 12, minAge: 13, maxAge: 58 },
  { level: 'Profesional', minElo: 1200, maxElo: 1700, count: 6, minAge: 15, maxAge: 40 },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Gomas según estilo: los defensivos usan más picos y antispin en el revés. */
const pickRubbers = (rng: Rng, style: Playstyle): { forehand: RubberType; backhand: RubberType } => {
  if (style === 'Defensivo') {
    return {
      forehand: rng.pick<RubberType>(['LISA', 'LISA', 'PICOS_CORTOS', 'PICOS_MEDIOS']),
      backhand: rng.pick<RubberType>(['PICOS_LARGOS', 'PICOS_LARGOS', 'ANTISPIN', 'PICOS_MEDIOS']),
    };
  }
  return {
    forehand: rng.pick<RubberType>(['LISA', 'LISA', 'LISA', 'LISA', 'PICOS_CORTOS']),
    backhand: rng.pick<RubberType>(['LISA', 'LISA', 'LISA', 'PICOS_CORTOS', 'PICOS_MEDIOS', 'ANTISPIN']),
  };
};

/**
 * Skills coherentes con el ELO: la base sube con el rating y cada jugador se
 * desvía según su estilo y su edad, de modo que no haya dos perfiles iguales.
 */
export const buildSkills = (rng: Rng, elo: number, style: Playstyle, age: number) => {
  const base = clamp(Math.floor(elo / 20), 5, 92);
  const vary = (bonus = 0) => clamp(base + bonus + rng.int(-8, 8), 3, 98);
  const offensive = style === 'Ofensivo';
  const experienceBonus = clamp(Math.round((age - 25) / 3), -10, 10);

  return {
    derechaPlano: vary(),
    revesPlano: vary(offensive ? -2 : 2),
    topspinDerecha: vary(offensive ? 10 : -10),
    topspinReves: vary(offensive ? 4 : -12),
    corte: vary(offensive ? -8 : 12),
    bloqueoDerecha: vary(offensive ? -4 : 10),
    bloqueoReves: vary(offensive ? -4 : 10),
    servicio: vary(),
    recepcion: vary(),
    movilidad: vary(clamp(Math.round((30 - age) / 3), -10, 8)),
    fortalezaMental: vary(),
    experiencia: vary(experienceBonus),
  };
};

interface CreatePlayerInput {
  email: string;
  name: string;
  surname: string;
  secondSurname?: string;
  nickname?: string;
  elo: number;
  level: PlayerLevel;
  age: number;
  dominantHand: DominantHand;
  playstyle: Playstyle;
  rubberForehand: RubberType;
  rubberBackhand: RubberType;
}

interface DemoContext {
  prisma: PrismaClient;
  rng: Rng;
  seasonId: string;
  clubId: string;
  playerRoleId: string;
  hashedPassword: string;
}

const createPlayer = async (ctx: DemoContext, input: CreatePlayerInput) => {
  const today = daysFromToday(0);
  const birthDate = new Date(Date.UTC(today.getUTCFullYear() - input.age, ctx.rng.int(0, 11), ctx.rng.int(1, 28)));
  const skills = buildSkills(ctx.rng, input.elo, input.playstyle, input.age);

  const profile = {
    name: input.name,
    surname: input.surname,
    secondSurname: input.secondSurname,
    nickname: input.nickname,
    birthDate,
    userTypeId: ctx.playerRoleId,
    clubId: ctx.clubId,
    clubStatus: 'Aprobado' as const,
    level: input.level,
    dominantHand: input.dominantHand,
    playstyle: input.playstyle,
    rubberForehand: input.rubberForehand,
    rubberBackhand: input.rubberBackhand,
  };

  // Upsert: si la cuenta ya existe se conserva su id y su contraseña; solo se refresca el perfil.
  const user = await ctx.prisma.user.upsert({
    where: { email: input.email },
    update: profile,
    create: { email: input.email, ...profile, password: ctx.hashedPassword, authProvider: 'LOCAL', active: true },
  });

  // El seed borra antes las estadísticas y habilidades de los jugadores demo, así que aquí siempre se crean.
  await ctx.prisma.stats.create({
    data: {
      userId: user.id,
      seasonId: ctx.seasonId,
      elo: input.elo,
      matchWon: 0,
      matchLost: 0,
      setWon: 0,
      setLost: 0,
      pointWon: 0,
      pointLost: 0,
      tournamentWon: 0,
      tournamentPart: 0,
    },
  });
  await ctx.prisma.playerSkills.create({ data: { userId: user.id, seasonId: ctx.seasonId, ...skills } });

  return user;
};

/** Los dos jugadores "reales" de pruebas del dueño (para entrar con su login). */
export const createNamedPlayers = async (ctx: DemoContext) => {
  const kein = await createPlayer(ctx, {
    email: NAMED_PLAYER_EMAILS[0],
    name: 'Kein-Wai',
    surname: 'Cheung',
    elo: 1600,
    level: 'Profesional',
    age: 34,
    dominantHand: 'Diestro',
    playstyle: 'Ofensivo',
    rubberForehand: 'LISA',
    rubberBackhand: 'LISA',
  });
  const julian = await createPlayer(ctx, {
    email: NAMED_PLAYER_EMAILS[1],
    name: 'Julian',
    surname: 'Levin',
    elo: 1500,
    level: 'Profesional',
    age: 29,
    dominantHand: 'Zurdo',
    playstyle: 'Ofensivo',
    rubberForehand: 'LISA',
    rubberBackhand: 'PICOS_CORTOS',
  });
  return [kein, julian];
};

/** Genera los 60 jugadores demo repartidos por franjas de nivel. */
export const createRandomPlayers = async (ctx: DemoContext) => {
  const { rng } = ctx;
  const created = [];
  let sequence = 1;

  for (const band of LEVEL_BANDS) {
    for (let i = 0; i < band.count; i++) {
      const female = rng.chance(0.4);
      const name = rng.pick(female ? NOMBRES_F : NOMBRES_M);
      const playstyle: Playstyle = rng.chance(0.28) ? 'Defensivo' : 'Ofensivo';
      const { forehand, backhand } = pickRubbers(rng, playstyle);
      const number = String(sequence).padStart(2, '0');

      created.push(
        await createPlayer(ctx, {
          email: `${RANDOM_PLAYER_EMAIL.prefix}${number}${RANDOM_PLAYER_EMAIL.suffix}`,
          name,
          surname: rng.pick(APELLIDOS),
          secondSurname: rng.chance(0.7) ? rng.pick(APELLIDOS) : undefined,
          nickname: rng.chance(0.15) ? rng.pick(MOTES) : undefined,
          elo: rng.int(band.minElo, band.maxElo),
          level: band.level,
          age: rng.int(band.minAge, band.maxAge),
          dominantHand: rng.chance(0.18) ? 'Zurdo' : 'Diestro',
          playstyle,
          rubberForehand: forehand,
          rubberBackhand: backhand,
        }),
      );
      sequence++;
    }
  }

  return created;
};

export type { DemoContext };
