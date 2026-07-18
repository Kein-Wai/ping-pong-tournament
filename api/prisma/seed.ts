import { PrismaClient, TypeUser } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BYE_USER_ID = '00000000-0000-0000-0000-000000000000';
const TBD_USER_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

async function main() {
  console.log('🧹 Limpiando datos de torneos y clubes anteriores para evitar duplicados...');
  await prisma.match.deleteMany();
  await prisma.tournamentKnockout.deleteMany();
  await prisma.tournamentParticipant.deleteMany();

  await prisma.tournamentClas.deleteMany();
  await prisma.tournamentGroupClas.deleteMany();
  await prisma.tournamentGroup.deleteMany();
  await prisma.tournament.deleteMany();

  await prisma.stats.deleteMany();
  await prisma.user.deleteMany();

  await prisma.club.deleteMany();

  console.log('🌱 Iniciando el proceso de Seed Multi-tenant...');

  // --- 1. ROLES ---
  const types = [
    { name: TypeUser.SuperAdmin },
    { name: TypeUser.AdminClub },
    { name: TypeUser.Player },
  ];
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
  const superAdminRoleId = savedTypes[0].id;
  const adminClubRoleId = savedTypes[1].id;
  const playerRoleId = savedTypes[2].id;

  // --- 2. CREACIÓN DE CLUBES ---
  console.log('🏢 Generando Clubes...');
  const clubA = await prisma.club.create({
    data: { name: 'Club Tenis de Mesa Castellón', status: 'Aprobado' },
  });

  const clubB = await prisma.club.create({
    data: { name: 'PingPong Club Valencia', status: 'Aprobado' },
  });

  // --- 3. CREACIÓN DE ADMINISTRADORES ---
  const hashedPasswordSuper = await bcrypt.hash('112233cheung', 10);
  await prisma.user.create({
    data: {
      email: 'keinwai@hotmail.com',
      name: 'Kein-Wai',
      surname: 'Cheung',
      nickname: 'Quinguaichun',
      userTypeId: superAdminRoleId,
      password: hashedPasswordSuper,
      authProvider: 'LOCAL',
    },
  });

  const hashedPasswordClub = await bcrypt.hash('112233club', 10);

  const adminA = await prisma.user.create({
    data: {
      email: 'admin@castellon.local',
      name: 'Admin',
      surname: 'Castellón',
      userTypeId: adminClubRoleId,
      password: hashedPasswordClub,
      clubId: clubA.id,
      clubStatus: 'Aprobado',
      authProvider: 'LOCAL',
    },
  });

  const adminB = await prisma.user.create({
    data: {
      email: 'admin@valencia.local',
      name: 'Admin',
      surname: 'Valencia',
      userTypeId: adminClubRoleId,
      password: hashedPasswordClub,
      clubId: clubB.id,
      clubStatus: 'Aprobado',
      authProvider: 'LOCAL',
    },
  });

  console.log('====================================================');
  console.log(`👤 Admin Club A (Castellón): ${adminA.email} | PW: 112233club`);
  console.log(`👤 Admin Club B (Valencia):  ${adminB.email} | PW: 112233club`);
  console.log('====================================================');

  // --- 4. JUGADORES ESPECIALES ---
  await prisma.user.upsert({
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

  await prisma.user.upsert({
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

  // --- 5. CREAR 60 JUGADORES (40 Club A / 20 Club B) ---
  console.log('👥 Generando 60 jugadores y distribuyéndolos...');
  const playersClubA = [];
  const playersClubB = [];

  for (let i = 1; i <= 60; i++) {
    const startingElo = Math.floor(400 + i * 20);
    const assignedClub = i <= 40 ? clubA.id : clubB.id;

    const p = await prisma.user.create({
      data: {
        email: `jugador${i}@pingpong.local`,
        name: `Jugador`,
        surname: `${i}`,
        userTypeId: playerRoleId,
        clubId: assignedClub,
        clubStatus: 'Aprobado',
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

    if (i <= 40) playersClubA.push(p);
    else playersClubB.push(p);
  }

  const sortedA = [...playersClubA].sort((a, b) => (b.stats?.elo || 0) - (a.stats?.elo || 0));
  const sortedB = [...playersClubB].sort((a, b) => (b.stats?.elo || 0) - (a.stats?.elo || 0));

  // --- 6. MOTOR DE SIMULACIÓN DE PARTIDOS ---
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
    const setScores: { s1: number; s2: number }[] = [];

    while (p1SetsWon < 3 && p2SetsWon < 3) {
      const p1WinsThisSet = Math.random() > 0.5;
      const isDeuce = Math.random() > 0.85;
      let s1 = 0,
        s2 = 0;

      if (isDeuce) {
        const base = 10 + Math.floor(Math.random() * 3);
        s1 = p1WinsThisSet ? base + 2 : base;
        s2 = p1WinsThisSet ? base : base + 2;
      } else {
        const loserScore = Math.floor(Math.random() * 9);
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

    const createdMatch = await prisma.match.create({
      data: {
        dateStart: new Date(),
        tournamentId,
        groupId,
        knockoutId,
        matchOrder,
        playerOneId: p1Id,
        playerTwoId: p2Id,
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
  // TORNEO 1: CLUB A - COMPLETADO (32 JUGADORES)
  // ============================================================================
  console.log('\n🏆 Generando Torneo 1 (Club A | Completado - 32 Jugadores)...');
  const t1Players = sortedA.slice(0, 32);

  const t1 = await prisma.tournament.create({
    data: {
      name: 'Grand Slam Castellón 2026',
      dateStart: new Date(),
      clubId: clubA.id,
      numPlayers: 32,
      numGroup: 8,
      numGroupPlayers: 4,
      typeTournament: 'Interno',
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

      // Registrar clasificación de los eliminados en grupos (3ro y 4to)
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

  const kOctavosT1 = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t1.id, round: 'Octavos', status: 'Completado' },
  });
  const kCuartosT1 = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t1.id, round: 'Cuartos', status: 'Completado' },
  });
  const kSemisT1 = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t1.id, round: 'Semifinales', status: 'Completado' },
  });
  const kFinalT1 = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t1.id, round: 'Final', status: 'Completado' },
  });

  const bracket16 = [0, 15, 7, 8, 4, 11, 3, 12, 2, 13, 5, 10, 6, 9, 1, 14];

  const octavosMatchesT1 = [];
  for (let i = 0; i < 16; i += 2) {
    const res = await simulateAndSaveMatch(
      t1.id,
      advancingT1[bracket16[i]],
      advancingT1[bracket16[i + 1]],
      null,
      kOctavosT1.id,
      null,
      null,
      i / 2,
    );
    octavosMatchesT1.push(res);
    await prisma.tournamentClas.create({
      data: { tournamentId: t1.id, playerId: res.loser, lastRound: 'Octavos', position: 9 },
    });
  }

  const cuartosMatchesT1 = [];
  for (let i = 0; i < 8; i += 2) {
    const res = await simulateAndSaveMatch(
      t1.id,
      octavosMatchesT1[i].winner,
      octavosMatchesT1[i + 1].winner,
      null,
      kCuartosT1.id,
      null,
      null,
      i / 2,
    );
    cuartosMatchesT1.push(res);
    await prisma.match.update({
      where: { id: octavosMatchesT1[i].matchId },
      data: { winnerGoesToMatchId: res.matchId },
    });
    await prisma.match.update({
      where: { id: octavosMatchesT1[i + 1].matchId },
      data: { winnerGoesToMatchId: res.matchId },
    });
    await prisma.tournamentClas.create({
      data: { tournamentId: t1.id, playerId: res.loser, lastRound: 'Cuartos', position: 5 },
    });
  }

  const semisMatchesT1 = [];
  for (let i = 0; i < 4; i += 2) {
    const res = await simulateAndSaveMatch(
      t1.id,
      cuartosMatchesT1[i].winner,
      cuartosMatchesT1[i + 1].winner,
      null,
      kSemisT1.id,
      null,
      null,
      i / 2,
    );
    semisMatchesT1.push(res);
    await prisma.match.update({
      where: { id: cuartosMatchesT1[i].matchId },
      data: { winnerGoesToMatchId: res.matchId },
    });
    await prisma.match.update({
      where: { id: cuartosMatchesT1[i + 1].matchId },
      data: { winnerGoesToMatchId: res.matchId },
    });
    await prisma.tournamentClas.create({
      data: { tournamentId: t1.id, playerId: res.loser, lastRound: 'Semifinales', position: 3 },
    });
  }

  const finalMatchT1 = await simulateAndSaveMatch(
    t1.id,
    semisMatchesT1[0].winner,
    semisMatchesT1[1].winner,
    null,
    kFinalT1.id,
    null,
    null,
    0,
  );
  await prisma.match.update({
    where: { id: semisMatchesT1[0].matchId },
    data: { winnerGoesToMatchId: finalMatchT1.matchId },
  });
  await prisma.match.update({
    where: { id: semisMatchesT1[1].matchId },
    data: { winnerGoesToMatchId: finalMatchT1.matchId },
  });

  await prisma.stats.update({
    where: { userId: finalMatchT1.winner },
    data: { tournamentWon: { increment: 1 } },
  });

  await prisma.tournamentClas.create({
    data: { tournamentId: t1.id, playerId: finalMatchT1.loser, lastRound: 'Final', position: 2 },
  });
  await prisma.tournamentClas.create({
    data: { tournamentId: t1.id, playerId: finalMatchT1.winner, lastRound: 'Final', position: 1 },
  });

  // ============================================================================
  // TORNEO 2: CLUB A - PROGRAMADO (18 INCRITOS)
  // ============================================================================
  console.log('\n📅 Generando Torneo 2 (Club A | Programado - 18/32 Inscritos)...');
  const t2 = await prisma.tournament.create({
    data: {
      name: 'Challenger Castellón de Otoño',
      dateStart: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      clubId: clubA.id,
      numPlayers: 32,
      numGroup: 8,
      numGroupPlayers: 4,
      typeTournament: 'Abierto', // Permitirá que lo vean de otros clubes
      levelTournament: 'Intermedio',
      rounds: 'GruposKnockout',
      status: 'Programado',
      typeKnockout: 'LlaveA',
      sortGroups: 'Snake',
      groupsCreated: false,
      knockoutCreated: false,
    },
  });

  const t2Players = sortedA.slice(15, 33); // Metemos a 18 jugadores del Club A
  for (const p of t2Players) {
    await prisma.tournamentParticipant.create({
      data: { tournamentId: t2.id, playerId: p.id, status: 'Confirmado' },
    });
  }

  // ============================================================================
  // TORNEO 3: CLUB B - EN JUEGO (CUARTOS DE FINAL)
  // ============================================================================
  console.log('\n🔥 Generando Torneo 3 (Club B | En Juego - Cuartos de Final)...');
  const t3Players = sortedB.slice(0, 16); // 16 jugadores del Club B

  const t3 = await prisma.tournament.create({
    data: {
      name: 'Masters 1000 Valencia',
      dateStart: new Date(new Date().setDate(new Date().getDate() - 2)),
      clubId: clubB.id,
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

      // Registrar eliminados en fase de grupos T3
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

  const t3CuartosKnockout = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t3.id, round: 'Cuartos', status: 'Programado' },
  });
  const t3SemisKnockout = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t3.id, round: 'Semifinales', status: 'Programado' },
  });
  const t3FinalKnockout = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t3.id, round: 'Final', status: 'Programado' },
  });

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

  const bracket8 = [0, 7, 3, 4, 2, 5, 1, 6];
  for (let i = 0; i < 8; i += 2) {
    const matchOrder = i / 2;
    await prisma.match.create({
      data: {
        dateStart: new Date(),
        tournamentId: t3.id,
        knockoutId: t3CuartosKnockout.id,
        playerOneId: advancingT3[bracket8[i]],
        playerTwoId: advancingT3[bracket8[i + 1]],
        status: 'Programado',
        matchOrder: matchOrder,
        winnerGoesToMatchId: t3SemisMatches[Math.floor(matchOrder / 2)].id,
      },
    });
  }

  // ============================================================================
  // TORNEO 4: CLUB B - COMPLETADO (16 JUGADORES)
  // ============================================================================
  console.log('\n🏆 Generando Torneo 4 (Club B | Completado - 16 Jugadores)...');
  const t4Players = sortedB.slice(4, 20); // Cogemos a los 16 restantes

  const t4 = await prisma.tournament.create({
    data: {
      name: 'Liga de Primavera Valencia',
      dateStart: new Date(),
      clubId: clubB.id,
      numPlayers: 16,
      numGroup: 4,
      numGroupPlayers: 4,
      typeTournament: 'Interno',
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

  for (const p of t4Players) {
    await prisma.tournamentParticipant.create({
      data: { tournamentId: t4.id, playerId: p.id, status: 'Confirmado' },
    });
  }

  const t4Groups = [];
  for (let i = 1; i <= 4; i++) {
    t4Groups.push(
      await prisma.tournamentGroup.create({
        data: { tournamentId: t4.id, group: i, status: 'Completado' },
      }),
    );
  }

  const snakeGroupsT4: any[][] = Array.from({ length: 4 }, () => []);
  for (let i = 0; i < t4Players.length; i++) {
    const cycle = Math.floor(i / 4);
    const index = cycle % 2 === 0 ? i % 4 : 3 - (i % 4);
    snakeGroupsT4[index].push(t4Players[i]);
  }

  for (let g = 0; g < 4; g++) {
    const groupDb = t4Groups[g];
    const groupPlayers = snakeGroupsT4[g];
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
          t4.id,
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

  const advancingT4 = [];
  for (const g of t4Groups) {
    const clas = await prisma.tournamentGroupClas.findMany({
      where: { tournamentGroupId: g.id },
      orderBy: [{ pointsClas: 'desc' }, { setsWon: 'desc' }],
    });
    for (let pos = 0; pos < clas.length; pos++) {
      await prisma.tournamentGroupClas.update({
        where: { id: clas[pos].id },
        data: { position: pos + 1 },
      });

      // NUEVO: Registrar eliminados en fase de grupos T4
      if (pos >= 2) {
        await prisma.tournamentClas.create({
          data: {
            tournamentId: t4.id,
            playerId: clas[pos].playerId,
            position: pos === 2 ? 9 : 13,
          },
        });
      }
    }
    advancingT4.push(clas[0].playerId, clas[1].playerId);
  }

  const kCuartosT4 = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t4.id, round: 'Cuartos', status: 'Completado' },
  });
  const kSemisT4 = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t4.id, round: 'Semifinales', status: 'Completado' },
  });
  const kFinalT4 = await prisma.tournamentKnockout.create({
    data: { type: 'A', tournamentId: t4.id, round: 'Final', status: 'Completado' },
  });

  const cuartosMatchesT4 = [];
  for (let i = 0; i < 8; i += 2) {
    const res = await simulateAndSaveMatch(
      t4.id,
      advancingT4[bracket8[i]],
      advancingT4[bracket8[i + 1]],
      null,
      kCuartosT4.id,
      null,
      null,
      i / 2,
    );
    cuartosMatchesT4.push(res);

    // NUEVO: Registrar perdedores en Cuartos de T4
    await prisma.tournamentClas.create({
      data: { tournamentId: t4.id, playerId: res.loser, lastRound: 'Cuartos', position: 5 },
    });
  }

  const semisMatchesT4 = [];
  for (let i = 0; i < 4; i += 2) {
    const res = await simulateAndSaveMatch(
      t4.id,
      cuartosMatchesT4[i].winner,
      cuartosMatchesT4[i + 1].winner,
      null,
      kSemisT4.id,
      null,
      null,
      i / 2,
    );
    semisMatchesT4.push(res);
    await prisma.match.update({
      where: { id: cuartosMatchesT4[i].matchId },
      data: { winnerGoesToMatchId: res.matchId },
    });
    await prisma.match.update({
      where: { id: cuartosMatchesT4[i + 1].matchId },
      data: { winnerGoesToMatchId: res.matchId },
    });

    // NUEVO: Registrar perdedores en Semis de T4
    await prisma.tournamentClas.create({
      data: { tournamentId: t4.id, playerId: res.loser, lastRound: 'Semifinales', position: 3 },
    });
  }

  const finalMatchT4 = await simulateAndSaveMatch(
    t4.id,
    semisMatchesT4[0].winner,
    semisMatchesT4[1].winner,
    null,
    kFinalT4.id,
    null,
    null,
    0,
  );
  await prisma.match.update({
    where: { id: semisMatchesT4[0].matchId },
    data: { winnerGoesToMatchId: finalMatchT4.matchId },
  });
  await prisma.match.update({
    where: { id: semisMatchesT4[1].matchId },
    data: { winnerGoesToMatchId: finalMatchT4.matchId },
  });

  // NUEVO: Registrar clasificación del ganador y perdedor de la final de T4
  await prisma.tournamentClas.create({
    data: { tournamentId: t4.id, playerId: finalMatchT4.loser, lastRound: 'Final', position: 2 },
  });
  await prisma.tournamentClas.create({
    data: { tournamentId: t4.id, playerId: finalMatchT4.winner, lastRound: 'Final', position: 1 },
  });

  // NUEVO: Sumar torneo ganado al jugador victorioso de T4
  await prisma.stats.update({
    where: { userId: finalMatchT4.winner },
    data: { tournamentWon: { increment: 1 } },
  });

  console.log(
    '\n✅ Base de datos "sembrada" con éxito. ¡Todo listo para probar el Frontend Multi-tenant!',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
