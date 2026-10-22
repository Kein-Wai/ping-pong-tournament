import { Router } from 'express';
import queryRoutes from './queries';
import commandRoutes from './commands';
import registrationRoutes from './registration';
import bracketRoutes from './bracket';

const router = Router();

// El orden de montaje importa: las rutas literales (/generate-excel) deben
// resolverse antes que las parametricas (/:id).
router.use(bracketRoutes);
router.use(registrationRoutes);
router.use(commandRoutes);
router.use(queryRoutes);

export default router;
