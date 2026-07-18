import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BYE_USER_ID = '00000000-0000-0000-0000-000000000000';
const TBD_USER_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

async function main() {
  console.log('🧹 Limpiando datos de torneos anteriores para evitar duplicados...');
  await prisma.match.deleteMany();
  await prisma.tournamentKnockout.deleteMany();
  await prisma.tournamentParticipant.deleteMany();

  await prisma.tournamentClas.deleteMany();
  await prisma.tournamentGroupClas.deleteMany();
  await prisma.tournamentGroup.deleteMany();
  await prisma.tournament.deleteMany();

  await prisma.stats.deleteMany();

  await prisma.user.deleteMany();
  console.log('🌱 Iniciando el proceso de Seed...');

  // --- 1. ROLES ---
  const types = [{ name: 'Admin' }, { name: 'Player' }];
  let savedTypes = [];

  for (const type of types) {
    savedTypes.push(
      await prisma.userType.upsert({
        where: { name: type.name },
        update: {},
        create: type,
      }),
    );
  }
  const playerRoleId = savedTypes[1].id;

  // --- 2. JUGADORES ESPECIALES ---
  const byeUser = await prisma.user.upsert({
    where: { id: BYE_USER_ID },
    update: {},
    create: {
      id: BYE_USER_ID,
      email: 'exento@torneo.local',
      name: 'EXENTO',
      surname: '(Pasa de ronda)',
      userTypeId: playerRoleId,
    },
  });

  const tbdUser = await prisma.user.upsert({
    where: { id: TBD_USER_ID },
    update: {},
    create: {
      id: TBD_USER_ID,
      email: 'tbd@torneo.local',
      name: 'Por',
      surname: 'Determinar',
      userTypeId: playerRoleId,
    },
  });

  // --- 3. CREAR 60 JUGADORES ---
  console.log('👥 Generando 60 jugadores...');
  const createdPlayers = [];
  for (let i = 1; i <= 60; i++) {
    const startingElo = Math.floor(400 + i * 20);

    const p = await prisma.user.create({
      data: {
        email: `jugador${i}@pingpong.local`,
        name: `Jugador`,
        surname: `${i}`,
        userTypeId: playerRoleId,
        stats: {
          create: {
            elo: startingElo,
            matchWon: 0,
            matchLost: 0,
            setWon: 0,
            setLost: 0,
            pointWon: 0,
            pointLost: 0,
            tournamentWon: 0,
            tournamentLost: 0,
          },
        },
      },
      include: { stats: true },
    });
    createdPlayers.push(p);
  }

  const sortedPlayersDesc = [...createdPlayers].sort(
    (a, b) => (b.stats?.elo || 0) - (a.stats?.elo || 0),
  );

  // --- 4. MOTOR DE SIMULACIÓN DE PARTIDOS (NUEVO Y REALISTA) ---
  async function simulateAndSaveMatch(
    tournamentId: string,
    p1Id: string,
    p2Id: string,
    groupId: string | null = null,
    knockoutId: string | null = null,
    clas1Id: string | null = null,
    clas2Id: string | null = null,
    matchOrder: number = 0,
  ) {
    let p1SetsWon = 0;
    let p2SetsWon = 0;
    let ptsP1 = 0;
    let ptsP2 = 0;

    // Almacenamos el resultado de cada set jugado
    const setScores: { s1: number; s2: number }[] = [];

    // Jugar al mejor de 5 (el primero que llegue a 3 sets gana)
    while (p1SetsWon < 3 && p2SetsWon < 3) {
      const p1WinsThisSet = Math.random() > 0.5;
      const isDeuce = Math.random() > 0.85; // 15% de probabilidad de irse a desempate (ventaja)
      let s1 = 0,
        s2 = 0;

      if (isDeuce) {
        // Desempates como 12-10, 13-11, 14-12
        const base = 10 + Math.floor(Math.random() * 3);
        s1 = p1WinsThisSet ? base + 2 : base;
        s2 = p1WinsThisSet ? base : base + 2;
      } else {
        // Resultados normales (ej. 11-5, 11-8)
        const loserScore = Math.floor(Math.random() * 9); // del 0 al 8
        s1 = p1WinsThisSet ? 11 : loserScore;
        s2 = p1WinsThisSet ? loserScore : 11;
      }

      setScores.push({ s1, s2 });
      ptsP1 += s1;
      ptsP2 += s2;

      if (p1WinsThisSet) p1SetsWon++;
      else p2SetsWon++;
    }

    const p1WinsMatch = p1SetsWon === 3;

    // 1. Guardar Partido con resultados reales
    const createdMatch = await prisma.match.create({
      data: {
        dateStart: new Date(),
        tournamentId,
        groupId,
        knockoutId,
        matchOrder,
        playerOneId: p1Id,
        playerTwoId: p2Id,
        // Asignamos los sets jugados, los que no se jugaron quedan en 0
        setOnePlayerOne: setScores[0]?.s1 ?? 0,
        setOnePlayerTwo: setScores[0]?.s2 ?? 0,
        setTwoPlayerOne: setScores[1]?.s1 ?? 0,
        setTwoPlayerTwo: setScores[1]?.s2 ?? 0,
        setThreePlayerOne: setScores[2]?.s1 ?? 0,
        setThreePlayerTwo: setScores[2]?.s2 ?? 0,
        setFourPlayerOne: setScores[3]?.s1 ?? 0,
        setFourPlayerTwo: setScores[3]?.s2 ?? 0,
        setFivePlayerOne: setScores[4]?.s1 ?? 0,
        setFivePlayerTwo: setScores[4]?.s2 ?? 0,
        status: 'Completado',
      },
    });

    // 2. Actualizar Stats Globales del Usuario
    await prisma.stats.update({
      where: { userId: p1Id },
      data: {
        matchWon: { increment: p1WinsMatch ? 1 : 0 },
        matchLost: { increment: p1WinsMatch ? 0 : 1 },
        setWon: { increment: p1SetsWon },
        setLost: { increment: p2SetsWon },
        pointWon: { increment: ptsP1 },
        pointLost: { increment: ptsP2 },
      },
    });

    await prisma.stats.update({
      where: { userId: p2Id },
      data: {
        matchWon: { increment: p1WinsMatch ? 0 : 1 },
        matchLost: { increment: p1WinsMatch ? 1 : 0 },
        setWon: { increment: p2SetsWon },
        setLost: { increment: p1SetsWon },
        pointWon: { increment: ptsP2 },
        pointLost: { increment: ptsP1 },
      },
    });

    // 3. Actualizar Clasificación del Grupo
    if (groupId && clas1Id && clas2Id) {
      await prisma.tournamentGroupClas.update({
        where: { id: clas1Id },
        data: {
          played: { increment: 1 },
          gamesWon: { increment: p1WinsMatch ? 1 : 0 },
          gamesLost: { increment: p1WinsMatch ? 0 : 1 },
          setsWon: { increment: p1SetsWon },
          setsLost: { increment: p2SetsWon },
          pointsWon: { increment: ptsP1 },
          pointsLost: { increment: ptsP2 },
          pointsClas: { increment: p1WinsMatch ? 3 : 0 },
        },
      });
      await prisma.tournamentGroupClas.update({
        where: { id: clas2Id },
        data: {
          played: { increment: 1 },
          gamesWon: { increment: p1WinsMatch ? 0 : 1 },
          gamesLost: { increment: p1WinsMatch ? 1 : 0 },
          setsWon: { increment: p2SetsWon },
          setsLost: { increment: p1SetsWon },
          pointsWon: { increment: ptsP2 },
          pointsLost: { increment: ptsP1 },
          pointsClas: { increment: p1WinsMatch ? 0 : 3 },
        },
      });
    }

    return {
      matchId: createdMatch.id,
      winner: p1WinsMatch ? p1Id : p2Id,
      loser: p1WinsMatch ? p2Id : p1Id,
    };
  }

  // ============================================================================
  // TORNEO 1: COMPLETADO (32 JUGADORES)
  // ============================================================================
  console.log('\n🏆 Generando Torneo 1 (Completado - 32 Jugadores)...');
  const t1Players = sortedPlayersDesc.slice(0, 32);

  const t1 = await prisma.tournament.create({
    data: {
      name: 'Grand Slam de Verano 2026',
      dateStart: new Date(),
      numPlayers: 32,
      numGroup: 8,
      numGroupPlayers: 4,
      typeTournament: 'Abierto',
      levelTournament: 'Avanzado',
      rounds: 'GruposKnockout',
      status: 'Completado',
      typeKnockout: 'LlaveA',
      sortGroups: 'Snake',
      sortKnockout: 'Siembra',
      groupsCreated: true,
      knockoutCreated: true,
    },
  });

  for (const p of t1Players) {
    await prisma.tournamentParticipant.create({
      data: { tournamentId: t1.id, playerId: p.id, status: 'Confirmado' },
    });
  }

  const t1Groups = [];
  for (let i = 1; i <= 8; i++) {
    t1Groups.push(
      await prisma.tournamentGroup.create({
        data: { tournamentId: t1.id, group: i, status: 'Completado' },
      }),
    );
  }

  const snakeGroupsT1: any[][] = Array.from({ length: 8 }, () => []);
  for (let i = 0; i < t1Players.length; i++) {
    const cycle = Math.floor(i / 8);
    const index = cycle % 2 === 0 ? i % 8 : 7 - (i % 8);
    snakeGroupsT1[index].push(t1Players[i]);
  }

  console.log('   ⚔️ Simulando fase de grupos T1...');
  for (let g = 0; g < 8; g++) {
    const groupDb = t1Groups[g];
    const groupPlayers = snakeGroupsT1[g];

    const clasRecords = [];
    for (const p of groupPlayers) {
      const c = await prisma.tournamentGroupClas.create({
        data: { tournamentGroupId: groupDb.id, playerId: p.id },
      });
      clasRecords.push({ playerId: p.id, clasId: c.id });
    }

    for (let i = 0; i < groupPlayers.length; i++) {
      for (let j = i + 1; j < groupPlayers.length; j++) {
        await simulateAndSaveMatch(
          t1.id,
          groupPlayers[i].id,
          groupPlayers[j].id,
          groupDb.id,
          null,
          clasRecords[i].clasId,
          clasRecords[j].clasId,
        );
      }
    }
  }

  const advancingT1 = [];
  for (const g of t1Groups) {
    const clas = await prisma.tournamentGroupClas.findMany({
      where: { tournamentGroupId: g.id },
      orderBy: [{ pointsClas: 'desc' }, { setsWon: 'desc' }],
    });
    for (let pos = 0; pos < clas.length; pos++) {
      await prisma.tournamentGroupClas.update({
        where: { id: clas[pos].id },
        data: { position: pos + 1 },
      });

      if (pos >= 2) {
        await prisma.tournamentClas.create({
          data: {
            tournamentId: t1.id,
            playerId: clas[pos].playerId,
            position: pos === 2 ? 17 : 25,
          },
        });
      }
    }
    advancingT1.push(clas[0].playerId, clas[1].playerId);
  }

  console.log('   ⚔️ Simulando Eliminatorias Sembradas y Conectadas T1...');
  const kOctavos = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t1.id, round: 'Octavos', status: 'Completado' },
  });
  const kCuartos = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t1.id, round: 'Cuartos', status: 'Completado' },
  });
  const kSemis = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t1.id, round: 'Semifinales', status: 'Completado' },
  });
  const kFinal = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t1.id, round: 'Final', status: 'Completado' },
  });

  const bracket16 = [0, 15, 7, 8, 4, 11, 3, 12, 2, 13, 5, 10, 6, 9, 1, 14];

  // OCTAVOS
  const octavosMatches = [];
  for (let i = 0; i < 16; i += 2) {
    const res = await simulateAndSaveMatch(
      t1.id,
      advancingT1[bracket16[i]],
      advancingT1[bracket16[i + 1]],
      null,
      kOctavos.id,
      null,
      null,
      i / 2,
    );
    octavosMatches.push(res);

    await prisma.tournamentClas.create({
      data: { tournamentId: t1.id, playerId: res.loser, lastRound: 'Octavos', position: 9 },
    });
  }

  // CUARTOS (Y conectamos Octavos hacia Cuartos)
  const cuartosMatches = [];
  for (let i = 0; i < 8; i += 2) {
    const res = await simulateAndSaveMatch(
      t1.id,
      octavosMatches[i].winner,
      octavosMatches[i + 1].winner,
      null,
      kCuartos.id,
      null,
      null,
      i / 2,
    );
    cuartosMatches.push(res);

    await prisma.match.update({
      where: { id: octavosMatches[i].matchId },
      data: { winnerGoesToMatchId: res.matchId },
    });
    await prisma.match.update({
      where: { id: octavosMatches[i + 1].matchId },
      data: { winnerGoesToMatchId: res.matchId },
    });

    await prisma.tournamentClas.create({
      data: { tournamentId: t1.id, playerId: res.loser, lastRound: 'Cuartos', position: 5 },
    });
  }

  // SEMIS (Y conectamos Cuartos hacia Semis)
  const semisMatches = [];
  for (let i = 0; i < 4; i += 2) {
    const res = await simulateAndSaveMatch(
      t1.id,
      cuartosMatches[i].winner,
      cuartosMatches[i + 1].winner,
      null,
      kSemis.id,
      null,
      null,
      i / 2,
    );
    semisMatches.push(res);

    await prisma.match.update({
      where: { id: cuartosMatches[i].matchId },
      data: { winnerGoesToMatchId: res.matchId },
    });
    await prisma.match.update({
      where: { id: cuartosMatches[i + 1].matchId },
      data: { winnerGoesToMatchId: res.matchId },
    });

    await prisma.tournamentClas.create({
      data: { tournamentId: t1.id, playerId: res.loser, lastRound: 'Semifinales', position: 3 },
    });
  }

  // FINAL (Y conectamos Semis hacia Final)
  const finalMatch = await simulateAndSaveMatch(
    t1.id,
    semisMatches[0].winner,
    semisMatches[1].winner,
    null,
    kFinal.id,
    null,
    null,
    0,
  );

  await prisma.match.update({
    where: { id: semisMatches[0].matchId },
    data: { winnerGoesToMatchId: finalMatch.matchId },
  });
  await prisma.match.update({
    where: { id: semisMatches[1].matchId },
    data: { winnerGoesToMatchId: finalMatch.matchId },
  });

  await prisma.stats.update({
    where: { userId: finalMatch.winner },
    data: { tournamentWon: { increment: 1 } },
  });

  await prisma.tournamentClas.create({
    data: { tournamentId: t1.id, playerId: finalMatch.loser, lastRound: 'Final', position: 2 },
  });
  await prisma.tournamentClas.create({
    data: { tournamentId: t1.id, playerId: finalMatch.winner, lastRound: 'Final', position: 1 },
  });

  // ============================================================================
  // TORNEO 2: PROGRAMADO
  // ============================================================================
  console.log('\n📅 Generando Torneo 2 (Programado - 18/32 Inscritos)...');
  const t2 = await prisma.tournament.create({
    data: {
      name: 'Challenger de Otoño',
      dateStart: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      numPlayers: 32,
      numGroup: 8,
      numGroupPlayers: 4,
      typeTournament: 'Oficial',
      levelTournament: 'Intermedio',
      rounds: 'GruposKnockout',
      status: 'Programado',
      typeKnockout: 'LlaveA',
      sortGroups: 'Snake',
      groupsCreated: false,
      knockoutCreated: false,
    },
  });

  const t2Players = sortedPlayersDesc.slice(32, 50);
  for (const p of t2Players) {
    await prisma.tournamentParticipant.create({
      data: { tournamentId: t2.id, playerId: p.id, status: 'Confirmado' },
    });
  }

  // ============================================================================
  // TORNEO 3: EN JUEGO (CUARTOS DE FINAL)
  // ============================================================================
  console.log('\n🔥 Generando Torneo 3 (En Juego - Cuartos de Final)...');
  const t3Players = sortedPlayersDesc.slice(10, 26);

  const t3 = await prisma.tournament.create({
    data: {
      name: 'Masters 1000 Invierno',
      dateStart: new Date(new Date().setDate(new Date().getDate() - 2)),
      numPlayers: 16,
      numGroup: 4,
      numGroupPlayers: 4,
      typeTournament: 'Interno',
      levelTournament: 'Federado',
      rounds: 'GruposKnockout',
      status: 'Cuartos',
      typeKnockout: 'LlaveA',
      sortGroups: 'Snake',
      sortKnockout: 'Siembra',
      groupsCreated: true,
      knockoutCreated: true,
    },
  });

  for (const p of t3Players) {
    await prisma.tournamentParticipant.create({
      data: { tournamentId: t3.id, playerId: p.id, status: 'Confirmado' },
    });
  }

  const t3Groups = [];
  for (let i = 1; i <= 4; i++) {
    t3Groups.push(
      await prisma.tournamentGroup.create({
        data: { tournamentId: t3.id, group: i, status: 'Completado' },
      }),
    );
  }

  const snakeGroupsT3: any[][] = Array.from({ length: 4 }, () => []);
  for (let i = 0; i < t3Players.length; i++) {
    const cycle = Math.floor(i / 4);
    const index = cycle % 2 === 0 ? i % 4 : 3 - (i % 4);
    snakeGroupsT3[index].push(t3Players[i]);
  }

  console.log('   ⚔️ Simulando fase de grupos T3...');
  for (let g = 0; g < 4; g++) {
    const groupDb = t3Groups[g];
    const groupPlayers = snakeGroupsT3[g];

    const clasRecords = [];
    for (const p of groupPlayers) {
      const c = await prisma.tournamentGroupClas.create({
        data: { tournamentGroupId: groupDb.id, playerId: p.id },
      });
      clasRecords.push({ playerId: p.id, clasId: c.id });
    }

    for (let i = 0; i < groupPlayers.length; i++) {
      for (let j = i + 1; j < groupPlayers.length; j++) {
        await simulateAndSaveMatch(
          t3.id,
          groupPlayers[i].id,
          groupPlayers[j].id,
          groupDb.id,
          null,
          clasRecords[i].clasId,
          clasRecords[j].clasId,
        );
      }
    }
  }

  const advancingT3 = [];
  for (const g of t3Groups) {
    const clas = await prisma.tournamentGroupClas.findMany({
      where: { tournamentGroupId: g.id },
      orderBy: [{ pointsClas: 'desc' }, { setsWon: 'desc' }],
    });
    for (let pos = 0; pos < clas.length; pos++) {
      await prisma.tournamentGroupClas.update({
        where: { id: clas[pos].id },
        data: { position: pos + 1 },
      });

      if (pos >= 2) {
        await prisma.tournamentClas.create({
          data: {
            tournamentId: t3.id,
            playerId: clas[pos].playerId,
            position: pos === 2 ? 9 : 13,
          },
        });
      }
    }
    advancingT3.push(clas[0].playerId, clas[1].playerId);
  }

  console.log('   ⏳ Creando Bracket Completo de Eliminatorias (Programado, T3)...');
  const t3CuartosKnockout = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t3.id, round: 'Cuartos', status: 'Programado' },
  });
  const t3SemisKnockout = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t3.id, round: 'Semifinales', status: 'Programado' },
  });
  const t3FinalKnockout = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t3.id, round: 'Final', status: 'Programado' },
  });

  // 1. Creamos la Final
  const t3FinalMatch = await prisma.match.create({
    data: {
      dateStart: new Date(),
      tournamentId: t3.id,
      knockoutId: t3FinalKnockout.id,
      playerOneId: TBD_USER_ID,
      playerTwoId: TBD_USER_ID,
      status: 'Programado',
      matchOrder: 0,
    },
  });

  // 2. Creamos las Semis conectando a la Final
  const t3SemisMatches = [];
  for (let i = 0; i < 2; i++) {
    const m = await prisma.match.create({
      data: {
        dateStart: new Date(),
        tournamentId: t3.id,
        knockoutId: t3SemisKnockout.id,
        playerOneId: TBD_USER_ID,
        playerTwoId: TBD_USER_ID,
        status: 'Programado',
        matchOrder: i,
        winnerGoesToMatchId: t3FinalMatch.id,
      },
    });
    t3SemisMatches.push(m);
  }

  // 3. Creamos los Cuartos (jugadores reales) conectando a las Semis
  const bracket8 = [0, 7, 3, 4, 2, 5, 1, 6];
  for (let i = 0; i < 8; i += 2) {
    const p1 = advancingT3[bracket8[i]];
    const p2 = advancingT3[bracket8[i + 1]];
    const matchOrder = i / 2;

    await prisma.match.create({
      data: {
        dateStart: new Date(),
        tournamentId: t3.id,
        knockoutId: t3CuartosKnockout.id,
        playerOneId: p1,
        playerTwoId: p2,
        status: 'Programado',
        matchOrder: matchOrder,
        winnerGoesToMatchId: t3SemisMatches[Math.floor(matchOrder / 2)].id,
      },
    });
  }

  console.log('\n✅ Base de datos "sembrada" con éxito. ¡Todo listo para probar el Frontend!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
