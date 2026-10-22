import { Router } from 'express';
import planRoutes from './plans';
import sessionRoutes from './sessions';
import exerciseRoutes from './exercises';
import playerRoutes from './player';

const router = Router();

// El orden de montaje importa: las rutas literales (/sessions, /player) deben
// resolverse antes que las parametricas (/:planId).
router.use(sessionRoutes);
router.use(exerciseRoutes);
router.use(playerRoutes);
router.use(planRoutes);

export default router;
