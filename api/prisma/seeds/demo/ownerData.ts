import { PrismaClient } from '@prisma/client';

interface OwnerContext {
  prisma: PrismaClient;
  seasonId: string;
}

/** Partidos de análisis de ejemplo: uno rápido completado y uno extenso programado con plan de juego. */
export const createAnalysisMatches = async ({ prisma, seasonId }: OwnerContext, playerId: string) => {
  await prisma.manualMatch.create({
    data: {
      userId: playerId,
      seasonId,
      opponentName: 'Ma Long',
      location: 'Casa',
      matchType: 'Amistoso',
      format: 'Individual',
      date: new Date(),
      analysisType: 'Rapido',
      status: 'Completado',
      setsToWin: 3,
      mySets: 3,
      opponentSets: 1,
      lightNotes:
        'Buen partido. Me ha costado leer sus saques de picos, pero he dominado con el Topspin.',
      setScores: [
        { myScore: 11, oppScore: 8 },
        { myScore: 9, oppScore: 11 },
        { myScore: 12, oppScore: 10 },
        { myScore: 11, oppScore: 7 },
      ],
    },
  });

  await prisma.manualMatch.create({
    data: {
      userId: playerId,
      seasonId,
      opponentName: 'Fan Zhendong',
      opponentHand: 'Diestro',
      opponentStyle: 'Ofensivo',
      location: 'Fuera',
      matchType: 'Competicion',
      format: 'Individual',
      date: new Date(),
      analysisType: 'Extenso',
      status: 'Programado',
      setsToWin: 4, // Al mejor de 7
      planningNotes: JSON.stringify({
        myServe: 'Saques cortos al medio sin efecto para evitar su banana flip.',
        theirServe: 'Picar largo al revés rápido si saca lateral.',
        strategy: 'No entrar en el peloteo largo de revés, pivotar siempre que sea posible.',
      }),
    },
  });
};

const CATALOG = [
  {
    name: 'A: Saque Corto | B: Corta Largo',
    description: 'Saque con mucho efecto abajo, el rival corta largo a la derecha.',
    objective: 'Mejorar la apertura de topspin tras un saque corto.',
    category: 'Recepciones_Cortas',
  },
  {
    name: 'A: Topspin Derecha | B: Bloqueo Centro',
    description: 'Apertura de topspin a la derecha, el rival bloquea pasivo al medio.',
    objective: 'Consistencia en el primer ataque fuerte.',
    category: 'Bloqueo_Contraataque',
  },
  {
    name: 'A: Topspin Cruzado | B: Bloqueo Paralelo',
    description: 'Topspin fuerte cruzado, el rival intenta un bloqueo activo paralelo.',
    objective: 'Recuperación de posición tras el ataque.',
    category: 'Bloqueo_Contraataque',
  },
  {
    name: 'Multibolas: Movilidad Pivot',
    description: 'El entrenador lanza bolas alternas a revés y centro. Pivotar para pegar de derecha.',
    objective: 'Velocidad de piernas para evitar el bloqueo al codo.',
    category: 'Movilidad_Pivot',
  },
] as const;

/**
 * Catálogo base de ejercicios del club demo. Pertenece al club (no es global) y se
 * reutiliza por nombre, de modo que repetir el seed no lo duplica.
 */
export const ensureExerciseCatalog = async (prisma: PrismaClient, clubId: string) => {
  const exercises = [];
  for (const item of CATALOG) {
    const existing = await prisma.exercise.findFirst({ where: { clubId, name: item.name } });
    exercises.push(existing ?? (await prisma.exercise.create({ data: { ...item, clubId } })));
  }
  return exercises;
};

/** Partido manual reciente (para el winrate), su macrociclo de 4 semanas y las 8 sesiones. */
export const createPersonalPlan = async (
  { prisma, seasonId }: OwnerContext,
  playerId: string,
  catExercises: { id: string }[],
) => {
  await prisma.manualMatch.create({
    data: {
      userId: playerId,
      seasonId,
      date: new Date(Date.now() - 86400000 * 2), // Hace 2 días
      location: 'Casa',
      matchType: 'Amistoso',
      format: 'Individual',
      opponentName: 'Rival de Pruebas',
      opponentHand: 'Diestro',
      opponentStyle: 'Ofensivo',
      mySets: 3,
      opponentSets: 1,
      status: 'Completado',
      analysisType: 'Rapido',
      lightNotes: 'Buen partido, pero fallé muchos restos cortos.',
      setScores: [
        { myScore: 11, oppScore: 8 },
        { myScore: 9, oppScore: 11 },
        { myScore: 12, oppScore: 10 },
        { myScore: 11, oppScore: 5 },
      ],
    },
  });

  // Las estadísticas de ese partido manual.
  await prisma.stats.update({
    where: { userId_seasonId: { userId: playerId, seasonId } },
    data: {
      manualMatchWon: 1,
      manualSetWon: 3,
      manualSetLost: 1,
      manualPointWon: 43,
      manualPointLost: 34,
    },
  });

  const plan = await prisma.playerTraining.create({
    data: {
      playerId,
      seasonId,
      strengths: 'Topspin de derecha pesado',
      weaknesses: 'Juego corto y recepciones de revés',
      objectives: 'Mejorar el pivot y la anticipación al bloqueo',
      sessionsPerWeek: 2,
      weeks: 4,
      status: 'Activo',
      startDate: new Date(), // Empieza hoy
    },
  });

  for (let i = 0; i < 8; i++) {
    const sessionDate = new Date();
    sessionDate.setDate(sessionDate.getDate() + i * 3); // Una sesión cada 3 días

    const session = await prisma.trainingSession.create({
      data: { playerId, playerTrainingId: plan.id, date: sessionDate },
    });

    // Las dos primeras sesiones llevan ejercicios para que haya datos visibles hoy.
    if (i < 2) {
      await prisma.sessionExercise.createMany({
        data: [
          {
            trainingSessionId: session.id,
            exerciseId: catExercises[0].id,
            durationMinutes: 10,
            completed: i === 0, // La primera la marcamos completada
          },
          {
            trainingSessionId: session.id,
            exerciseId: catExercises[1].id,
            durationMinutes: 15,
            completed: false,
          },
          {
            trainingSessionId: session.id,
            exerciseId: catExercises[2].id,
            durationMinutes: 15,
            sets: 3,
            reps: 20,
            completed: false,
          },
          {
            trainingSessionId: session.id,
            exerciseId: catExercises[3].id,
            durationMinutes: 20,
            sets: 5,
            reps: 10,
            completed: false,
          },
        ],
      });
    }
  }
};
