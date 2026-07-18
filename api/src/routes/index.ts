import { Router } from 'express';
import userTypeRoutes from './user-type';
import userRoutes from './user';
import authRoutes from './auth';
import matchRoutes from './match';
import tournamentRoutes from './tournament';
import clubRoutes from './club';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.use('/auth', authRoutes);
router.use('/clubs', clubRoutes);
router.use('/user-types', verifyToken, userTypeRoutes);
router.use('/users', verifyToken, userRoutes);
router.use('/matches', verifyToken, matchRoutes);
router.use('/tournaments', verifyToken, tournamentRoutes);
export default router;
