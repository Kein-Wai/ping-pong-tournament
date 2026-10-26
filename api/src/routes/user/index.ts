import { Router } from 'express';
import queryRoutes from './queries';
import profileRoutes from './profile';
import commandRoutes from './commands';
import guestRoutes from './guest';

const router = Router();

// El orden de montaje importa: las rutas literales (/me, /guest) deben
// resolverse antes que las parametricas (/:id).
router.use(profileRoutes);
router.use(guestRoutes);
router.use(queryRoutes);
router.use(commandRoutes);

export default router;
