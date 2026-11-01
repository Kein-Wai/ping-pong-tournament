import { PrismaClient, EventRegion, GeneralTrainingSchedule } from '@prisma/client';
import { calculateConditionalGrowth } from '../../../src/utils/skills';
import { Rng, daysFromToday } from './random';

interface ClubLifeContext {
  prisma: PrismaClient;
  rng: Rng;
  seasonId: string;
  clubId: string;
}

type SkillKey =
  | 'derechaPlano'
  | 'revesPlano'
  | 'topspinDerecha'
  | 'topspinReves'
  | 'corte'
  | 'bloqueoDerecha'
  | 'bloqueoReves'
  | 'servicio'
  | 'recepcion'
  | 'movilidad'
  | 'fortalezaMental'
  | 'experiencia';

interface TrainingFocus {
  name: string;
  skills: SkillKey[];
  descriptions: string[];
}

/** Qué se entrena en cada tipo de sesión; rota por fecha para que no todas sean iguales. */
const TRAINING_FOCUS: TrainingFocus[] = [
  {
    name: 'Topspin y bloqueo',
    skills: ['topspinDerecha', 'topspinReves', 'bloqueoDerecha', 'bloqueoReves'],
    descriptions: ['Multibolas de topspin en diagonal y bloqueo activo', 'Topspin contra bloqueo, cambios de dirección'],
  },
  {
    name: 'Servicio y recepción',
    skills: ['servicio', 'recepcion'],
    descriptions: ['Variantes de saque corto y recepciones de flip', 'Saque + tercera bola y recepción a la zona corta'],
  },
  {
    name: 'Movilidad y juego de pies',
    skills: ['movilidad', 'derechaPlano', 'revesPlano'],
    descriptions: ['Desplazamientos laterales y pivot con multibolas', 'Ejercicios de dos puntos y juego de pies'],
  },
  {
    name: 'Corte y juego defensivo',
    skills: ['corte', 'bloqueoDerecha', 'bloqueoReves'],
    descriptions: ['Corte largo contra topspin y recuperación de posición', 'Defensa lejos de la mesa y contraataque'],
  },
  {
    name: 'Mentalidad y partidos',
    skills: ['fortalezaMental', 'experiencia'],
    descriptions: ['Partidos con marcador de presión (empezar 8-8)', 'Liga interna de entrenamiento al mejor de 3'],
  },
];

const SCHEDULES = [
  { name: 'Escuela Infantil', startTime: '16:00', endTime: '17:30', daysOfWeek: [2, 4] },
  { name: 'L-X-V Tarde', startTime: '17:30', endTime: '19:00', daysOfWeek: [1, 3, 5] },
  { name: 'M-J Noche', startTime: '19:00', endTime: '21:00', daysOfWeek: [2, 4] },
  { name: 'Sábado Mañana', startTime: '10:00', endTime: '12:30', daysOfWeek: [6] },
];

const toTemplateData = (focus: TrainingFocus) =>
  Object.fromEntries(focus.skills.map((skill) => [skill, true])) as Record<SkillKey, boolean>;

/**
 * Entrenamientos grupales de septiembre a noviembre. Las sesiones pasadas
 * llevan lista de asistencia (con ausentes marcados) y mejoras de skill
 * pendientes; las futuras quedan sin pasar lista.
 */
