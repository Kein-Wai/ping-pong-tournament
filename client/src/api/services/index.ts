/**
 * Barrel de los servicios de la API.
 *
 * Cada dominio tiene su modulo con una funcion por operacion. Las paginas
 * importan del modulo concreto (o de aqui) en lugar de llamar a axios, lo que
 * deja el acceso a datos en un unico sitio. La regla de lint
 * `no-restricted-imports` (eslint.config.js) impide importar `api/axios`; solo
 * las 5 pantallas gigantes siguen avisando hasta que la Fase 4 las migre.
 */
export { authService } from './auth';
export { usersService } from './users';
export { tournamentsService } from './tournaments';
export { leaguesService } from './leagues';
export { clubsService } from './clubs';
export { matchesService } from './matches';
export { trainingsService, exercisesService } from './trainings';
export { seasonsService } from './seasons';
export { teamsService } from './teams';
export { eventsService } from './events';
export { feedbackService } from './feedback';
export { skillsService } from './skills';
export { generalTrainingsService } from './generalTrainings';
export { manualMatchesService } from './manualMatches';
