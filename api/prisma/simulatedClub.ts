import { PrismaClient, TypeUser } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  createKnockoutDraw,
  saveKnockoutBracket,
  harvestKnockoutPlayers,
  processKnockoutAdvancement,
} from '../src/utils/knockout';
const prisma = new PrismaClient();

const BYE_USER_ID = '00000000-0000-0000-0000-000000000000';
const TBD_USER_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

// Helper para calcular la curva de progresión de Skills
const getGrowth = (stat?: number | null) => {
  const val = stat || 0;
  if (val < 20) return 0.25;
  if (val < 40) return 0.2;
  if (val < 60) return 0.15;
  if (val < 80) return 0.07;
  return 0.01;
};

// Función para inyectar subidas de experiencia tras cada partido de torneo
const addMatchSkillUpdates = async (matchId: string, p1Id: string, p2Id: string) => {
  const updates = [];

  if (p1Id !== BYE_USER_ID && p1Id !== TBD_USER_ID) {
    const p1Skills = await prisma.playerSkills.findFirst({ where: { userId: p1Id } });
    updates.push({
      playerId: p1Id,
      matchId: matchId,
      sourceType: 'Partido' as any,
      status: 'EXPECTED' as any,
      fortalezaMental: getGrowth(p1Skills?.fortalezaMental),
      experiencia: getGrowth(p1Skills?.experiencia),
    });
  }

  if (p2Id !== BYE_USER_ID && p2Id !== TBD_USER_ID) {
    const p2Skills = await prisma.playerSkills.findFirst({ where: { userId: p2Id } });
    updates.push({
      playerId: p2Id,
      matchId: matchId,
      sourceType: 'Partido' as any,
      status: 'EXPECTED' as any,
      fortalezaMental: getGrowth(p2Skills?.fortalezaMental),
      experiencia: getGrowth(p2Skills?.experiencia),
    });
  }

  if (updates.length > 0) {
    await prisma.playerSkillUpdate.createMany({ data: updates });
  }
};