export const createTrainings = async (ctx: ClubLifeContext) => {
  const { prisma, rng, seasonId, clubId } = ctx;

  const schedules: GeneralTrainingSchedule[] = [];
  for (const schedule of SCHEDULES) {
    schedules.push(await prisma.generalTrainingSchedule.create({ data: { clubId, ...schedule } }));
  }

  const templates = [];
  // Las plantillas son globales (de todos los clubes): se reutilizan por nombre y nunca se borran.
  for (const focus of TRAINING_FOCUS) {
    const existing = await prisma.skillUpdateTemplate.findFirst({
      where: { name: focus.name, sourceType: 'EntrenamientoGeneral' },
    });
    templates.push(
      existing ??
        (await prisma.skillUpdateTemplate.create({
          data: { name: focus.name, sourceType: 'EntrenamientoGeneral', ...toTemplateData(focus) },
        })),
    );
  }

  const players = await prisma.user.findMany({
    where: { clubId, userType: { name: 'Player' }, active: true },
    include: { skills: { where: { seasonId } } },
  });

  // Cada jugador tiene sus horarios habituales (los niños, la escuela) y una regularidad propia.
  const habits = players.map((player) => {
    const age = player.birthDate ? new Date().getUTCFullYear() - player.birthDate.getUTCFullYear() : 30;
    const regular =
      age <= 14
        ? [schedules[0]]
        : rng.shuffle(schedules.slice(1)).slice(0, rng.int(1, 2));
    return { player, regularIds: new Set(regular.map((s) => s.id)), reliability: 0.5 + rng.next() * 0.45 };
  });

  const today = daysFromToday(0);
  const start = new Date(Date.UTC(2026, 8, 1));
  const end = new Date(Date.UTC(2026, 10, 30));
  let sessionIndex = 0;
  let totalSessions = 0;
  let totalAttendances = 0;

  for (const day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    for (const schedule of schedules) {
      if (!schedule.daysOfWeek.includes(day.getUTCDay())) continue;

      const focusIndex = sessionIndex % TRAINING_FOCUS.length;
      const focus = TRAINING_FOCUS[focusIndex];
      sessionIndex++;

      const training = await prisma.generalTraining.create({
        data: {
          clubId,
          seasonId,
          description: `${focus.name}: ${rng.pick(focus.descriptions)}`,
          date: new Date(day),
          scheduleId: schedule.id,
          templateId: templates[focusIndex].id,
        },
      });
      totalSessions++;

      if (day > today) continue;

      const attendance = [];
      const updates = [];
      for (const { player, regularIds, reliability } of habits) {
        const isRegular = regularIds.has(schedule.id);
        const attended = rng.chance(isRegular ? reliability : 0.04);
        if (!attended && !(isRegular && rng.chance(0.5))) continue;

        attendance.push({ generalTrainingId: training.id, clubId, playerId: player.id, attended });
        if (!attended) continue;

        const skills = player.skills[0];
        updates.push({
          playerId: player.id,
          sourceType: 'EntrenamientoGeneral' as const,
          generalTrainingId: training.id,
          status: 'EXPECTED' as const,
          date: new Date(day),
          ...Object.fromEntries(
            focus.skills.map((skill) => [skill, calculateConditionalGrowth(true, skills?.[skill])]),
          ),
        });
      }

      if (attendance.length > 0) await prisma.generalTrainingAttendance.createMany({ data: attendance });
      if (updates.length > 0) await prisma.playerSkillUpdate.createMany({ data: updates });
      totalAttendances += attendance.length;
    }
  }

  console.log(`   • ${schedules.length} horarios, ${totalSessions} sesiones, ${totalAttendances} registros de asistencia`);
};

interface DemoEvent {
  name: string;
  region: EventRegion;
  date: string;
  endDate?: string;
  location: string;
  color: string;
}

const REGION_COLOR: Record<EventRegion, string> = {
  Club: 'green',
  Local: 'teal',
  Provincial: 'blue',
  Regional: 'cyan',
  Autonomico: 'grape',
  Nacional: 'red',
  Internacional: 'pink',
};

const event = (region: EventRegion, name: string, date: string, location: string, endDate?: string): DemoEvent => ({
  region,
  name,
  date: `${date}T09:00:00.000Z`,
  endDate: endDate ? `${endDate}T20:00:00.000Z` : undefined,
  location,
  color: REGION_COLOR[region],
});

const OFFICIAL_EVENTS: DemoEvent[] = [
  event('Club', 'Torneo Social de Otoño', '2026-10-10', 'Pabellón Ciudad Deportiva, Castellón'),
  event('Provincial', 'Campeonato Provincial Sub-13 / Sub-15', '2026-10-17', 'Castellón de la Plana', '2026-10-18'),
  event('Club', 'Fiesta de Halloween del club', '2026-10-31', 'Sede del club'),
  event('Autonomico', 'Ranking Zonal Autonómico 1', '2026-11-07', 'Valencia'),
  event('Local', 'Torneo Local de Villarreal', '2026-11-14', 'Villarreal'),
  event('Nacional', 'Liga Nacional · Jornada de División de Honor', '2026-11-21', 'Madrid', '2026-11-22'),
  event('Provincial', 'Top Provincial Absoluto 1', '2026-11-28', 'Castellón de la Plana'),
  event('Autonomico', 'Ranking Zonal Autonómico 2', '2026-12-05', 'Alicante'),
  event('Club', 'Torneo de Navidad del club', '2026-12-19', 'Pabellón Ciudad Deportiva, Castellón'),
  event('Nacional', 'Torneo Estatal Zonal de Navidad', '2026-12-27', 'Guadalajara', '2026-12-28'),
  event('Regional', 'Ranking Regional Veteranos', '2027-01-09', 'Valencia'),
  event('Autonomico', 'Campeonato Autonómico por Equipos', '2027-01-23', 'Elche', '2027-01-24'),
  event('Provincial', 'Top Provincial Absoluto 2', '2027-02-06', 'Vila-real'),
  event('Autonomico', 'Campeonato Autonómico Individual', '2027-02-20', 'Valencia', '2027-02-21'),
  event('Local', 'Torneo Local de Benicàssim', '2027-03-06', 'Benicàssim'),
  event('Nacional', 'Campeonato de España Individual (fase previa)', '2027-03-13', 'Antequera', '2027-03-14'),
  event('Regional', 'Ranking Regional Absoluto', '2027-03-27', 'Alicante'),
  event('Internacional', 'Open Internacional de España', '2027-04-10', 'Valencia', '2027-04-11'),
  event('Provincial', 'Final Provincial por Equipos', '2027-04-24', 'Castellón de la Plana'),
  event('Nacional', 'Campeonato de España por Equipos', '2027-05-08', 'Zaragoza', '2027-05-09'),
  event('Club', 'Torneo Social de Primavera', '2027-05-22', 'Pabellón Ciudad Deportiva, Castellón'),
  event('Nacional', 'Campeonato de España de Veteranos', '2027-06-05', 'Salamanca', '2027-06-06'),
  event('Club', 'Fiesta de fin de temporada', '2027-06-19', 'Sede del club'),
  event('Club', 'Asamblea y entrega de trofeos', '2027-06-27', 'Sede del club'),
];

