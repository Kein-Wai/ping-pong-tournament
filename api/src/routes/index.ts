import { Router } from 'express';
import userTypeRoutes from './user-type';
import userRoutes from './user';

const router = Router();

// Aquí centralizas y mapeas cada módulo a su path correspondiente
router.use('/user-types', userTypeRoutes);
router.use('/users', userRoutes);
// En el futuro, cuando crees más rutas, solo tendrás que añadirlas aquí abajo:
// router.use('/users', userRoutes);
// router.use('/tournaments', tournamentRoutes);

export default router;
