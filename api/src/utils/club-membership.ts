import type { Club, Prisma, PrismaClient, PlayerLevel } from '@prisma/client';
import { ApiError } from '../http/response';
import { resolveCurrentSeason } from './season';

/**
 * Altas y bajas de miembros de un club. Cada operación cambia varias filas a la
 * vez (club y administrador, usuario y estadísticas iniciales...), así que vive
 * aquí y no repartida por los handlers: o se aplica entera o no se aplica.
 */

const ALREADY_IN_CLUB =
  'Ya perteneces o has solicitado unirte a un club. Debes salir primero.';

/**
 * Crea un club Pendiente de aprobación y deja a su creador como miembro Aprobado.
 * La asignación está condicionada a que el usuario no tenga club: si lo tiene, el
 * error hace rollback de la creación y no queda un club huérfano.
 */
export const createClub = (
  prisma: PrismaClient,
  userId: string,
  data: { name: string; city: string },
): Promise<Club> =>
  prisma.$transaction(async (tx) => {
    const club = await tx.club.create({ data: { ...data, status: 'Pendiente' } });

    const assigned = await tx.user.updateMany({
      where: { id: userId, clubId: null },
      data: { clubId: club.id, clubStatus: 'Aprobado' }, // Él es el admin, entra automáticamente
    });
    if (assigned.count === 0) throw new ApiError(400, ALREADY_IN_CLUB);

    return club;
  });

/**
 * Un jugador pide entrar en un club Aprobado. Es una sola escritura condicionada
 * a no tener club, de modo que dos solicitudes simultáneas no pueden pisarse.
 */
export const requestMembership = async (
  prisma: PrismaClient,
  userId: string,
  clubId: string,
): Promise<void> => {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club || club.status !== 'Aprobado') {
    throw new ApiError(404, 'Club no encontrado o no está disponible para unirse');
  }

  const requested = await prisma.user.updateMany({
    where: { id: userId, clubId: null },
    data: { clubId, clubStatus: 'Pendiente' },
  });
  if (requested.count === 0) throw new ApiError(400, ALREADY_IN_CLUB);
};

export interface MembershipDecision {
  status: 'Aprobado' | 'Rechazado';
  level?: PlayerLevel;
  elo?: number;
  skills?: Omit<Prisma.PlayerSkillsUncheckedCreateInput, 'userId' | 'seasonId'>;
}

/**
 * Resuelve la solicitud de un miembro. Rechazar lo devuelve a jugador libre y lo
 * saca de los equipos; aprobar fija su nivel y, si el admin lo indica, su ELO y
 * habilidades iniciales de la temporada vigente. Todo en una transacción.
 */
export const resolveMembership = async (
  prisma: PrismaClient,
  userId: string,
  decision: MembershipDecision,
): Promise<void> => {
  const { status, level, elo, skills } = decision;
  const season = await resolveCurrentSeason(prisma);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data:
        status === 'Rechazado'
          ? { clubId: null, clubStatus: 'Registrado', teams: { set: [] } }
          : { clubStatus: status, level },
    });

    if (status !== 'Aprobado' || !skills) return;

    const seasonKey = { userId_seasonId: { userId, seasonId: season.id } };

    if (elo !== undefined) {
      await tx.stats.upsert({
        where: seasonKey,
        update: { elo },
        create: { userId, seasonId: season.id, elo },
      });
    }

    await tx.playerSkills.upsert({
      where: seasonKey,
      update: skills,
      create: { userId, seasonId: season.id, ...skills },
    });
  });
};