/** Calendario oficial de octubre a junio, con recordatorios para un jugador. */
export const createEvents = async (ctx: ClubLifeContext, reminderUserId: string) => {
  const { prisma, seasonId, clubId } = ctx;
  const today = daysFromToday(0);

  for (const item of OFFICIAL_EVENTS) {
    const created = await prisma.clubEvent.create({
      data: {
        clubId,
        seasonId,
        name: item.name,
        region: item.region,
        date: new Date(item.date),
        endDate: item.endDate ? new Date(item.endDate) : null,
        location: item.location,
        color: item.color,
      },
    });

    const notifyAt = new Date(new Date(item.date).getTime() - 24 * 60 * 60 * 1000);
    if (item.region !== 'Club') {
      await prisma.eventReminder.create({
        data: { eventId: created.id, userId: reminderUserId, notifyAt, isSent: notifyAt < today },
      });
    }
  }

  console.log(`   • ${OFFICIAL_EVENTS.length} eventos oficiales (oct 2026 – jun 2027)`);
};

const TEAMS = [
  { name: 'Castelló Ape', category: '1ª División Masc. G5 (RFETM)', level: 'Profesional', size: 5, offset: 0 },
  { name: 'Castalia', category: '2ª División Masc. G6 (RFETM)', level: 'Avanzado', size: 5, offset: 5 },
  { name: 'Tombatossals', category: '1ª Autonómica G1 (FTTCV)', level: 'Intermedio', size: 6, offset: 10 },
  { name: 'Bufanuvols', category: '2ª Autonómica G1 (FTTCV)', level: 'Intermedio', size: 6, offset: 16 },
];

const RIVALS = [
  { name: 'CTM Alcoy-Vintage', city: 'Alcoy' },
  { name: 'CD Pobla Farnals', city: 'La Pobla de Farnals' },
  { name: 'STMO Estrellas', city: 'Valencia' },
  { name: "Alicante TM 'A'", city: 'Alicante' },
  { name: 'Óptica Look Dama de Elche', city: 'Elche' },
  { name: 'CTM Torrent', city: 'Torrent' },
  { name: 'CTM Almassora', city: 'Almassora' },
];

const HOME_VENUE = 'Pabellón Ciudad Deportiva Castellón';

/** Cuatro equipos con plantilla repartida por ELO, partidos jugados y por jugar. */
export const createTeams = async (ctx: ClubLifeContext) => {
  const { prisma, rng, seasonId, clubId } = ctx;

  const ranked = await prisma.stats.findMany({
    where: { seasonId, user: { clubId, userType: { name: 'Player' } } },
    orderBy: { elo: 'desc' },
    select: { userId: true },
  });

  for (const [teamIndex, def] of TEAMS.entries()) {
    const roster = ranked.slice(def.offset, def.offset + def.size).map((s) => s.userId);
    const team = await prisma.team.create({
      data: {
        name: def.name,
        category: def.category,
        level: def.level,
        clubId,
        seasonId,
        players: { connect: roster.map((id) => ({ id })) },
      },
    });

    // Tres jornadas ya jugadas (una con derrota) y tres por jugar, la última cancelada en el último equipo.
    const schedule = [-26, -19, -12, 3 + teamIndex, 10 + teamIndex, 24 + teamIndex];
    for (const [i, offset] of schedule.entries()) {
      const rival = RIVALS[(teamIndex * 2 + i) % RIVALS.length];
      const isHome = i % 2 === 0;
      const played = offset < 0;
      const win = i !== 1;
      const winnerScore = rng.int(4, 6);
      const loserScore = rng.int(0, 3);

      const created = await prisma.teamMatch.create({
        data: {
          teamId: team.id,
          rivalName: rival.name,
          date: new Date(daysFromToday(offset).getTime() + 17 * 60 * 60 * 1000),
          isHome,
          location: isHome ? HOME_VENUE : rival.city,
          status: played ? 'Completado' : teamIndex === 3 && i === 5 ? 'Cancelado' : 'Programado',
          ourScore: played ? (win ? winnerScore : loserScore) : null,
          rivalScore: played ? (win ? loserScore : winnerScore) : null,
        },
      });

      if (!played) {
        const available = roster.filter(() => rng.chance(0.7));
        if (available.length > 0) {
          await prisma.teamMatchAvailability.createMany({
            data: available.map((playerId) => ({ matchId: created.id, playerId })),
          });
        }
      }
    }
  }

  console.log(`   • ${TEAMS.length} equipos con plantilla y 6 partidos cada uno (3 jugados, 3 por jugar)`);
};