async function main() {
  console.log('🧹 Limpiando base de datos...');
  await prisma.generalTrainingAttendance.deleteMany();
  await prisma.playerSkillUpdate.deleteMany();
  await prisma.generalTraining.deleteMany();
  await prisma.skillUpdateTemplate.deleteMany();
  await prisma.generalTrainingSchedule.deleteMany();

  await prisma.match.deleteMany();
  await prisma.tournamentKnockout.deleteMany();
  await prisma.tournamentParticipant.deleteMany();
  await prisma.tournamentClas.deleteMany();
  await prisma.tournamentGroupClas.deleteMany();
  await prisma.tournamentGroup.deleteMany();
  await prisma.tournament.deleteMany();

  await prisma.stats.deleteMany();
  await prisma.user.deleteMany();
  await prisma.season.deleteMany();
  await prisma.club.deleteMany();

  console.log('🌱 Iniciando Seed Ligero (Testing)...');

  // 1. ROLES DE USUARIO
  const types = [
    { name: TypeUser.SuperAdmin },
    { name: TypeUser.AdminClub },
    { name: TypeUser.Player },
  ];
  let savedTypes = [];
  for (const type of types) {
    savedTypes.push(
      await prisma.userType.upsert({ where: { name: type.name }, update: {}, create: type }),
    );
  }
  const superAdminRoleId = savedTypes[0].id;
  const adminClubRoleId = savedTypes[1].id;
  const playerRoleId = savedTypes[2].id;

  // 2. TEMPORADA ÚNICA (2026/2027)
  console.log('📅 Generando Temporada...');
  const currentSeason = await prisma.season.create({
    data: {
      name: 'Temporada 2026/2027',
      startDate: new Date('2026-08-01T00:00:00Z'),
      endDate: new Date('2027-07-31T23:59:59Z'),
      isCurrent: true,
    },
  });

  // 3. CLUB ÚNICO (Castellón)
  console.log('🏢 Generando Club Castellón...');
  const clubCastellon = await prisma.club.create({
    data: {
      name: 'Club Tenis de Mesa Castellón',
      status: 'Aprobado',
      city: 'Castellon de la Plana',
    },
  });

  // 4. ADMINISTRADORES
  const hashedPassword = await bcrypt.hash('112233cheung', 10);
  await prisma.user.create({
    data: {
      email: 'keinwaisuperadmin@hotmail.com',
      name: 'Kein-Wai',
      surname: 'Cheung',
      nickname: 'SuperAdmin',
      userTypeId: superAdminRoleId,
      password: hashedPassword,
      authProvider: 'LOCAL',
      active: true,
    },
  });

  const adminClub = await prisma.user.create({
    data: {
      email: 'admin@castellon.local',
      name: 'Admin',
      surname: 'Castellón',
      userTypeId: adminClubRoleId,
      password: hashedPassword,
      clubId: clubCastellon.id,
      clubStatus: 'Aprobado',
      authProvider: 'LOCAL',
      active: true,
    },
  });

  // 5. USUARIOS DEL SISTEMA (EXENTO Y TBD)
  await prisma.user.upsert({
    where: { id: BYE_USER_ID },
    update: {},
    create: {
      id: BYE_USER_ID,
      email: 'exento@torneo.local',
      name: 'EXENTO',
      surname: '(Pasa de ronda)',
      userTypeId: playerRoleId,
      active: true,
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
      active: true,
    },
  });

  // 6. JUGADORES REALISTAS CON ELO Y SKILLS DINÁMICOS
  console.log('👥 Generando 32 Jugadores Variados (ELO 0 - 2000)...');
  const allPlayers = [];

  const nombres = [
    'Alejandro',
    'Lucía',
    'Mateo',
    'Sofía',
    'Hugo',
    'Martina',
    'Martín',
    'María',
    'Lucas',
    'Julia',
    'Leo',
    'Paula',
    'Daniel',
    'Valeria',
    'Pablo',
    'Emma',
    'Álvaro',
    'Daniela',
    'Adrián',
    'Carla',
    'Joaquín',
    'Alba',
    'Diego',
    'Noa',
    'Carlos',
    'Carmen',
    'Javier',
    'Elena',
    'Marcos',
    'Sara',
  ];

  const apellidos = [
    'García',
    'Rodríguez',
    'González',
    'Fernández',
    'López',
    'Martínez',
    'Sánchez',
    'Pérez',
    'Gómez',
    'Martín',
    'Ruiz',
    'Hernández',
    'Jiménez',
    'Díaz',
    'Álvarez',
    'Moreno',
    'Muñoz',
    'Alonso',
    'Romero',
    'Navarro',
    'Gutiérrez',
    'Torres',
    'Domínguez',
    'Gil',
    'Vázquez',
    'Serrano',
    'Ramos',
    'Blanco',
    'Castro',
    'Suárez',
  ];

  const createPlayer = async (email: string, name: string, surname: string, elo: number) => {
    // Calculamos el nivel oficial basándonos en el ELO aleatorio
    let playerLevel = 'Iniciacion';
    if (elo >= 300) playerLevel = 'Principiante';
    if (elo >= 500) playerLevel = 'Intermedio';
    if (elo >= 750) playerLevel = 'Avanzado';
    if (elo >= 1200) playerLevel = 'Profesional';

    // Estimamos sus skills de forma realista según su ELO (Ej: 2000 elo = 100 skill)
    const baseSkill = Math.min(100, Math.max(5, Math.floor(elo / 20)));

    return await prisma.user.create({
      data: {
        email,
        name,
        surname,
        userTypeId: playerRoleId,
        clubId: clubCastellon.id,
        clubStatus: 'Aprobado',
        level: playerLevel as any,
        password: hashedPassword,
        authProvider: 'LOCAL',
        active: true,
        stats: {
          create: {
            seasonId: currentSeason.id,
            elo,
            matchWon: 0,
            matchLost: 0,
            setWon: 0,
            setLost: 0,
            pointWon: 0,
            pointLost: 0,
            tournamentWon: 0,
            tournamentPart: 0,
          },
        },
        skills: {
          create: {
            seasonId: currentSeason.id,
            derechaPlano: baseSkill,
            revesPlano: baseSkill,
            topspinDerecha: baseSkill,
            topspinReves: baseSkill,
            corte: baseSkill,
            bloqueoDerecha: baseSkill,
            bloqueoReves: baseSkill,
            servicio: baseSkill,
            recepcion: baseSkill,
            movilidad: baseSkill,
            fortalezaMental: baseSkill,
            experiencia: baseSkill,
          },
        },
      },
      include: { stats: true },
    });
  };

  // Creación de las cuentas de prueba con ELOs altos
  allPlayers.push(await createPlayer('keinwaiplayer@hotmail.com', 'Kein-Wai', 'Cheung', 1600));
  allPlayers.push(await createPlayer('jlevin@hotmail.com', 'Julian', 'Levin', 1500));

  // Creación de los 30 jugadores aleatorios
  for (let i = 1; i <= 30; i++) {
    const nombre = nombres[Math.floor(Math.random() * nombres.length)];
    const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];
    const randomElo = Math.floor(Math.random() * 2001); // 👈 ELO aleatorio de 0 a 2000

    allPlayers.push(await createPlayer(`jugador${i}@pingpong.local`, nombre, apellido, randomElo));
  }

  // Ordenamos de mayor a menor ELO para las siembras en torneos
  allPlayers.sort((a, b) => (b.stats[0]?.elo || 0) - (a.stats[0]?.elo || 0));

  // ============================================================================
  // 🔥 HORARIOS Y ENTRENAMIENTOS GRUPALES (Agosto - Septiembre)
  // ============================================================================
  console.log(
    '\n📅 Generando 4 Horarios de Entrenamientos y Pasando Lista Aleatoria (Agosto-Sept)...',
  );

  const schedules = [
    await prisma.generalTrainingSchedule.create({
      data: {
        clubId: clubCastellon.id,
        name: 'L-X-V Tarde',
        startTime: '17:30',
        endTime: '19:00',
        daysOfWeek: [1, 3, 5],
      },
    }),
    await prisma.generalTrainingSchedule.create({
      data: {
        clubId: clubCastellon.id,
        name: 'M-V Mañana',
        startTime: '10:30',
        endTime: '12:30',
        daysOfWeek: [2, 5],
      },
    }),
    await prisma.generalTrainingSchedule.create({
      data: {
        clubId: clubCastellon.id,
        name: 'M-J Noche',
        startTime: '19:00',
        endTime: '21:00',
        daysOfWeek: [2, 4],
      },
    }),
    await prisma.generalTrainingSchedule.create({
      data: {
        clubId: clubCastellon.id,
        name: 'L-X Noche',
        startTime: '19:00',
        endTime: '21:00',
        daysOfWeek: [1, 3],
      },
    }),
  ];

  const template = await prisma.skillUpdateTemplate.create({
    data: {
      name: 'Base General',
      sourceType: 'EntrenamientoGeneral',
      derechaPlano: true,
      topspinDerecha: true,
      servicio: true,
      movilidad: true,
    },
  });

  const allSkills = await prisma.playerSkills.findMany({
    where: { userId: { in: allPlayers.map((p) => p.id) } },
  });

  // Iterar desde 1 de Agosto hasta 30 de Septiembre de 2026
  const startDate = new Date(Date.UTC(2026, 7, 1)); // 1 Agosto 2026
  const endDate = new Date(Date.UTC(2026, 8, 30)); // 30 Septiembre 2026

  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const currentDayOfWeek = d.getUTCDay(); // 0 = Dom, 1 = Lun...

    for (const schedule of schedules) {
      if (schedule.daysOfWeek.includes(currentDayOfWeek)) {
        // Toca entrenamiento!
        const training = await prisma.generalTraining.create({
          data: {
            clubId: clubCastellon.id,
            seasonId: currentSeason.id,
            description: `Sesión de ${schedule.name}`,
            date: d,
            scheduleId: schedule.id,
            templateId: template.id,
          },
        });

        const attendanceData = [];
        const updatesData = [];

        // Asisten los jugadores de forma aleatoria (~65% de asistencia media)
        for (const player of allPlayers) {
          const attendsThisSession = Math.random() < 0.65;

          if (attendsThisSession) {
            attendanceData.push({
              generalTrainingId: training.id,
              clubId: clubCastellon.id,
              playerId: player.id,
              attended: true,
            });
            const pSkill = allSkills.find((s) => s.userId === player.id);
            updatesData.push({
              playerId: player.id,
              sourceType: 'EntrenamientoGeneral' as any,
              generalTrainingId: training.id,
              status: 'EXPECTED' as any,
              derechaPlano: getGrowth(pSkill?.derechaPlano),
              topspinDerecha: getGrowth(pSkill?.topspinDerecha),
              servicio: getGrowth(pSkill?.servicio),
              movilidad: getGrowth(pSkill?.movilidad),
            });
          }
        }

        if (attendanceData.length > 0) {
          await prisma.generalTrainingAttendance.createMany({ data: attendanceData });
          await prisma.playerSkillUpdate.createMany({ data: updatesData });
        }
      }
    }
  }

  // ============================================================================
  // 🔥 TORNEOS (Simuladores y Generadores)
  // ============================================================================

  const registerParticipants = async (tournamentId: string, players: any[]) => {
    await prisma.tournamentParticipant.createMany({
      data: players.map((p) => ({ tournamentId, playerId: p.id, status: 'Confirmado' })),
    });

    await prisma.stats.updateMany({
      where: { userId: { in: players.map((p) => p.id) }, seasonId: currentSeason.id },
      data: { tournamentPart: { increment: 1 } },
    });
  };

  async function simulateExistingMatch(
    matchId: string,
    p1Id: string,
    p2Id: string,
    clas1Id: string,
    clas2Id: string,
  ) {
    let p1SetsWon = 0,
      p2SetsWon = 0,
      ptsP1 = 0,
      ptsP2 = 0;
    const setScores: { s1: number; s2: number }[] = [];

    while (p1SetsWon < 2 && p2SetsWon < 2) {
      const p1WinsThisSet = Math.random() > 0.5;
      const loserScore = Math.floor(Math.random() * 9);
      const s1 = p1WinsThisSet ? 11 : loserScore;
      const s2 = p1WinsThisSet ? loserScore : 11;
      setScores.push({ s1, s2 });
      ptsP1 += s1;
      ptsP2 += s2;
      if (p1WinsThisSet) p1SetsWon++;
      else p2SetsWon++;
    }

    const p1WinsMatch = p1SetsWon === 2;
    const eloExchanged = 15;

    await prisma.match.update({
      where: { id: matchId },
      data: {
        setOnePlayerOne: setScores[0]?.s1 ?? 0,
        setOnePlayerTwo: setScores[0]?.s2 ?? 0,
        setTwoPlayerOne: setScores[1]?.s1 ?? 0,
        setTwoPlayerTwo: setScores[1]?.s2 ?? 0,
        setThreePlayerOne: setScores[2]?.s1 ?? 0,
        setThreePlayerTwo: setScores[2]?.s2 ?? 0,
        status: 'Completado',
      },
    });

    await addMatchSkillUpdates(matchId, p1Id, p2Id);

    await prisma.stats.updateMany({
      where: { userId: p1Id, seasonId: currentSeason.id },
      data: {
        elo: { increment: p1WinsMatch ? -eloExchanged : eloExchanged },
        matchWon: { increment: p1WinsMatch ? 1 : 0 },
        matchLost: { increment: p1WinsMatch ? 0 : 1 },
        setWon: { increment: p1SetsWon },
        setLost: { increment: p2SetsWon },
        pointWon: { increment: ptsP1 },
        pointLost: { increment: ptsP2 },
      },
    });

    await prisma.stats.updateMany({
      where: { userId: p2Id, seasonId: currentSeason.id },
      data: {
        elo: { increment: p1WinsMatch ? -eloExchanged : eloExchanged },
        matchWon: { increment: p1WinsMatch ? 0 : 1 },
        matchLost: { increment: p1WinsMatch ? 1 : 0 },
        setWon: { increment: p2SetsWon },
        setLost: { increment: p1SetsWon },
        pointWon: { increment: ptsP2 },
        pointLost: { increment: ptsP1 },
      },
    });

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
        pointsClas: { increment: p1WinsMatch ? 2 : 1 },
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
        pointsClas: { increment: p1WinsMatch ? 1 : 2 },
      },
    });
  }

  const MATCH_MATRIX_6 = [
    [1, 6],
    [2, 5],
    [3, 4],
    [1, 5],
    [6, 4],
    [2, 3],
    [1, 4],
    [5, 3],
    [6, 2],
    [1, 3],
    [4, 2],
    [5, 6],
    [1, 2],
    [3, 6],
    [4, 5],
  ];

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  console.log('\n🏆 1. Generando Gran Máster Final (Todas las Posiciones / 24 Jugadores)...');
  const t1 = await prisma.tournament.create({
    data: {
      name: 'Gran Máster Final (Todas las Posiciones)',
      dateStart: new Date(new Date().setDate(new Date().getDate() - 2)),
      clubId: clubCastellon.id,
      seasonId: currentSeason.id,
      numPlayers: 24,
      numGroup: 4,
      numGroupPlayers: 6,
      typeTournament: 'Interno',
      levelTournament: 'Federado',
      rounds: 'GruposKnockout',
      status: 'Grupos',
      typeKnockout: 'LlaveAB',
      playersKnockout: 3,
      sortGroups: 'Snake',
      sortKnockout: 'Siembra',
      allPos: true,
      groupsCreated: true,
      knockoutCreated: false,
      setsToWinGroup: 2,
      setsToWinKnockout: 3,
    },
  });

  const t1Players = allPlayers.slice(0, 24);
  await registerParticipants(t1.id, t1Players);

  const t1Groups = [];
  for (let i = 1; i <= 4; i++) {
    t1Groups.push(
      await prisma.tournamentGroup.create({
        data: { tournamentId: t1.id, group: i, status: 'Programado' },
      }),
    );
  }

  const snakeGroupsT1: any[][] = Array.from({ length: 4 }, () => []);
  for (let i = 0; i < t1Players.length; i++) {
    const cycle = Math.floor(i / 4);
    const index = cycle % 2 === 0 ? i % 4 : 3 - (i % 4);
    snakeGroupsT1[index].push(t1Players[i]);
  }

  const allT1Matches = [];
  for (let g = 0; g < 4; g++) {
    const groupDb = t1Groups[g];
    const groupPlayers = snakeGroupsT1[g];
    const clasRecords = [];

    for (const p of groupPlayers) {
      const c = await prisma.tournamentGroupClas.create({
        data: { tournamentGroupId: groupDb.id, playerId: p.id, position: 0 },
      });
      clasRecords.push({ playerId: p.id, clasId: c.id });
    }

    for (const [p1Index, p2Index] of MATCH_MATRIX_6) {
      const p1 = groupPlayers[p1Index - 1];
      const p2 = groupPlayers[p2Index - 1];
      const clas1 = clasRecords[p1Index - 1];
      const clas2 = clasRecords[p2Index - 1];
      const m = await prisma.match.create({
        data: {
          seasonId: currentSeason.id,
          tournamentId: t1.id,
          groupId: groupDb.id,
          playerOneId: p1.id,
          playerTwoId: p2.id,
          status: 'Programado',
          dateStart: new Date(),
        },
      });
      allT1Matches.push({
        matchId: m.id,
        p1Id: p1.id,
        p2Id: p2.id,
        clas1Id: clas1.clasId,
        clas2Id: clas2.clasId,
      });
    }
  }

  console.log(`Fase 1: Simulando los 60 partidos de grupos...`);
  for (const m of allT1Matches) {
    await simulateExistingMatch(m.matchId, m.p1Id, m.p2Id, m.clas1Id, m.clas2Id);
  }

  for (const g of t1Groups) {
    const clas = await prisma.tournamentGroupClas.findMany({ where: { tournamentGroupId: g.id } });
    clas.sort((a, b) => {
      if (b.pointsClas !== a.pointsClas) return (b.pointsClas || 0) - (a.pointsClas || 0);
      const diffA = (a.setsWon || 0) - (a.setsLost || 0);
      const diffB = (b.setsWon || 0) - (b.setsLost || 0);
      if (diffA !== diffB) return diffB - diffA;
      return (b.pointsWon || 0) - (b.pointsLost || 0) - ((a.pointsWon || 0) - (a.pointsLost || 0));
    });
    for (let pos = 0; pos < clas.length; pos++) {
      await prisma.tournamentGroupClas.update({
        where: { id: clas[pos].id },
        data: { position: pos + 1 },
      });
    }
  }

  console.log(`Fase 2: Generando árboles de Eliminatorias A y B (Todas las posiciones)...`);
  const harvest = await harvestKnockoutPlayers(prisma, t1.id);
  if (harvest.bracketA.length > 0) {
    const matchesA = createKnockoutDraw(harvest.bracketA, 'Siembra', true);
    await saveKnockoutBracket(prisma, t1.id, 'A', matchesA, new Date(), true);
  }
  if (harvest.bracketB.length > 0) {
    const matchesB = createKnockoutDraw(harvest.bracketB, 'Siembra', true);
    await saveKnockoutBracket(prisma, t1.id, 'B', matchesB, new Date(), true);
  }
  await prisma.tournament.update({ where: { id: t1.id }, data: { knockoutCreated: true } });

  async function playKnockoutMatch(matchId: string, p1Id: string, p2Id: string) {
    const isP1Bye = p1Id === BYE_USER_ID;
    const isP2Bye = p2Id === BYE_USER_ID;
    let p1SetsWon = 0,
      p2SetsWon = 0,
      ptsP1 = 0,
      ptsP2 = 0;
    const setScores: { s1: number; s2: number }[] = [];

    if (isP1Bye || isP2Bye) {
      const p1WinsMatch = !isP1Bye || (isP1Bye && isP2Bye);
      for (let i = 0; i < 3; i++)
        setScores.push({ s1: p1WinsMatch ? 11 : 0, s2: p1WinsMatch ? 0 : 11 });
      p1SetsWon = p1WinsMatch ? 3 : 0;
      p2SetsWon = p1WinsMatch ? 0 : 3;
    } else {
      while (p1SetsWon < 3 && p2SetsWon < 3) {
        const p1WinsThisSet = Math.random() > 0.5;
        const loserScore = Math.floor(Math.random() * 9);
        const s1 = p1WinsThisSet ? 11 : loserScore;
        const s2 = p1WinsThisSet ? loserScore : 11;
        setScores.push({ s1, s2 });
        ptsP1 += s1;
        ptsP2 += s2;
        if (p1WinsThisSet) p1SetsWon++;
        else p2SetsWon++;
      }
    }

    const p1WinsMatch = p1SetsWon === 3;
    const eloExchanged = 20;

    await prisma.match.update({
      where: { id: matchId },
      data: {
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

    await addMatchSkillUpdates(matchId, p1Id, p2Id);

    if (!isP1Bye && !isP2Bye) {
      await prisma.stats.updateMany({
        where: { userId: p1Id, seasonId: currentSeason.id },
        data: { elo: { increment: p1WinsMatch ? eloExchanged : -eloExchanged } },
      });
      await prisma.stats.updateMany({
        where: { userId: p2Id, seasonId: currentSeason.id },
        data: { elo: { increment: p1WinsMatch ? -eloExchanged : eloExchanged } },
      });
    }
    await processKnockoutAdvancement(prisma, matchId);
  }

  console.log(`Fase 3: Jugando TODOS los partidos de eliminatorias en cascada...`);
  let playableKnockouts = await prisma.match.findMany({
    where: {
      tournamentId: t1.id,
      groupId: null,
      status: 'Programado',
      playerOneId: { not: TBD_USER_ID },
      playerTwoId: { not: TBD_USER_ID },
    },
  });

  while (playableKnockouts.length > 0) {
    for (const m of playableKnockouts) {
      await playKnockoutMatch(m.id, m.playerOneId, m.playerTwoId);
    }
    playableKnockouts = await prisma.match.findMany({
      where: {
        tournamentId: t1.id,
        groupId: null,
        status: 'Programado',
        playerOneId: { not: TBD_USER_ID },
        playerTwoId: { not: TBD_USER_ID },
      },
    });
  }
  console.log(`¡Torneo 1 completado al 100%! Se han repartido todas las posiciones.`);

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  console.log('\n🧭 2. Generando Torneo Brújula (Compass Draw 16 | Programado)...');
  const t2 = await prisma.tournament.create({
    data: {
      name: 'Torneo Brújula (Compass Draw 16)',
      dateStart: new Date(new Date().setDate(new Date().getDate() + 10)),
      clubId: clubCastellon.id,
      seasonId: currentSeason.id,
      numPlayers: 16,
      typeTournament: 'Interno',
      levelTournament: 'Avanzado',
      rounds: 'Knockout',
      status: 'Programado',
      typeKnockout: 'LlaveA',
      sortKnockout: 'Siembra',
      allPos: true,
      groupsCreated: false,
      knockoutCreated: false,
      setsToWinKnockout: 3,
    },
  });

  const t2Players = allPlayers.slice(0, 16);
  await registerParticipants(t2.id, t2Players);

  const t2Participants = t2Players.map((p, index) => ({ playerId: p.id, position: index + 1 }));
  const matchesT2 = createKnockoutDraw(t2Participants, 'Siembra', true);
  await saveKnockoutBracket(prisma, t2.id, 'A', matchesT2, new Date(), true);

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  console.log('\n👑 3. Generando Liga Master Todos vs Todos (8 Jugadores)...');
  const t3 = await prisma.tournament.create({
    data: {
      name: 'Liga Master Todos vs Todos',
      dateStart: new Date(new Date().setDate(new Date().getDate() + 14)),
      clubId: clubCastellon.id,
      seasonId: currentSeason.id,
      numPlayers: 8,
      numGroup: 1,
      numGroupPlayers: 8,
      typeTournament: 'Interno',
      levelTournament: 'Avanzado',
      rounds: 'TodosvsTodos',
      status: 'Grupos',
      typeKnockout: 'LlaveA',
      playersKnockout: 0,
      sortGroups: 'Snake',
      sortKnockout: 'Siembra',
      allPos: false,
      groupsCreated: true,
      knockoutCreated: false,
      setsToWinGroup: 2,
      setsToWinKnockout: 3,
    },
  });

  const t3Players = allPlayers.slice(0, 8);
  await registerParticipants(t3.id, t3Players);

  const t3Group = await prisma.tournamentGroup.create({
    data: { tournamentId: t3.id, group: 1, status: 'Programado' },
  });
  const clasRecordsT3 = [];
  for (const p of t3Players) {
    const c = await prisma.tournamentGroupClas.create({
      data: { tournamentGroupId: t3Group.id, playerId: p.id, position: 0 },
    });
    clasRecordsT3.push({ playerId: p.id, clasId: c.id });
  }

  const MATCH_MATRIX_8 = [
    [1, 8],
    [2, 7],
    [3, 6],
    [4, 5],
    [1, 7],
    [8, 6],
    [2, 5],
    [3, 4],
    [1, 6],
    [7, 5],
    [8, 4],
    [2, 3],
    [1, 5],
    [6, 4],
    [7, 3],
    [8, 2],
    [1, 4],
    [5, 3],
    [6, 2],
    [7, 8],
    [1, 3],
    [4, 2],
    [5, 8],
    [6, 7],
    [1, 2],
    [3, 8],
    [4, 7],
    [5, 6],
  ];

  const allT3Matches = [];
  for (const [p1Index, p2Index] of MATCH_MATRIX_8) {
    const p1 = t3Players[p1Index - 1];
    const p2 = t3Players[p2Index - 1];
    const clas1 = clasRecordsT3[p1Index - 1];
    const clas2 = clasRecordsT3[p2Index - 1];
    const m = await prisma.match.create({
      data: {
        seasonId: currentSeason.id,
        tournamentId: t3.id,
        groupId: t3Group.id,
        playerOneId: p1.id,
        playerTwoId: p2.id,
        status: 'Programado',
        dateStart: new Date(),
      },
    });
    allT3Matches.push({
      matchId: m.id,
      p1Id: p1.id,
      p2Id: p2.id,
      clas1Id: clas1.clasId,
      clas2Id: clas2.clasId,
    });
  }

  console.log(`Simulando 27 de los 28 partidos de la Liga Todos vs Todos...`);
  for (let i = 0; i < allT3Matches.length - 1; i++) {
    const m = allT3Matches[i];
    await simulateExistingMatch(m.matchId, m.p1Id, m.p2Id, m.clas1Id, m.clas2Id);
  }

  const clasT3 = await prisma.tournamentGroupClas.findMany({
    where: { tournamentGroupId: t3Group.id },
  });
  clasT3.sort((a, b) => {
    if (b.pointsClas !== a.pointsClas) return (b.pointsClas || 0) - (a.pointsClas || 0);
    const diffA = (a.setsWon || 0) - (a.setsLost || 0);
    const diffB = (b.setsWon || 0) - (b.setsLost || 0);
    if (diffA !== diffB) return diffB - diffA;
    return (b.pointsWon || 0) - (b.pointsLost || 0) - ((a.pointsWon || 0) - (a.pointsLost || 0));
  });

  for (let pos = 0; pos < clasT3.length; pos++) {
    await prisma.tournamentGroupClas.update({
      where: { id: clasT3[pos].id },
      data: { position: pos + 1 },
    });
  }

  console.log('\n✅ Base de datos "sembrada" con éxito. ¡Todo listo para probar los use cases!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
